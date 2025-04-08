"""
Implementation of the hierarchical checklist generator.
"""

import asyncio
import json
import logging # Import logging
from typing import List, Dict, Any
import google.generativeai as genai

# Adjust import paths for the new location
from ..exceptions import ChecklistGeneratorError, LLMError
from ..utils.prompt_manager import PromptManager
from .reasoning_tree import ReasoningTree
from .checkpoint_manager import CheckpointManager


class ChecklistGenerator:
    """
    Generates hierarchical checklists from high-level goals.
    """

    def __init__(self, config, prompt_manager, checkpoint_manager=None, reasoning_tree=None, logger=None):
        """
        Initialize the ChecklistGenerator.

        Args:
            config (dict): Configuration settings.
            prompt_manager (PromptManager): Prompt manager instance.
            checkpoint_manager (CheckpointManager, optional): Checkpoint manager instance.
            reasoning_tree (ReasoningTree, optional): Reasoning tree instance.
            logger (logging.Logger, optional): Logger instance.
        """
        self.config = config
        self.prompt_manager = prompt_manager
        # Checkpointing might not be used in the integrated backend, handle None
        self.checkpoint_manager = checkpoint_manager
        self.reasoning_tree = reasoning_tree
        self.logger = logger or logging.getLogger(self.__class__.__name__) # Get logger

        # Initialize LLM client
        # Ensure API key is configured before this point (e.g., in main backend setup)
        # genai.configure(api_key=config.get("api_key")) # Configuration should happen globally once
        model_name = config.get("model")
        if not model_name:
            # Use a default or raise error if model is critical
            # For now, let's assume a default model might be set elsewhere or raise
             raise ChecklistGeneratorError("LLM model name not found in configuration for ChecklistGenerator.")
            # model_name = "gemini-pro" # Example default
            # self.logger.warning("LLM model name not found, using default: %s", model_name)

        self.logger.info("Initializing ChecklistGenerator LLM with model: %s", model_name)
        try:
            self.model = genai.GenerativeModel(
                model_name=model_name,
                generation_config={
                    "temperature": config.get("temperature", 0.7),
                    "top_p": config.get("top_p", 0.95),
                    "top_k": config.get("top_k", 40),
                    "max_output_tokens": config.get("max_output_tokens", 8192),
                }
            )
        except Exception as e:
             self.logger.error("Failed to initialize GenerativeModel: %s", e, exc_info=True)
             raise ChecklistGeneratorError(f"Failed to initialize LLM model '{model_name}': {e}")

        # Set decomposition limits
        self.max_phases = config.get("max_phases", 7)
        self.max_tasks_per_phase = config.get("max_tasks_per_phase", 7)
        self.max_steps_per_task = config.get("max_steps_per_task", 10)

    async def generate_checklist(self, goal, context=None):
        """
        Generate a hierarchical checklist from a high-level goal.

        Args:
            goal (str): The high-level goal.
            context (dict, optional): Additional context information.

        Returns:
            dict: Generated hierarchical checklist.

        Raises:
            ChecklistGeneratorError: If the checklist cannot be generated.
        """
        try:
            # Initialize context if not provided
            context = context or {}

            # Initialize checklist structure
            checklist = {
                "goal": goal,
                "phases": [],
                "metadata": {
                    "context": context,
                    "reasoning": {}
                }
            }

            # Generate phases
            self.logger.info("Generating phases...")
            phases_result = await self._generate_phases(goal, context)
            checklist["phases"] = phases_result["selected"]
            checklist["metadata"]["reasoning"]["phases"] = {
                "alternatives": phases_result.get("alternatives", []),
                "evaluations": phases_result.get("evaluations", []),
                "justification": phases_result.get("justification", "")
            }

            # Checkpointing logic removed as it's less relevant for RPC calls

            # Generate tasks for each phase
            self.logger.info("Generating tasks for each phase...")
            for phase_idx, phase in enumerate(checklist["phases"]):
                self.logger.info("Generating tasks for Phase %d: %s", phase_idx + 1, phase.get('name', 'Unnamed Phase'))
                phase_context = {
                    "goal": goal,
                    "phase_idx": phase_idx,
                    "phase_name": phase.get("name"),
                    "phase_description": phase.get("description"),
                    "phases": checklist["phases"] # Pass current state
                }

                tasks_result = await self._generate_tasks(goal, phase_context)
                phase["tasks"] = tasks_result["selected"]
                self.logger.info("Tasks generated for Phase %d.", phase_idx + 1)

                if "reasoning" not in phase:
                    phase["reasoning"] = {}

                phase["reasoning"]["tasks"] = {
                    "alternatives": tasks_result.get("alternatives", []),
                    "evaluations": tasks_result.get("evaluations", []),
                    "justification": tasks_result.get("justification", "")
                }

                # Checkpointing logic removed

                # Generate steps for each task
                self.logger.info("Generating steps for each task in Phase %d...", phase_idx + 1)
                for task_idx, task in enumerate(phase["tasks"]):
                    self.logger.info("Generating steps for Task %d: %s", task_idx + 1, task.get('name', 'Unnamed Task'))
                    task_context = {
                        "goal": goal,
                        "phase_idx": phase_idx,
                        "phase_name": phase.get("name"),
                        "phase_description": phase.get("description"),
                        "task_idx": task_idx,
                        "task_name": task.get("name"),
                        "task_description": task.get("description"),
                        "phases": checklist["phases"], # Pass current state
                        "tasks": phase["tasks"] # Pass current tasks in phase
                    }

                    steps = await self._generate_steps(goal, task_context)
                    # Ensure steps have unique IDs (if not provided by LLM)
                    for i, step in enumerate(steps):
                         if "step_id" not in step:
                              step["step_id"] = f"phase{phase_idx}_task{task_idx}_step{i}"
                         # Ensure 'prompt' key exists, maybe using 'description' as fallback
                         if "prompt" not in step:
                              step["prompt"] = step.get("description", f"Implement step {i+1} for task '{task.get('name')}'")


                    task["steps"] = steps
                    self.logger.info("Steps generated for Task %d.", task_idx + 1)

                    # Checkpointing logic removed

            # Final checkpointing logic removed

            return checklist
        except Exception as e:
            self.logger.error("Checklist generation process failed: %s", str(e), exc_info=True)
            # Catch specific LLM errors if possible
            if "API key not valid" in str(e):
                 raise LLMError(f"LLM API key is not valid. Please check configuration. Original error: {e}")
            raise ChecklistGeneratorError(f"Failed to generate checklist: {str(e)}")


    async def _generate_phases(self, goal, context):
        """
        Generate phases for the checklist.
        """
        try:
            # Reasoning tree integration might be simplified or handled differently
            # For now, focus on direct generation via LLM call
            # if self.reasoning_tree and self.config.get("reasoning_tree", {}).get("enabled", True):
            #     self.logger.info("Using reasoning tree logic for phases (if implemented)...")
            #     # ... reasoning tree logic ...
            # else:
            self.logger.info("Generating phases directly using LLM.")
            prompt = self.prompt_manager.format_prompt(
                "generate_phases", # Assumes this prompt exists
                goal=goal,
                context=json.dumps(context, indent=2),
                max_phases=self.max_phases
            )

            self.logger.debug("Calling LLM for phase generation...")
            response = await self._call_llm(prompt)
            self.logger.debug("LLM response received for phase generation.")
            phases = self._parse_json_response(response, "phases") # Use helper
            self.logger.info("Phases generated.")

            # Basic structure for direct generation
            return {
                "selected": phases,
                "alternatives": [phases], # Simple alternative list
                "evaluations": [],
                "justification": "Direct LLM generation"
            }
        except Exception as e:
            self.logger.error("Phase generation failed: %s", str(e), exc_info=True)
            raise ChecklistGeneratorError(f"Failed to generate phases: {str(e)}")

    async def _generate_tasks(self, goal, phase_context):
        """
        Generate tasks for a phase.
        """
        try:
            # Simplified direct generation
            self.logger.info("Generating tasks directly using LLM for phase: %s", phase_context.get('phase_name'))
            prompt = self.prompt_manager.format_prompt(
                "generate_tasks", # Assumes this prompt exists
                goal=goal,
                phase_name=phase_context.get("phase_name"),
                phase_description=phase_context.get("phase_description"),
                context=json.dumps(phase_context, indent=2),
                max_tasks=self.max_tasks_per_phase
            )

            self.logger.debug("Calling LLM for task generation...")
            response = await self._call_llm(prompt)
            self.logger.debug("LLM response received for task generation.")
            tasks = self._parse_json_response(response, "tasks") # Use helper
            self.logger.info("Tasks generated.")

            return {
                "selected": tasks,
                "alternatives": [tasks],
                "evaluations": [],
                "justification": "Direct LLM generation"
            }
        except Exception as e:
            self.logger.error("Task generation failed for phase %s: %s", phase_context.get('phase_name'), str(e), exc_info=True)
            raise ChecklistGeneratorError(f"Failed to generate tasks: {str(e)}")

    async def _generate_steps(self, goal, task_context):
        """
        Generate steps for a task.
        """
        try:
            self.logger.info("Generating steps using LLM for task: %s", task_context.get('task_name'))
            prompt = self.prompt_manager.format_prompt(
                "generate_steps", # Assumes this prompt exists
                goal=goal,
                phase_name=task_context.get("phase_name"),
                task_name=task_context.get("task_name"),
                task_description=task_context.get("task_description"),
                context=json.dumps(task_context, indent=2),
                max_steps=self.max_steps_per_task
            )

            self.logger.debug("Calling LLM for step generation...")
            response = await self._call_llm(prompt)
            self.logger.debug("LLM response received for step generation.")
            steps = self._parse_json_response(response, "steps") # Use helper
            self.logger.info("Steps generated.")

            return steps
        except Exception as e:
            self.logger.error("Step generation failed for task %s: %s", task_context.get('task_name'), str(e), exc_info=True)
            raise ChecklistGeneratorError(f"Failed to generate steps: {str(e)}")

    async def _call_llm(self, prompt):
        """
        Call the LLM with the given prompt.
        """
        if not hasattr(self, 'model') or not self.model:
             raise LLMError("LLM model is not initialized.")
        try:
            self.logger.debug("Calling LLM...")
            # Add safety settings if needed
            safety_settings = self.config.get("safety_settings", None)
            response = await self.model.generate_content_async(
                 prompt,
                 safety_settings=safety_settings
            )
            self.logger.debug("LLM call successful.")
            # Add basic check for response content
            if not response.text:
                 # Handle cases where the response might be blocked or empty
                 block_reason = response.prompt_feedback.block_reason if response.prompt_feedback else 'Unknown'
                 self.logger.warning(f"LLM response was empty or blocked. Reason: {block_reason}")
                 # Depending on severity, either return empty or raise error
                 # For now, let's raise an error to indicate failure clearly
                 raise LLMError(f"LLM response was empty or blocked (Reason: {block_reason}). Prompt: {prompt[:100]}...")

            return response.text
        except Exception as e:
            self.logger.error("LLM call failed: %s", str(e), exc_info=True)
            # Re-raise as LLMError for specific handling upstream
            raise LLMError(f"LLM call failed: {str(e)}")

    def _parse_json_response(self, response, expected_key):
        """
        Parse the LLM response expecting JSON, potentially wrapped in markdown.

        Args:
            response (str): LLM response text.
            expected_key (str): The top-level key expected in the JSON (e.g., 'phases', 'tasks', 'steps').

        Returns:
            list: The list extracted from the JSON under the expected key.

        Raises:
            ChecklistGeneratorError: If parsing fails or the key is missing.
        """
        try:
            # Clean potential markdown fences
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0].strip()
            else:
                json_str = response.strip()

            # Handle potential escape sequences if needed (basic handling)
            json_str = json_str.replace('\\n', '\n').replace('\\"', '"')

            parsed_json = json.loads(json_str)

            if expected_key not in parsed_json:
                raise ChecklistGeneratorError(f"Expected key '{expected_key}' not found in LLM JSON response.")
            if not isinstance(parsed_json[expected_key], list):
                 raise ChecklistGeneratorError(f"Value for key '{expected_key}' is not a list in LLM JSON response.")

            return parsed_json[expected_key]

        except json.JSONDecodeError as e:
            self.logger.error("Failed to decode LLM JSON response: %s\nResponse: %s", e, response[:500])
            raise ChecklistGeneratorError(f"Failed to decode LLM JSON response: {e}")
        except Exception as e:
            self.logger.error("Error parsing LLM response for key '%s': %s", expected_key, e, exc_info=True)
            raise ChecklistGeneratorError(f"Error parsing LLM response: {e}")

    # --- Methods below are kept for potential future use but might be simplified ---
    # _parse_phases, _parse_tasks, _parse_steps are replaced by _parse_json_response

    # def _parse_phases(self, response): ... (Removed)
    # def _parse_tasks(self, response): ... (Removed)
    # def _parse_steps(self, response): ... (Removed)
