import sys
import os
import asyncio
import logging
import traceback # For detailed error logging
from typing import Any, Dict, Optional, cast

# Import JSON-RPC components (assuming stdio loop is handled in main.py)
# from jsonrpc.manager import JSONRPCResponseManager # Might not be needed directly here

# Import existing types and potentially new ones for reasoning
# Use absolute import assuming 'src' is the root due to main.py path manipulation
from protocol_types import ExecuteTaskParams, ExecuteTaskResult, EditorContext

# Import newly added reasoning components
# Use absolute import assuming 'src' is the root
from utils.config_loader import ConfigLoader
from utils.prompt_manager import PromptManager
from core.checklist_generator import ChecklistGenerator
from google import genai # Need genai for the LLM call in select_persona
from council.council_critique import CouncilCritiqueModule
from knowledge_manager import KnowledgeManager # Added KnowledgeManager import
from exceptions import ChecklistGeneratorError, LLMError, ConfigError, PromptError, QAValidationError, CouncilCritiqueError # Import relevant exceptions
import json # Needed for parsing recovery response

# Configure basic logging (might be redundant if configured in main.py, but safe)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Define path to personas directory relative to this file's location
PERSONAS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'personas'))

# --- Global State / Initialization ---
# Store initialized components globally for access by handlers.
# In a more complex app, consider dependency injection or a context object.
REASONING_COMPONENTS: Dict[str, Any] = {
    "config_loader": None,
    "prompt_manager": None,
    "checklist_generator": None,
    "council_module": None,
    "knowledge_manager": None, # Added knowledge_manager entry
    "initialized": False
}

def initialize_reasoning_components():
    """Initialize reasoning components using config."""
    global REASONING_COMPONENTS
    if REASONING_COMPONENTS["initialized"]:
        logger.info("Reasoning components already initialized.")
        return

    logger.info("Initializing reasoning components...")
    try:
        # Assumes config.yaml and .env are in the python_backend root directory
        config_loader = ConfigLoader() # Loads config.yaml and .env
        REASONING_COMPONENTS["config_loader"] = config_loader

        # Configure Gemini globally (required by components)
        api_key = config_loader.get_api_key()
        if not api_key:
             raise ConfigError("GEMINI_API_KEY not found in environment or config.")
        from google import genai
        genai.configure(api_key=api_key)
        logger.info("Gemini API configured.")

        prompt_manager = PromptManager() # Assumes prompts dir in python_backend root
        REASONING_COMPONENTS["prompt_manager"] = prompt_manager

        # Initialize Checklist Generator (ReasoningTree is internal to it)
        # Pass relevant config sections
        llm_config = config_loader.get_llm_config()
        decomposition_config = config_loader.get_decomposition_config()
        reasoning_tree_config = config_loader.get_reasoning_tree_config() # Needed for ChecklistGenerator init
        generator_config = {**llm_config, **decomposition_config, **reasoning_tree_config} # Merge configs

        # CheckpointManager is disabled by default in copied code, pass None or init if needed
        checklist_generator = ChecklistGenerator(
            config=generator_config,
            prompt_manager=prompt_manager,
            checkpoint_manager=None, # Checkpointing disabled for now
            # ReasoningTree is initialized internally by ChecklistGenerator if enabled in config
            logger=logging.getLogger("ChecklistGenerator")
        )
        REASONING_COMPONENTS["checklist_generator"] = checklist_generator

        # Initialize Council Module
        council_config = config_loader.get_council_config()
        # Ensure council config also gets LLM settings if needed (e.g., model name)
        merged_council_config = {**council_config, **llm_config}
        council_module = CouncilCritiqueModule(
            config=merged_council_config,
            prompt_manager=prompt_manager,
            logger=logging.getLogger("CouncilCritiqueModule")
        )
        REASONING_COMPONENTS["council_module"] = council_module

        # Initialize Knowledge Manager with error handling
        try:
            # It needs the config and potentially the workspace root
            # Get workspace root from initialize params if available, otherwise use cwd
            # Note: This assumes initialize is called before knowledge manager is needed.
            # If knowledge loading needs to happen earlier, adjust initialization trigger.
            # For now, pass config. Needs workspace_root later.
            knowledge_config = config_loader.config # Pass the whole config for now
            # Determine workspace root (this might need refinement based on when initialize is called)
            backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
            knowledge_manager = KnowledgeManager(config=knowledge_config, workspace_root=backend_root)
            REASONING_COMPONENTS["knowledge_manager"] = knowledge_manager
            logger.info("KnowledgeManager initialized (or attempted).") # Log success/attempt
            # TODO: Trigger initial knowledge loading if desired, e.g., asyncio.create_task(knowledge_manager.load_workspace_knowledge())
        except ValueError as e: # Catch the specific expected error (e.g., missing API key)
            logger.error(f"Failed to initialize KnowledgeManager: {e}. Knowledge features may be unavailable.", exc_info=False) # Log as error, don't show traceback
            REASONING_COMPONENTS["knowledge_manager"] = None # Ensure it's None if failed
        except Exception as e: # Catch any other unexpected errors during KM init
            logger.error(f"Unexpected error initializing KnowledgeManager: {e}", exc_info=True)
            REASONING_COMPONENTS["knowledge_manager"] = None # Ensure it's None if failed

        # Mark components as initialized even if KnowledgeManager failed,
        # as other components might still be functional.
        REASONING_COMPONENTS["initialized"] = True
        logger.info("Reasoning components initialization process completed.") # Changed log message slightly

    except (ConfigError, PromptError) as e:
         logger.critical(f"Configuration or Prompt Error during initialization: {e}", exc_info=True)
         # Prevent handlers from running if init fails
         REASONING_COMPONENTS["initialized"] = False
         # Optionally re-raise or handle gracefully depending on server lifecycle
    except Exception as e:
        logger.critical(f"Failed to initialize reasoning components: {e}", exc_info=True)
        REASONING_COMPONENTS["initialized"] = False
        # Optionally re-raise

