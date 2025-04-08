"""
Implementation of the reasoning tree for evaluating and selecting optimal paths.
"""

import asyncio
import json
import logging # Import logging
from typing import List, Dict, Any
import google.generativeai as genai

# Adjust import paths
from ..exceptions import ReasoningTreeError, LLMError
from ..utils.prompt_manager import PromptManager


class ReasoningTree:
    """
    Implements reasoning trees for evaluating and selecting optimal paths at decomposition nodes.
    """

    def __init__(self, config, prompt_manager, llm_client=None, logger=None):
        """
        Initialize the ReasoningTree.

        Args:
            config (dict): Reasoning tree configuration.
            prompt_manager (PromptManager): Prompt manager instance.
            llm_client: LLM client instance (Note: This might be redundant if genai is configured globally).
            logger (logging.Logger, optional): Logger instance.
        """
        self.config = config
        self.prompt_manager = prompt_manager
        # self.llm_client = llm_client or genai # genai is configured globally, use directly
        self.logger = logger or logging.getLogger(self.__class__.__name__) # Get logger
        self.alternatives_count = config.get("alternatives_count", 3)
        self.evaluation_criteria = config.get("evaluation_criteria", [
            "risks", "coherence", "completeness", "clarity"
        ])
        self.enabled = config.get("enabled", True) # Control if reasoning tree logic is active
        # Store decomposition limits from the merged config
        self.max_phases = config.get("max_phases", 7)
        self.max_tasks_per_phase = config.get("max_tasks_per_phase", 7)

        # Initialize LLM model instance specific to this class if needed, or rely on global config
        model_name = config.get("model")
        if not model_name:
             raise ReasoningTreeError("LLM model name not found in reasoning tree configuration.")
        self.logger.info("Initializing ReasoningTree LLM with model: %s", model_name)
        try:
            # This assumes genai is already configured with API key
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
             self.logger.error("Failed to initialize GenerativeModel for ReasoningTree: %s", e, exc_info=True)
             raise ReasoningTreeError(f"Failed to initialize LLM model '{model_name}' for ReasoningTree: {e}")


    async def generate_alternatives(self, goal, context, node_type):
        """
        Generate multiple alternative sets for a decomposition node.

        Args:
            goal (str): The high-level goal.
            context (dict): Context information.
            node_type (str): Type of node ("phase" or "task").

        Returns:
            list: List of alternative sets.

        Raises:
            ReasoningTreeError: If alternatives cannot be generated.
        """
        if not self.enabled:
            # If reasoning tree is disabled, generate a single alternative
            self.logger.info("Reasoning tree disabled for %s generation. Generating single alternative.", node_type)
            return await self._generate_single_alternative(goal, context, node_type)

        try:
            self.logger.info("Generating %d alternative sets for %s node.", self.alternatives_count, node_type)
            prompt_name = f"generate_{node_type}_alternatives"
            # Filter out None values before formatting
            prompt_args = {
                "goal": goal,
                "context": json.dumps(context, indent=2),
                "alternatives_count": self.alternatives_count
            }
            if node_type == "phase":
                prompt_args["max_phases"] = self.max_phases
            elif node_type == "task":
                # Extract phase details from context for task prompts
                prompt_args["phase_name"] = context.get("phase_name", "N/A")
                prompt_args["phase_description"] = context.get("phase_description", "N/A")
                # Assuming the task alternatives prompt might need max_tasks
                prompt_args["max_tasks"] = self.max_tasks_per_phase

            prompt = self.prompt_manager.format_prompt(prompt_name, **prompt_args)

            response = await self._call_llm(prompt)

            # Parse the response to extract alternatives
            alternatives = self._parse_alternatives(response, node_type)

            if not alternatives or len(alternatives) == 0:
                self.logger.warning("LLM failed to generate valid alternatives for %s node.", node_type)
                # Fallback to single generation? Or raise error? For now, raise.
                raise ReasoningTreeError(f"Failed to generate {node_type} alternatives: LLM returned no valid options.")

            self.logger.info("Successfully generated %d alternative sets for %s node.", len(alternatives), node_type)
            return alternatives
        except Exception as e:
            self.logger.error("Failed to generate %s alternatives: %s", node_type, str(e), exc_info=True)
            raise ReasoningTreeError(f"Failed to generate {node_type} alternatives: {str(e)}")

    async def _generate_single_alternative(self, goal, context, node_type):
        """
        Generate a single alternative when reasoning tree is disabled.
        This is essentially calling the direct generation prompt.
        """
        try:
            self.logger.info("Generating single alternative for %s node.", node_type)
            prompt_name = f"generate_{node_type}s" # Use the plural form prompt name (e.g., generate_phases)
            prompt_args = {
                "goal": goal,
                "context": json.dumps(context, indent=2)
            }
            if node_type == "phase":
                prompt_args["max_phases"] = self.max_phases
            elif node_type == "task":
                prompt_args["phase_name"] = context.get("phase_name", "N/A")
                prompt_args["phase_description"] = context.get("phase_description", "N/A")
                prompt_args["max_tasks"] = self.max_tasks_per_phase

            prompt = self.prompt_manager.format_prompt(prompt_name, **prompt_args)

            response = await self._call_llm(prompt)

            # Parse the response to extract the alternative list (even if just one)
            # Use the same parsing logic as the main generator
            alternative_list = self._parse_json_response(response, f"{node_type}s") # Expecting e.g., "phases" key

            if not alternative_list:
                self.logger.warning("LLM failed to generate a valid single alternative list for %s node.", node_type)
                raise ReasoningTreeError(f"Failed to generate single {node_type} list")

            self.logger.info("Successfully generated single alternative list for %s node.", node_type)
            # Return as a list containing one alternative set
            return [alternative_list]
        except Exception as e:
            self.logger.error("Failed to generate single %s alternative list: %s", node_type, str(e), exc_info=True)
            raise ReasoningTreeError(f"Failed to generate single {node_type} list: {str(e)}")

    async def evaluate_alternatives(self, goal, alternatives, node_type):
        """
        Evaluate multiple alternative sets using specified criteria.
        """
        if not self.enabled:
            self.logger.info("Reasoning tree disabled. Skipping evaluation for %s node.", node_type)
            # Return a simple evaluation for each alternative
            return [{"alternative_idx": i, "total_score": 1.0, "justification": "Default selection (reasoning tree disabled)"} for i in range(len(alternatives))]

        try:
            self.logger.info("Evaluating %d alternative sets for %s node using criteria: %s", len(alternatives), node_type, self.evaluation_criteria)
            evaluation_tasks = []

            for alt_idx, alternative in enumerate(alternatives):
                self.logger.debug("Setting up evaluation tasks for alternative %d", alt_idx)
                for criterion in self.evaluation_criteria:
                    task = self._evaluate_alternative_criterion(
                        goal, alternative, node_type, alt_idx, criterion
                    )
                    evaluation_tasks.append(task)

            # Run all evaluation tasks concurrently
            self.logger.info("Running %d evaluation tasks concurrently...", len(evaluation_tasks))
            evaluation_results = await asyncio.gather(*evaluation_tasks, return_exceptions=True)
            self.logger.info("Evaluation tasks completed.")

            # Process and aggregate evaluation results
            aggregated_evaluations = self._aggregate_evaluations(
                evaluation_results,
                len(alternatives),
                len(self.evaluation_criteria)
            )

            self.logger.info("Aggregated evaluations for %s node.", node_type)
            return aggregated_evaluations
        except Exception as e:
            self.logger.error("Failed to evaluate %s alternatives: %s", node_type, str(e), exc_info=True)
            raise ReasoningTreeError(f"Failed to evaluate {node_type} alternatives: {str(e)}")

    async def _evaluate_alternative_criterion(self, goal, alternative, node_type, alt_idx, criterion):
        """
        Evaluate a single alternative using a specific criterion.
        """
        try:
            self.logger.debug("Evaluating alternative %d for %s node using criterion '%s'", alt_idx, node_type, criterion)
            prompt_name = f"evaluate_{node_type}_{criterion}" # e.g., evaluate_phase_risks
            prompt = self.prompt_manager.format_prompt(
                prompt_name,
                goal=goal,
                alternative=json.dumps(alternative, indent=2)
            )

            response = await self._call_llm(prompt)

            # Parse the response to extract the evaluation
            evaluation = self._parse_evaluation(response, criterion)

            self.logger.debug("Evaluation complete for alternative %d, criterion '%s'. Score: %.2f", alt_idx, criterion, evaluation.get("score", 0.0))
            return {
                "alternative_idx": alt_idx,
                "criterion": criterion,
                "score": evaluation.get("score", 0.0),
                "justification": evaluation.get("justification", "")
            }
        except Exception as e:
            self.logger.error("Evaluation failed for alternative %d, criterion '%s': %s", alt_idx, criterion, str(e), exc_info=True)
            # Return a failed evaluation
            return {
                "alternative_idx": alt_idx,
                "criterion": criterion,
                "score": 0.0, # Indicate failure with low score
                "justification": f"Evaluation failed: {str(e)}"
            }

    def _aggregate_evaluations(self, evaluation_results, num_alternatives, num_criteria):
        """
        Aggregate evaluation results for each alternative.
        """
        self.logger.debug("Aggregating %d evaluation results for %d alternatives.", len(evaluation_results), num_alternatives)
        # Initialize aggregated evaluations
        aggregated = [
            {
                "alternative_idx": i,
                "criteria_scores": {},
                "total_score": 0.0,
                "justifications": {}
            } for i in range(num_alternatives)
        ]

        # Process evaluation results
        for result in evaluation_results:
            if isinstance(result, Exception):
                self.logger.warning("Skipping failed evaluation task: %s", str(result))
                continue

            alt_idx = result.get("alternative_idx")
            criterion = result.get("criterion")
            score = result.get("score", 0.0)
            justification = result.get("justification", "")

            if alt_idx is not None and criterion and alt_idx < num_alternatives:
                aggregated[alt_idx]["criteria_scores"][criterion] = score
                aggregated[alt_idx]["justifications"][criterion] = justification
            else:
                 self.logger.warning("Invalid evaluation result format skipped: %s", result)

        # Calculate total scores (simple average for now)
        for agg in aggregated:
            valid_scores = [s for s in agg["criteria_scores"].values() if isinstance(s, (int, float))]
            if valid_scores:
                agg["total_score"] = sum(valid_scores) / len(valid_scores)
            else:
                agg["total_score"] = 0.0 # Default score if no valid criteria scores
            self.logger.debug("Alternative %d aggregated score: %.2f", agg["alternative_idx"], agg["total_score"])

        return aggregated

    async def select_best_alternative(self, goal, alternatives, evaluations, node_type):
        """
        Select the best alternative based on evaluations.
        """
        if not self.enabled:
            self.logger.info("Reasoning tree disabled. Selecting first alternative for %s node by default.", node_type)
            if not alternatives:
                 raise ReasoningTreeError(f"Cannot select best {node_type} alternative: No alternatives provided.")
            # Return structure matching the enabled case but with default justification
            return {
                "selected": alternatives[0], # Select the first one
                "justification": "Default selection (reasoning tree disabled)",
                "alternative_idx": 0,
                "evaluation": evaluations[0] if evaluations else {"total_score": 1.0, "justification": "Default"} # Provide dummy eval if needed
            }

        try:
            self.logger.info("Selecting best alternative for %s node from %d options.", node_type, len(alternatives))
            if not evaluations or len(evaluations) != len(alternatives):
                 self.logger.error("Mismatch between number of alternatives (%d) and evaluations (%d).", len(alternatives), len(evaluations or []))
                 raise ReasoningTreeError("Number of evaluations does not match number of alternatives.")

            # Find the alternative with the highest total score
            best_idx = max(range(len(evaluations)), key=lambda i: evaluations[i].get("total_score", 0.0))
            best_alternative = alternatives[best_idx]
            best_evaluation = evaluations[best_idx]
            self.logger.info("Selected alternative index %d with score %.2f.", best_idx, best_evaluation.get("total_score", 0.0))

            # Generate a justification for the selection
            self.logger.debug("Generating justification for selecting alternative %d...", best_idx)
            justification = await self._generate_selection_justification(
                goal, alternatives, evaluations, best_idx, node_type
            )
            self.logger.debug("Selection justification generated.")

            return {
                "selected": best_alternative,
                "justification": justification,
                "alternative_idx": best_idx,
                "evaluation": best_evaluation
            }
        except Exception as e:
            self.logger.error("Failed to select best %s alternative: %s", node_type, str(e), exc_info=True)
            raise ReasoningTreeError(f"Failed to select best {node_type} alternative: {str(e)}")

    async def _generate_selection_justification(self, goal, alternatives, evaluations, best_idx, node_type):
        """
        Generate a justification for the selected alternative.
        """
        try:
            self.logger.debug("Formatting justification prompt for %s selection.", node_type)
            prompt_name = f"justify_{node_type}_selection" # e.g., justify_phase_selection
            prompt = self.prompt_manager.format_prompt(
                prompt_name,
                goal=goal,
                alternatives=json.dumps(alternatives, indent=2),
                evaluations=json.dumps(evaluations, indent=2),
                best_idx=best_idx
            )

            response = await self._call_llm(prompt)

            # Extract the justification from the response
            justification = response.strip()
            self.logger.debug("Successfully generated justification.")
            return justification
        except Exception as e:
            self.logger.error("Failed to generate selection justification: %s", str(e), exc_info=True)
            # Return a simple justification if generation fails
            return f"Selected based on highest overall score ({evaluations[best_idx].get('total_score', 'N/A'):.2f}) across evaluation criteria. (Justification generation error: {str(e)})"

    async def _call_llm(self, prompt):
        """
        Call the LLM with the given prompt using the class's model instance.
        """
        if not hasattr(self, 'model') or not self.model:
             raise LLMError("ReasoningTree LLM model is not initialized.")
        try:
            self.logger.debug("Calling LLM (ReasoningTree)...")
            # Add safety settings if needed from config
            safety_settings = self.config.get("safety_settings", None)
            response = await self.model.generate_content_async(
                 prompt,
                 safety_settings=safety_settings
            )
            self.logger.debug("LLM call successful (ReasoningTree).")
            if not response.text:
                 block_reason = response.prompt_feedback.block_reason if response.prompt_feedback else 'Unknown'
                 self.logger.warning(f"LLM response (ReasoningTree) was empty or blocked. Reason: {block_reason}")
                 raise LLMError(f"LLM response (ReasoningTree) was empty or blocked (Reason: {block_reason}). Prompt: {prompt[:100]}...")
            return response.text
        except Exception as e:
            self.logger.error("LLM call failed (ReasoningTree): %s", str(e), exc_info=True)
            raise LLMError(f"LLM call failed (ReasoningTree): {str(e)}")

    def _parse_alternatives(self, response, node_type):
        """
        Parse the LLM response to extract alternatives (expecting a list of lists).
        """
        self.logger.debug("Parsing alternatives from LLM response for %s node.", node_type)
        try:
            # Use the generic JSON parser
            # The prompt should ask for a JSON containing a key like "alternatives" which holds the list of lists
            parsed_data = self._parse_json_response(response, "alternatives") # Expecting "alternatives" key

            if not isinstance(parsed_data, list) or not all(isinstance(alt, list) for alt in parsed_data):
                 raise ValueError("Parsed alternatives JSON is not a list of lists.")

            self.logger.debug("Successfully parsed alternatives.")
            return parsed_data
        except ValueError as e:
             self.logger.error("Invalid alternatives structure: %s\nParsed Data: %s", str(e), parsed_data, exc_info=True)
             raise ReasoningTreeError(f"Invalid alternatives structure: {e}")
        except Exception as e: # Catch errors from _parse_json_response too
            self.logger.error("Failed to parse alternatives: %s", str(e), exc_info=True)
            raise ReasoningTreeError(f"Could not parse alternatives from LLM response: {e}")


    def _parse_single_alternative(self, response, node_type):
        """
        Parse the LLM response to extract a single alternative list.
        """
        self.logger.debug("Parsing single alternative list from LLM response for %s node.", node_type)
        try:
             # Use the generic JSON parser, expecting the plural key (e.g., "phases")
            parsed_data = self._parse_json_response(response, f"{node_type}s")

            if not isinstance(parsed_data, list):
                 raise ValueError(f"Parsed single alternative JSON for '{node_type}s' is not a list.")

            self.logger.debug("Successfully parsed single alternative list.")
            return parsed_data
        except ValueError as e:
             self.logger.error("Invalid single alternative structure: %s\nParsed Data: %s", str(e), parsed_data, exc_info=True)
             raise ReasoningTreeError(f"Invalid single alternative structure: {e}")
        except Exception as e: # Catch errors from _parse_json_response too
            self.logger.error("Failed to parse single alternative list: %s", str(e), exc_info=True)
            raise ReasoningTreeError(f"Could not parse single alternative list from LLM response: {e}")

    def _parse_evaluation(self, response, criterion):
        """
        Parse the LLM response to extract an evaluation.
        """
        self.logger.debug("Parsing evaluation from LLM response for criterion '%s'.", criterion)
        try:
            # Use the generic JSON parser, expecting "evaluation" key
            parsed_data = self._parse_json_response(response, "evaluation")

            # Basic validation
            if not isinstance(parsed_data, dict) or "score" not in parsed_data or "justification" not in parsed_data:
                 raise ValueError("Parsed evaluation JSON lacks required 'score' or 'justification' fields.")
            if not isinstance(parsed_data["score"], (int, float)):
                 # Attempt conversion if score is string representation of number
                 try:
                      parsed_data["score"] = float(parsed_data["score"])
                 except (ValueError, TypeError):
                      raise ValueError("Parsed evaluation 'score' is not a number and cannot be converted.")

            self.logger.debug("Successfully parsed evaluation.")
            return parsed_data
        except ValueError as e:
            self.logger.error("Invalid evaluation structure for criterion '%s': %s\nParsed Data: %s", criterion, str(e), parsed_data, exc_info=True)
            raise ReasoningTreeError(f"Invalid evaluation structure: {e}")
        except Exception as e: # Catch errors from _parse_json_response too
            self.logger.error("Failed to parse evaluation for criterion '%s': %s", criterion, str(e), exc_info=True)
            raise ReasoningTreeError(f"Could not parse evaluation from LLM response: {e}")

    # Add the generic JSON parser helper method
    def _parse_json_response(self, response, expected_key):
        """
        Parse the LLM response expecting JSON, potentially wrapped in markdown.

        Args:
            response (str): LLM response text.
            expected_key (str): The top-level key expected in the JSON.

        Returns:
            Any: The value extracted from the JSON under the expected key.

        Raises:
            ReasoningTreeError: If parsing fails or the key is missing.
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
                # Log available keys for debugging
                available_keys = list(parsed_json.keys()) if isinstance(parsed_json, dict) else "N/A (not a dict)"
                self.logger.error(f"Expected key '{expected_key}' not found in LLM JSON response. Available keys: {available_keys}")
                raise ReasoningTreeError(f"Expected key '{expected_key}' not found in LLM JSON response.")

            return parsed_json[expected_key]

        except json.JSONDecodeError as e:
            self.logger.error("Failed to decode LLM JSON response: %s\nResponse: %s", e, response[:500])
            raise ReasoningTreeError(f"Failed to decode LLM JSON response: {e}")
        except Exception as e:
            self.logger.error("Error parsing LLM response for key '%s': %s", expected_key, e, exc_info=True)
            raise ReasoningTreeError(f"Error parsing LLM response: {e}")
