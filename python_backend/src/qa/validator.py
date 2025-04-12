"""
Implementation of the QA Validation Module.
NOTE: This might be less relevant in the integrated backend context.
"""

import json
import logging # Import logging
from typing import Dict, List, Any
from llm_client import LLMClient

# Adjust import paths
from exceptions import QAValidationError, LLMError
from utils.prompt_manager import PromptManager


class QAValidator:
    """
    Implements QA validation for the final checklist.
    NOTE: Functionality might be limited or disabled in the integrated backend.
    """

    def __init__(self, config, prompt_manager, llm_client=None, logger=None):
        """
        Initialize the QAValidator.

        Args:
            config (dict): QA validation configuration (should include LLM settings).
            prompt_manager (PromptManager): Prompt manager instance.
            llm_client: LLM client instance (Note: Redundant if client configured globally).
            logger (logging.Logger, optional): Logger instance.
        """
        self.config = config
        self.prompt_manager = prompt_manager
        self.logger = logger or logging.getLogger(self.__class__.__name__) # Get logger
        # Default to disabled in the integrated context unless explicitly enabled
        self.enabled = config.get("enabled", False)
        self.criteria = config.get("criteria", [
            "completeness", "actionability", "clarity", "logical_flow"
        ])

        if self.enabled:
            self.logger.info("Initializing QAValidator")
            if llm_client == None:
                self.llm_client = LLMClient()
        else:
             self.model = None
             self.logger.info("QA validation is disabled by configuration.")


    async def validate_checklist(self, checklist):
        """
        Validate the final checklist.

        Args:
            checklist (dict): The final checklist to validate.

        Returns:
            dict: Validation results (or default if disabled).

        Raises:
            QAValidationError: If validation fails critically (and is enabled).
        """
        if not self.enabled or not self.model:
            self.logger.info("QA validation is disabled or model not initialized. Skipping.")
            return {
                "passed": True, # Assume passed if disabled
                "score": 1.0,
                "feedback": "QA validation is disabled.",
                "issues": [],
                "suggestions": []
            }

        try:
            self.logger.info("Starting QA validation...")
            # Format the checklist for validation
            formatted_checklist = self._format_checklist_for_validation(checklist)

            # Generate validation prompt
            self.logger.debug("Formatting QA validation prompt.")
            prompt = self.prompt_manager.format_prompt(
                "qa_validate_checklist", # Assumes this prompt exists
                checklist=formatted_checklist,
                criteria=json.dumps(self.criteria, indent=2)
            )

            # Call LLM for validation
            self.logger.debug("Calling LLM for QA validation...")
            response = await self._call_llm(prompt)
            self.logger.debug("LLM response received for QA validation.")

            # Parse validation results
            validation_results = self._parse_validation_results(response)
            self.logger.info("QA validation completed. Score: %.2f", validation_results.get('score', 0.0))

            return validation_results
        except Exception as e:
            self.logger.error("QA validation failed: %s", str(e), exc_info=True)
            # Depending on desired behavior, either raise or return a failure status
            # Raising error for now
            raise QAValidationError(f"Failed to validate checklist: {str(e)}")

    def _format_checklist_for_validation(self, checklist):
        """
        Format the checklist for validation (e.g., JSON string).
        """
        try:
            # Convert checklist to JSON string
            return json.dumps(checklist, indent=2)
        except Exception as e:
            self.logger.error("Failed to format checklist for validation: %s", e, exc_info=True)
            raise QAValidationError(f"Failed to format checklist for validation: {str(e)}")

    async def _call_llm(self, prompt):
        """
        Call the LLM with the given prompt using the class's model instance.
        """
        if not self.llm_client:
             raise LLMError("QAValidator LLM model is not initialized.")
        return await self.llm_client.generate(prompt)

    def _parse_validation_results(self, response):
        """
        Parse the LLM response to extract validation results (expecting JSON).
        """
        self.logger.debug("Parsing QA validation results from LLM response.")
        try:
            # Use the generic JSON parser, expecting "validation_results" key
            parsed_data = self._parse_json_response(response, "validation_results")

            # Basic validation of structure
            required_keys = ["score", "feedback", "issues", "suggestions"] # Simplified expected keys
            if not isinstance(parsed_data, dict) or not all(key in parsed_data for key in required_keys):
                 # Log available keys for debugging
                 available_keys = list(parsed_data.keys()) if isinstance(parsed_data, dict) else "N/A (not a dict)"
                 self.logger.error(f"Parsed QA validation JSON lacks required keys. Expected: {required_keys}, Got: {available_keys}")
                 raise ValueError("Parsed QA validation JSON lacks required keys.")
            if not isinstance(parsed_data["score"], (int, float)):
                 # Attempt conversion
                 try:
                      parsed_data["score"] = float(parsed_data["score"])
                 except (ValueError, TypeError):
                      raise ValueError("Parsed QA validation 'score' is not a number.")
            # Ensure lists are lists
            if not isinstance(parsed_data.get("issues", []), list):
                 parsed_data["issues"] = [] # Default to empty list if not list
            if not isinstance(parsed_data.get("suggestions", []), list):
                 parsed_data["suggestions"] = [] # Default to empty list if not list


            self.logger.debug("Successfully parsed QA validation results.")
            # Add a 'passed' key based on score threshold if desired
            parsed_data["passed"] = parsed_data["score"] >= self.config.get("passing_score_threshold", 0.8)
            return parsed_data
        except ValueError as e:
             self.logger.error("Invalid QA validation structure: %s\nParsed Data: %s", str(e), parsed_data if 'parsed_data' in locals() else 'N/A', exc_info=True)
             raise QAValidationError(f"Invalid QA validation structure: {e}")
        except Exception as e: # Catch errors from _parse_json_response too
            self.logger.error("Failed to parse QA validation results: %s", str(e), exc_info=True)
            raise QAValidationError(f"Could not parse QA validation results from LLM response: {e}")

    # Add the generic JSON parser helper method (copied for encapsulation)
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
                raise QAValidationError(f"Expected key '{expected_key}' not found in LLM JSON response.")

            return parsed_json[expected_key]

        except json.JSONDecodeError as e:
            self.logger.error("Failed to decode LLM JSON response: %s\nResponse: %s", e, response[:500])
            raise QAValidationError(f"Failed to decode LLM JSON response: {e}")
        except Exception as e:
            self.logger.error("Error parsing LLM response for key '%s': %s", expected_key, e, exc_info=True)
            raise QAValidationError(f"Error parsing LLM response: {e}")