# Call initialization eagerly when the module loads.
# Consider lazy initialization or initialization via a dedicated RPC call if preferred.
initialize_reasoning_components()

# --- Helper to format error responses ---
def create_error_response(code: str, message: str) -> Dict[str, Any]:
    """Creates a structured error dictionary for JSON-RPC."""
    # Note: The actual JSON-RPC error response structure might be handled
    # by the jsonrpc library in main.py, but this provides the details.
    return {"code": code, "message": message}

# --- Existing Handlers (Keep as is for now) ---

# --- Host (Client) -> Python Backend (Server) Handlers ---

# Note: Handlers should ideally be async if they perform I/O (like LLM calls)
# The JSON-RPC server library needs to support asyncio handlers.

def handle_initialize(params: Dict[str, Any]):
    """Handles the 'initialize' notification."""
    global REASONING_COMPONENTS
    logger.info(f"Received initialize notification with params: {params}")

    # Extract workspace root if provided
    workspace_root_uri = params.get("workspaceRoot") # Or rootUri depending on client
    workspace_root_path = None
    if workspace_root_uri and workspace_root_uri.startswith('file:///'):
        # Convert file URI to path (handle potential OS differences)
        import urllib.parse
        workspace_root_path = urllib.parse.unquote(workspace_root_uri[len('file:///'):])
        if sys.platform == "win32" and workspace_root_path.startswith('/'):
             workspace_root_path = workspace_root_path[1:] # Remove leading slash on Windows
        logger.info(f"Extracted workspace root path: {workspace_root_path}")

    # Trigger knowledge loading asynchronously if manager is ready and path is valid
    knowledge_manager = REASONING_COMPONENTS.get("knowledge_manager")
    if knowledge_manager and workspace_root_path and os.path.isdir(workspace_root_path):
        logger.info("Triggering asynchronous workspace knowledge loading...")
        # Update workspace root if necessary (might be better to pass during init if possible)
        knowledge_manager.workspace_root = workspace_root_path
        # Run the async loading function in the background
        asyncio.create_task(knowledge_manager.load_workspace_knowledge())
    elif knowledge_manager:
         logger.warning("Could not trigger knowledge loading: Workspace root not provided or invalid.")
    else:
         logger.warning("Could not trigger knowledge loading: KnowledgeManager not initialized.")

    # No response needed for notification

async def handle_execute_task(params: Dict[str, Any]) -> Dict[str, Any]:
    """Handles the 'executeTask' request."""
    # This remains largely a placeholder, as the core task execution
    # might now involve calls to the reasoning methods first.
    task_id = params.get("taskId", "unknown")
    logger.info(f"Received executeTask request for task {task_id}")
    # ... (rest of the placeholder logic) ...
    # Simulate success for now
    return {"status": "completed", "message": f"Task {task_id} processed successfully (simulated)"}

