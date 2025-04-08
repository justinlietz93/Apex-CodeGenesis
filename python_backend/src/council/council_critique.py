"""
Implementation of the Synergistic Council Critique Module.
"""

import asyncio
import json
import logging # Import logging
from typing import List, Dict, Any
import google.generativeai as genai

# Adjust import paths
from ..exceptions import CouncilCritiqueError, LLMError
from ..utils.prompt_manager import PromptManager


class CouncilCritiqueModule:
    """
    Implements the Synergistic Council Framework for refining checklist steps.
    """

    def __init__(self, config, prompt_manager, llm_client=None, logger=None):
        """
        Initialize the CouncilCritiqueModule.

        Args:
            config (dict): Council critique configuration (should include LLM settings).
            prompt_manager (PromptManager): Prompt manager instance.
            llm_client: LLM client instance (Note: Redundant if genai configured globally).
            logger (logging.Logger, optional): Logger instance.
        """
        self.config = config
        self.prompt_manager = prompt_manager
        # self.llm_client = llm_client or genai # Rely on global genai
        self.logger = logger or logging.getLogger(self.__class__.__name__) # Get logger
        self.enabled = config.get("enabled", True) # Control if council logic is active

        # Get enabled personas
        self.personas = config.get("personas", [])
        self.enabled_personas = [p["name"] for p in self.personas if p.get("enabled", True)]
        if not self.enabled_personas:
             self.logger.warning("Council critique is enabled, but no personas are enabled in the configuration.")
             self.enabled = False # Disable if no personas are active

        # Initialize LLM model - Use model name from config
        model_name = self.config.get("model")
        if not model_name:
             raise CouncilCritiqueError("LLM model name not found in council configuration.")

        self.logger.info("Initializing CouncilCritiqueModule LLM with model: %s", model_name)
        try:
             # Assumes genai is configured globally
            self.model = genai.GenerativeModel(
                model_name=model_name,
                generation_config={
                    "temperature": self.config.get("temperature", 0.7),
                    "top_p": self.config.get("top_p", 0.95),
                    "top_k": self.config.get("top_k", 40), # Use config or default
                    "max_output_tokens": self.config.get("max_output_tokens", 8192), # Use config or default
                }
            )
        except Exception as e:
             self.logger.error("Failed to initialize GenerativeModel for CouncilCritique: %s", e, exc_info=True)
             raise CouncilCritiqueError(f"Failed to initialize LLM model '{model_name}' for CouncilCritique: {e}")


    async def review_and_refine(self, steps, context):
        """
        Review and refine checklist steps using the council critique framework.

        Args:
            steps (list): List of checklist steps (dictionaries) to refine.
            context (dict): Context information (goal, phase, task details).

        Returns:
            list: Refined checklist steps (dictionaries).

        Raises:
            CouncilCritiqueError: If steps cannot be refined due to critical errors.
        """
        if not self.enabled or not steps:
            self.logger.info("Council critique disabled or no steps provided. Skipping refinement.")
            return steps

        try:
            self.logger.info("Starting council critique for task: %s", context.get('task_name', 'N/A'))
            # Generate critiques from each enabled persona
            self.logger.debug("Generating critiques from personas: %s", self.enabled_personas)
            critiques = await self._generate_critiques(steps, context)
            self.logger.debug("Critiques generated.")

            # Synthesize critiques and revise steps
            self.logger.debug("Revising steps based on critiques...")
            revised_steps = await self._revise_steps(steps, critiques, context)
            self.logger.debug("Steps revised.")

            # Validate revised steps structure (basic validation)
            if not self._validate_output_structure(revised_steps, steps):
                self.logger.warning("Revised steps failed structure validation. Returning original steps.")
                return steps

            self.logger.info("Council critique refinement completed successfully.")
            return revised_steps
        except Exception as e:
            # Log the error but return original steps to avoid breaking the flow
            self.logger.error("Council critique failed: %s. Returning original steps.", str(e), exc_info=True)
            return steps

    async def _generate_critiques(self, steps, context):
        """
        Generate critiques from each enabled persona concurrently.
        """
        try:
            critique_tasks = []
            for persona in self.enabled_personas:
                self.logger.debug("Setting up critique task for persona: %s", persona)
                task = self._generate_persona_critique(steps, context, persona)
                critique_tasks.append(task)

            # Run all critique tasks concurrently
            self.logger.info("Running %d critique tasks concurrently...", len(critique_tasks))
            critique_results = await asyncio.gather(*critique_tasks, return_exceptions=True)
            self.logger.info("Critique tasks completed.")

            # Process critique results
            critiques = {}
            for i, persona in enumerate(self.enabled_personas):
                result = critique_results[i]
                if isinstance(result, Exception):
                    self.logger.warning("Critique generation failed for persona %s: %s", persona, str(result))
                    critiques[persona] = f"Critique generation failed: {str(result)}" # Include error in critique
                else:
                    critiques[persona] = result
                    self.logger.debug("Critique received from persona: %s", persona)

            return critiques
        except Exception as e:
            self.logger.error("Failed to gather critiques: %s", str(e), exc_info=True)
            # Raise error here as it's a fundamental failure of this step
            raise CouncilCritiqueError(f"Failed to gather critiques: {str(e)}")

    async def _generate_persona_critique(self, steps, context, persona):
        """
        Generate a critique from a specific persona using LLM.
        """
        try:
            self.logger.debug("Generating critique from persona: %s", persona)
            prompt_name = f"critique_{persona}" # Assumes prompts like critique_Kant.txt exist
            prompt = self.prompt_manager.format_prompt(
                prompt_name,
                steps=json.dumps(steps, indent=2),
                context=json.dumps(context, indent=2)
            )

            response = await self._call_llm(prompt)
            self.logger.debug("Critique generated successfully by %s.", persona)
            # Return the raw text critique
            return response.strip()
        except Exception as e:
            self.logger.error("Failed to generate %s critique: %s", persona, str(e), exc_info=True)
            # Re-raise to be caught by gather
            raise CouncilCritiqueError(f"Failed to generate {persona} critique: {str(e)}")

    async def _revise_steps(self, steps, critiques, context):
        """
        Synthesize critiques and revise steps using LLM.
        """
        try:
            self.logger.debug("Formatting prompt to revise steps based on critiques.")
            prompt = self.prompt_manager.format_prompt(
                "revise_steps", # Assumes revise_steps.txt prompt exists
                steps=json.dumps(steps, indent=2),
                critiques=json.dumps(critiques, indent=2),
                context=json.dumps(context, indent=2)
            )

            self.logger.debug("Calling LLM to revise steps...")
            response = await self._call_llm(prompt)
            self.logger.debug("LLM response received for step revision.")

            # Parse the response to extract revised steps list
            revised_steps = self._parse_revised_steps(response)
            self.logger.info("Steps revised based on council critiques.")

            return revised_steps
        except Exception as e:
            self.logger.error("Failed to revise steps: %s", str(e), exc_info=True)
            raise CouncilCritiqueError(f"Failed to revise steps: {str(e)}")

    def _validate_output_structure(self, revised_steps, original_steps):
        """
        Basic validation of the revised steps structure.
        Checks if it's a list of dicts with expected keys.
        """
        self.logger.debug("Validating structure of revised steps...")
        try:
            if not isinstance(revised_steps, list):
                self.logger.warning("Validation failed: Revised steps is not a list.")
                return False

            # Optional: Check if the number of steps changed drastically (might indicate LLM error)
            # if abs(len(revised_steps) - len(original_steps)) > len(original_steps) // 2:
            #     self.logger.warning("Validation failed: Number of steps changed significantly (%d vs %d).", len(original_steps), len(revised_steps))
            #     return False

            for i, step in enumerate(revised_steps):
                if not isinstance(step, dict):
                    self.logger.warning("Validation failed: Step %d is not a dictionary.", i)
                    return False
                # Check for essential keys, e.g., 'prompt' or 'description' used by generator
                if "prompt" not in step and "description" not in step:
                     self.logger.warning("Validation failed: Step %d is missing 'prompt' or 'description' key.", i)
                     return False
                # Ensure the main content key holds a string
                content_key = "prompt" if "prompt" in step else "description"
                if not isinstance(step[content_key], str):
                     self.logger.warning(f"Validation failed: Step %d '{content_key}' is not a string.", i)
                     return False
                # Ensure step_id exists (might be added by generator later, but good check)
                if "step_id" not in step:
                     self.logger.warning("Validation warning: Step %d is missing 'step_id'. May be added later.", i)
                     # return False # Decide if this is critical

            self.logger.debug("Revised steps structure validation passed.")
            return True
        except Exception as e:
            self.logger.error("Error during revised steps validation: %s", str(e), exc_info=True)
            return False

    async def _call_llm(self, prompt):
        """
        Call the LLM with the given prompt using the class's model instance.
        """
        if not hasattr(self, 'model') or not self.model:
             raise LLMError("CouncilCritique LLM model is not initialized.")
        try:
            self.logger.debug("Calling LLM (CouncilCritique)...")
            # Add safety settings if needed from config
            safety_settings = self.config.get("safety_settings", None)
            response = await self.model.generate_content_async(
                 prompt,
                 safety_settings=safety_settings
            )
            self.logger.debug("LLM call successful (CouncilCritique).")
            if not response.text:
                 block_reason = response.prompt_feedback.block_reason if response.prompt_feedback else 'Unknown'
                 self.logger.warning(f"LLM response (CouncilCritique) was empty or blocked. Reason: {block_reason}")
                 raise LLMError(f"LLM response (CouncilCritique) was empty or blocked (Reason: {block_reason}). Prompt: {prompt[:100]}...")
            return response.text
        except Exception as e:
            self.logger.error("LLM call failed (CouncilCritique): %s", str(e), exc_info=True)
            raise LLMError(f"LLM call failed (CouncilCritique): {str(e)}")

    def _parse_revised_steps(self, response):
        """
        Parse the LLM response expecting JSON containing a list of revised steps.
        """
        self.logger.debug("Parsing revised steps from LLM response.")
        try:
            # Use the generic JSON parser, expecting "revised_steps" key
            parsed_data = self._parse_json_response(response, "revised_steps")

            if not isinstance(parsed_data, list):
                 raise ValueError("Parsed revised_steps JSON is not a list.")

            self.logger.debug("Successfully parsed revised steps.")
            return parsed_data
        except ValueError as e:
             self.logger.error("Invalid revised_steps structure: %s\nParsed Data: %s", str(e), parsed_data, exc_info=True)
             raise CouncilCritiqueError(f"Invalid revised_steps structure: {e}")
        except Exception as e: # Catch errors from _parse_json_response too
            self.logger.error("Failed to parse revised steps: %s", str(e), exc_info=True)
            raise CouncilCritiqueError(f"Could not parse revised steps from LLM response: {e}")

    # Add the generic JSON parser helper method (copied from reasoning_tree.py for encapsulation)
    def _parse_json_response(self, response, expected_key):
        """
        Parse the LLM response expecting JSON, potentially wrapped in markdown.
        """
        try:
            # Clean potential markdown fences
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0].strip()
            else:
                json_str = response.strip()

            # Handle potential escape sequences
            json_str = json_str.replace('\\n', '\n').replace('\\"', '"')

            parsed_json = json.loads(json_str)

            if expected_key not in parsed_json:
                available_keys = list(parsed_json.keys()) if isinstance(parsed_json, dict) else "N/A (not a dict)"
                self.logger.error(f"Expected key '{expected_key}' not found in LLM JSON response. Available keys: {available_keys}")
                raise CouncilCritiqueError(f"Expected key '{expected_key}' not found in LLM JSON response.")

            return parsed_json[expected_key]

        except json.JSONDecodeError as e:
            self.logger.error("Failed to decode LLM JSON response: %s\nResponse: %s", e, response[:500])
            raise CouncilCritiqueError(f"Failed to decode LLM JSON response: {e}")
        except Exception as e:
            self.logger.error("Error parsing LLM response for key '%s': %s", expected_key, e, exc_info=True)
            raise CouncilCritiqueError(f"Error parsing LLM response: {e}")