def handle_update_configuration(params: Dict[str, Any]):
    """Handles the 'updateConfiguration' notification."""
    # TODO: Re-initialize components or update their configs if necessary
    logger.info(f"Received updateConfiguration notification with params: {params}")
    # No response needed

def handle_tool_response(params: Dict[str, Any]):
    """Handles the 'toolResponse' notification."""
    tool_call_id = params.get("toolCallId", "unknown")
    logger.info(f"Received toolResponse for call {tool_call_id} with params: {params}")
    # ... (placeholder logic) ...
    # No response needed

def handle_shutdown(params: Optional[Dict[str, Any]] = None):
    """Handles the 'shutdown' notification."""
    logger.info("Received shutdown notification.")
    # ... (placeholder logic) ...
    # No response needed

# --- New Reasoning Handlers ---

async def handle_generate_plan(params: Dict[str, Any]) -> Dict[str, Any]:
    """Handles the 'reasoning/generatePlan' request."""
    global REASONING_COMPONENTS
    if not REASONING_COMPONENTS["initialized"]:
        logger.error("Reasoning components not initialized. Cannot generate plan.")
        # Return structured error
        return create_error_response("SERVICE_UNINITIALIZED", "Reasoning components are not ready.")

    logger.info("Handling reasoning/generatePlan request.")
    try:
        goal = params.get("goal")
        context = params.get("context")
        if not goal:
            raise ValueError("Missing 'goal' in reasoning/generatePlan params")

        generator = REASONING_COMPONENTS["checklist_generator"]
        if not generator:
             raise RuntimeError("ChecklistGenerator not initialized.")

        # Call the async method
        checklist_result = await generator.generate_checklist(goal=goal, context=context)

        logger.info("Plan generated successfully.")
        # Return success data (checklist itself)
        return checklist_result

    except (ValueError, KeyError) as e:
         logger.warning(f"Invalid params for reasoning/generatePlan: {e}")
         return create_error_response("INVALID_PARAMS", str(e))
    except (ChecklistGeneratorError, LLMError) as e:
         logger.error(f"Error during plan generation: {e}", exc_info=True)
         return create_error_response("PLAN_GENERATION_FAILED", str(e))
    except Exception as e:
        logger.exception(f"Unexpected error in handle_generate_plan: {e}")
        return create_error_response("INTERNAL_ERROR", f"An unexpected error occurred: {e}")


async def handle_refine_steps(params: Dict[str, Any]) -> Dict[str, Any]:
    """Handles the 'reasoning/refineSteps' request."""
    global REASONING_COMPONENTS
    if not REASONING_COMPONENTS["initialized"]:
        logger.error("Reasoning components not initialized. Cannot refine steps.")
        return create_error_response("SERVICE_UNINITIALIZED", "Reasoning components are not ready.")

    logger.info("Handling reasoning/refineSteps request.")
    try:
        steps = params.get("steps")
        context = params.get("context") # Contains goal, phase, task info
        if not steps or not context:
            raise ValueError("Missing 'steps' or 'context' in reasoning/refineSteps params")
        if not isinstance(steps, list):
             raise ValueError("'steps' parameter must be a list.")

        council = REASONING_COMPONENTS["council_module"]
        if not council:
             raise RuntimeError("CouncilCritiqueModule not initialized.")

        # Call the async method
        refined_steps_result = await council.review_and_refine(steps=steps, context=context)

        logger.info("Steps refined successfully.")
        # Return success data
        return {"refined_steps": refined_steps_result}

    except (ValueError, KeyError) as e:
         logger.warning(f"Invalid params for reasoning/refineSteps: {e}")
         return create_error_response("INVALID_PARAMS", str(e))
    except (CouncilCritiqueError, LLMError) as e:
         logger.error(f"Error during step refinement: {e}", exc_info=True)
         return create_error_response("STEP_REFINEMENT_FAILED", str(e))
    except Exception as e:
        logger.exception(f"Unexpected error in handle_refine_steps: {e}")
        return create_error_response("INTERNAL_ERROR", f"An unexpected error occurred: {e}")


# --- New Persona Content Retrieval Handler ---

async def handle_get_persona_content_by_name(params: Dict[str, Any]) -> Dict[str, Any]:
    """Handles the 'reasoning/getPersonaContentByName' request."""
    global PERSONAS_DIR
    logger.info("Handling reasoning/getPersonaContentByName request.")
    try:
        persona_name = params.get("name")
        if not persona_name:
            raise ValueError("Missing 'name' parameter in reasoning/getPersonaContentByName")

        # Construct the full path safely
        # Basic validation to prevent directory traversal
        if ".." in persona_name or "/" in persona_name or "\\" in persona_name:
             logger.warning(f"Invalid characters found in persona name: {persona_name}")
             raise ValueError("Invalid persona name format.")

        persona_file_path = os.path.join(PERSONAS_DIR, f"{persona_name}.md")
        logger.debug(f"Attempting to read persona file: {persona_file_path}")

        # Check if file exists and read it
        if os.path.isfile(persona_file_path):
            try:
                with open(persona_file_path, 'r', encoding='utf-8') as f:
                    persona_content = f.read()
                logger.info(f"Successfully read persona content for: {persona_name}")
                return {"content": persona_content}
            except Exception as e:
                 logger.error(f"Failed to read persona file {persona_file_path}: {e}", exc_info=True)
                 # Return specific error for file read issues
                 return create_error_response("FILE_READ_ERROR", f"Could not read content for persona '{persona_name}'.")
        else:
            logger.warning(f"Persona file not found: {persona_file_path}")
            # Return null content if file not found, as per requirement
            return {"content": None}

    except ValueError as e:
         logger.warning(f"Invalid params for reasoning/getPersonaContentByName: {e}")
         return create_error_response("INVALID_PARAMS", str(e))
    except Exception as e:
        logger.exception(f"Unexpected error in handle_get_persona_content_by_name: {e}")
        return create_error_response("INTERNAL_ERROR", f"An unexpected error occurred: {e}")


# --- New Replanning Handler ---

async def handle_replanning(params: Dict[str, Any]) -> Dict[str, Any]:
    """Handles the 'reasoning/replanning' request."""
    global REASONING_COMPONENTS
    if not REASONING_COMPONENTS["initialized"]:
        logger.error("Reasoning components not initialized. Cannot perform replanning.")
        return create_error_response("SERVICE_UNINITIALIZED", "Reasoning components are not ready.")

    logger.info("Handling reasoning/replanning request.")
    try:
        # Extract parameters
        task_goal = params.get("task_goal")
        current_plan_state = params.get("current_plan_state") # Could be dict or JSON string
        agent_state = params.get("agent_state") # Could be dict or JSON string
        obstacle_description = params.get("obstacle_description")

        if not all([task_goal, current_plan_state, agent_state, obstacle_description]):
            raise ValueError("Missing required parameters (task_goal, current_plan_state, agent_state, obstacle_description) in reasoning/replanning")

        prompt_manager = REASONING_COMPONENTS.get("prompt_manager")
        if not prompt_manager:
             raise RuntimeError("PromptManager not initialized.")

        # Format the prompt (assuming a 'replanning' prompt template exists)
        # TODO: Create a suitable 'replanning.txt' prompt template
        prompt = prompt_manager.format_prompt(
            "replanning", # Assumed template name
            task_goal=task_goal,
            current_plan_state=json.dumps(current_plan_state, indent=2) if isinstance(current_plan_state, (dict, list)) else str(current_plan_state),
            agent_state=json.dumps(agent_state, indent=2) if isinstance(agent_state, (dict, list)) else str(agent_state),
            obstacle_description=obstacle_description
        )

        # Call LLM for analysis and replanning suggestion
        # Consider using a more capable model if needed for complex replanning
        llm_response_text = await _call_llm_for_analysis(prompt) # Use existing helper

        # Parse the expected JSON response from the LLM
        try:
            replanning_result = json.loads(llm_response_text)
            # Basic validation (can be more robust using Pydantic models)
            if not isinstance(replanning_result, dict) or "analysis" not in replanning_result:
                 raise ValueError("LLM response for replanning is not valid JSON or missing 'analysis' key.")
            logger.info("Successfully parsed replanning result from LLM.")
            # Return the structured result
            return replanning_result
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response from LLM for replanning: {e}\nLLM Response:\n{llm_response_text}", exc_info=True)
            return create_error_response("INVALID_LLM_RESPONSE_FORMAT", f"LLM did not return valid JSON for replanning: {e}")
        except ValueError as e:
             logger.error(f"Invalid structure in LLM replanning result: {e}\nLLM Response:\n{llm_response_text}", exc_info=True)
             return create_error_response("INVALID_LLM_RESPONSE_STRUCTURE", str(e))

    except (ValueError, KeyError) as e:
         logger.warning(f"Invalid params for reasoning/replanning: {e}")
         return create_error_response("INVALID_PARAMS", str(e))
    except (PromptError, LLMError) as e:
         logger.error(f"Error during replanning: {e}", exc_info=True)
         return create_error_response("REPLANNING_FAILED", str(e))
    except Exception as e:
        logger.exception(f"Unexpected error in handle_replanning: {e}")
        return create_error_response("INTERNAL_ERROR", f"An unexpected error occurred: {e}")


# --- New Knowledge Search Handler ---

async def handle_knowledge_search(params: Dict[str, Any]) -> Dict[str, Any]:
    """Handles the 'knowledge/search' request."""
    global REASONING_COMPONENTS
    if not REASONING_COMPONENTS["initialized"]:
        logger.error("Reasoning components not initialized. Cannot search knowledge.")
        return create_error_response("SERVICE_UNINITIALIZED", "Reasoning components are not ready.")

    logger.info("Handling knowledge/search request.")
    try:
        query = params.get("query")
        num_docs = params.get("num_docs", 5) # Default to 5 docs
        if not query:
            raise ValueError("Missing 'query' in knowledge/search params")

        knowledge_manager = REASONING_COMPONENTS.get("knowledge_manager")
        if not knowledge_manager or not knowledge_manager.agent_knowledge:
             raise RuntimeError("KnowledgeManager not initialized or failed to initialize.")

        # Call the async search method
        search_results = await knowledge_manager.search_knowledge(query=query, num_docs=num_docs)

        logger.info(f"Knowledge search completed. Found {len(search_results)} results.")
        # Return success data
        return {"results": search_results}

    except (ValueError, KeyError) as e:
         logger.warning(f"Invalid params for knowledge/search: {e}")
         return create_error_response("INVALID_PARAMS", str(e))
    except RuntimeError as e: # Catch specific runtime errors from initialization check
         logger.error(f"Knowledge search failed: {e}", exc_info=True)
         return create_error_response("KNOWLEDGE_UNINITIALIZED", str(e))
    except Exception as e:
        logger.exception(f"Unexpected error in handle_knowledge_search: {e}")
        return create_error_response("INTERNAL_ERROR", f"An unexpected error occurred during knowledge search: {e}")


# --- New Persona Selection Handler ---

async def _call_llm_for_persona(prompt: str) -> str:
    """Helper function to call LLM specifically for persona selection."""
    # This assumes the LLM client (genai) is configured globally
    # and uses a potentially simpler/faster model if configured.
    # TODO: Consider using a dedicated model/config for this simple selection task.
    global REASONING_COMPONENTS
    config_loader = REASONING_COMPONENTS.get("config_loader")
    if not config_loader:
        raise RuntimeError("ConfigLoader not initialized.")

    llm_config = config_loader.get_llm_config() # Use main LLM config for now
    model_name = llm_config.get("model", "gemini-1.5-flash-latest") # Default to flash
    logger.debug(f"Using model {model_name} for persona selection.")

    try:
        model = genai.GenerativeModel(model_name)
        response = await model.generate_content_async(prompt)
        if not response.text:
             block_reason = response.prompt_feedback.block_reason if response.prompt_feedback else 'Unknown'
             logger.warning(f"LLM response for persona selection was empty/blocked: {block_reason}")
             raise LLMError(f"LLM response for persona selection was empty/blocked (Reason: {block_reason})")
        return response.text.strip()
    except Exception as e:
        logger.error(f"LLM call failed during persona selection: {e}", exc_info=True)
        raise LLMError(f"LLM call failed during persona selection: {e}")

async def _call_llm_for_analysis(prompt: str, model_name: Optional[str] = None) -> str:
    """Helper function to call LLM for analysis/reasoning tasks."""
    global REASONING_COMPONENTS
    config_loader = REASONING_COMPONENTS.get("config_loader")
    if not config_loader:
        raise RuntimeError("ConfigLoader not initialized.")

    llm_config = config_loader.get_llm_config()
    # Use provided model name or default from config
    effective_model_name = model_name or llm_config.get("model", "gemini-1.5-flash-latest")
    logger.debug(f"Using model {effective_model_name} for analysis.")

    try:
        model = genai.GenerativeModel(effective_model_name)
        # Consider adding safety settings if needed for analysis prompts
        response = await model.generate_content_async(prompt)
        if not response.text:
             block_reason = response.prompt_feedback.block_reason if response.prompt_feedback else 'Unknown'
             logger.warning(f"LLM response for analysis was empty/blocked: {block_reason}")
             raise LLMError(f"LLM response for analysis was empty/blocked (Reason: {block_reason})")
        return response.text.strip()
    except Exception as e:
        logger.error(f"LLM call failed during analysis: {e}", exc_info=True)
        raise LLMError(f"LLM call failed during analysis: {e}")


async def handle_select_persona(params: Dict[str, Any]) -> Dict[str, Any]:
    """Handles the 'reasoning/selectPersona' request."""
    global REASONING_COMPONENTS, PERSONAS_DIR
    if not REASONING_COMPONENTS["initialized"]:
        logger.error("Reasoning components not initialized. Cannot select persona.")
        return create_error_response("SERVICE_UNINITIALIZED", "Reasoning components are not ready.")

    logger.info("Handling reasoning/selectPersona request.")
    try:
        goal = params.get("goal")
        if not goal:
            raise ValueError("Missing 'goal' in reasoning/selectPersona params")

        prompt_manager = REASONING_COMPONENTS.get("prompt_manager")
        if not prompt_manager:
             raise RuntimeError("PromptManager not initialized.")

        # 1. List available persona files (e.g., *.md files in PERSONAS_DIR)
        available_personas = []
        try:
            if os.path.isdir(PERSONAS_DIR):
                available_personas = [
                    f.replace('.md', '') for f in os.listdir(PERSONAS_DIR)
                    if f.endswith('.md') and os.path.isfile(os.path.join(PERSONAS_DIR, f))
                ]
            if not available_personas:
                 logger.warning(f"No persona files (.md) found in {PERSONAS_DIR}")
                 # Fallback or error? Return default persona content? For now, error.
                 return create_error_response("NO_PERSONAS_FOUND", f"No persona definition files found in {PERSONAS_DIR}")
        except Exception as e:
             logger.error(f"Error listing personas in {PERSONAS_DIR}: {e}", exc_info=True)
             return create_error_response("INTERNAL_ERROR", "Failed to list available personas.")

        # 2. Format the selection prompt
        selection_prompt = prompt_manager.format_prompt(
            "select_persona",
            goal=goal,
            persona_names=", ".join(available_personas)
        )

        # 3. Call LLM to select the best persona name
        selected_persona_name = await _call_llm_for_persona(selection_prompt)
        logger.info(f"LLM selected persona: {selected_persona_name}")

        # 4. Validate the selected name against available personas
        if selected_persona_name not in available_personas:
             logger.warning(f"LLM selected an invalid persona '{selected_persona_name}'. Falling back to default or first available.")
             # Fallback strategy: Use a default (e.g., 'SE-Apex') or the first one found
             selected_persona_name = "SE-Apex" if "SE-Apex" in available_personas else available_personas[0]
             logger.info(f"Using fallback persona: {selected_persona_name}")


        # 5. Read the content of the selected persona file
        persona_file_path = os.path.join(PERSONAS_DIR, f"{selected_persona_name}.md")
        try:
            with open(persona_file_path, 'r', encoding='utf-8') as f:
                persona_content = f.read()
            logger.info(f"Successfully read persona content for: {selected_persona_name}")
            # Return success data
            return {"persona_content": persona_content}
        except Exception as e:
             logger.error(f"Failed to read persona file {persona_file_path}: {e}", exc_info=True)
             return create_error_response("FILE_READ_ERROR", f"Could not read content for selected persona '{selected_persona_name}'.")

    except (ValueError, KeyError) as e:
         logger.warning(f"Invalid params for reasoning/selectPersona: {e}")
         return create_error_response("INVALID_PARAMS", str(e))
    except (PromptError, LLMError) as e:
         logger.error(f"Error during persona selection: {e}", exc_info=True)
         return create_error_response("PERSONA_SELECTION_FAILED", str(e))
    except Exception as e:
        logger.exception(f"Unexpected error in handle_select_persona: {e}")
        return create_error_response("INTERNAL_ERROR", f"An unexpected error occurred: {e}")


# --- New Analysis/Recovery Handler ---

async def handle_analyze_and_recover(params: Dict[str, Any]) -> Dict[str, Any]:
    """Handles the 'reasoning/analyzeAndRecover' request."""
    global REASONING_COMPONENTS
    if not REASONING_COMPONENTS["initialized"]:
        logger.error("Reasoning components not initialized. Cannot analyze/recover.")
        return create_error_response("SERVICE_UNINITIALIZED", "Reasoning components are not ready.")

    logger.info("Handling reasoning/analyzeAndRecover request.")
    try:
        # Extract required parameters
        task_goal = params.get("task_goal")
        agent_state = params.get("agent_state") # Could be complex dict/JSON string
        error_details = params.get("error_details") # Could be complex dict/JSON string
        action_history = params.get("action_history") # Could be list of dicts/JSON string
        plan_state = params.get("plan_state") # Optional, could be dict/JSON string

        if not all([task_goal, agent_state, error_details, action_history]):
            raise ValueError("Missing required parameters (task_goal, agent_state, error_details, action_history) in reasoning/analyzeAndRecover")

        prompt_manager = REASONING_COMPONENTS.get("prompt_manager")
        if not prompt_manager:
             raise RuntimeError("PromptManager not initialized.")

        # Format the prompt
        # Ensure complex structures are reasonably formatted for the prompt
        # (e.g., using json.dumps for dicts/lists if they aren't already strings)
        prompt = prompt_manager.format_prompt(
            "analyze_and_recover",
            task_goal=task_goal,
            agent_state=json.dumps(agent_state, indent=2) if isinstance(agent_state, (dict, list)) else str(agent_state),
            error_details=json.dumps(error_details, indent=2) if isinstance(error_details, (dict, list)) else str(error_details),
            action_history=json.dumps(action_history, indent=2) if isinstance(action_history, (dict, list)) else str(action_history),
            plan_state=json.dumps(plan_state, indent=2) if isinstance(plan_state, (dict, list)) else str(plan_state or "N/A")
        )

        # Call LLM for analysis (potentially use a more powerful model if configured)
        # TODO: Allow specifying model in config for recovery?
        llm_response_text = await _call_llm_for_analysis(prompt) # Use helper

        # Parse the expected JSON response from the LLM
        try:
            recovery_plan = json.loads(llm_response_text)
            # Basic validation of the structure (can be more robust)
            if not isinstance(recovery_plan, dict) or "analysis" not in recovery_plan or "next_actions" not in recovery_plan:
                 raise ValueError("LLM response for recovery is not valid JSON or missing required keys.")
            logger.info("Successfully parsed recovery plan from LLM.")
            return recovery_plan # Return the structured plan
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response from LLM for recovery: {e}\nLLM Response:\n{llm_response_text}", exc_info=True)
            # Fallback: maybe return the raw text or a specific error?
            return create_error_response("INVALID_LLM_RESPONSE_FORMAT", f"LLM did not return valid JSON for recovery plan: {e}")
        except ValueError as e:
             logger.error(f"Invalid structure in LLM recovery plan: {e}\nLLM Response:\n{llm_response_text}", exc_info=True)
             return create_error_response("INVALID_LLM_RESPONSE_STRUCTURE", str(e))


    except (ValueError, KeyError) as e:
         logger.warning(f"Invalid params for reasoning/analyzeAndRecover: {e}")
         return create_error_response("INVALID_PARAMS", str(e))
    except (PromptError, LLMError) as e:
         logger.error(f"Error during analysis/recovery: {e}", exc_info=True)
         return create_error_response("RECOVERY_FAILED", str(e))
    except Exception as e:
        logger.exception(f"Unexpected error in handle_analyze_and_recover: {e}")
        return create_error_response("INTERNAL_ERROR", f"An unexpected error occurred: {e}")


# --- Final Method Map Definition ---
METHOD_MAP = {
    # Existing Methods
    "initialize": handle_initialize,
    "executeTask": handle_execute_task,
    "updateConfiguration": handle_update_configuration,
    "toolResponse": handle_tool_response,
    "shutdown": handle_shutdown,

    # New Reasoning Methods (namespaced for clarity)
    "reasoning/generatePlan": handle_generate_plan,
    "reasoning/refineSteps": handle_refine_steps,
    "reasoning/selectPersona": handle_select_persona,
    "reasoning/analyzeAndRecover": handle_analyze_and_recover,
    "reasoning/getPersonaContentByName": handle_get_persona_content_by_name,
    "reasoning/replanning": handle_replanning, # Added new handler

    # New Knowledge Method
    "knowledge/search": handle_knowledge_search,
}
