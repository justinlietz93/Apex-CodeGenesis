"""
Utility for loading and managing prompts.
"""

import os
# Adjust import path for the new location
from exceptions import PromptError


class PromptManager:
    """
    Loads and manages prompts from text files.
    """

    def __init__(self, prompts_dir=None):
        """
        Initialize the PromptManager.

        Args:
            prompts_dir (str, optional): Directory containing prompt files. Defaults to None.
        """
        # Adjust path calculation for the new location within python_backend
        self.prompts_dir = prompts_dir or os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), # Goes up to python_backend root
            "prompts" # Assumes prompts dir is in python_backend root
        )
        self.prompts_cache = {}
        # Ensure prompts directory exists
        os.makedirs(self.prompts_dir, exist_ok=True)


    def get_prompt(self, prompt_name):
        """
        Get a prompt by name.

        Args:
            prompt_name (str): Name of the prompt file (without extension).

        Returns:
            str: Prompt content.

        Raises:
            PromptError: If the prompt file cannot be loaded.
        """
        # Check if prompt is already cached
        if prompt_name in self.prompts_cache:
            return self.prompts_cache[prompt_name]

        # Load prompt from file
        prompt_path = os.path.join(self.prompts_dir, f"{prompt_name}.txt")
        try:
            with open(prompt_path, 'r') as file:
                prompt = file.read()
                self.prompts_cache[prompt_name] = prompt
                return prompt
        except FileNotFoundError:
             raise PromptError(f"Prompt file '{prompt_name}.txt' not found in {self.prompts_dir}")
        except Exception as e:
            raise PromptError(f"Failed to load prompt '{prompt_name}' from {prompt_path}: {str(e)}")

    def format_prompt(self, prompt_name, **kwargs):
        """
        Format a prompt with the given parameters.

        Args:
            prompt_name (str): Name of the prompt file (without extension).
            **kwargs: Keyword arguments to format the prompt.

        Returns:
            str: Formatted prompt.

        Raises:
            PromptError: If the prompt file cannot be loaded or formatted.
        """
        try:
            prompt = self.get_prompt(prompt_name)
            return prompt.format(**kwargs)
        except KeyError as e:
            raise PromptError(f"Missing required parameter for prompt '{prompt_name}': {str(e)}")
        except Exception as e:
            raise PromptError(f"Failed to format prompt '{prompt_name}': {str(e)}")

    def create_prompt_files(self, prompts_dict):
        """
        Create prompt files from a dictionary of prompts.
        Useful for initial setup or testing.

        Args:
            prompts_dict (dict): Dictionary mapping prompt names to content.

        Raises:
            PromptError: If a prompt file cannot be created.
        """
        os.makedirs(self.prompts_dir, exist_ok=True)
        
        for prompt_name, content in prompts_dict.items():
            prompt_path = os.path.join(self.prompts_dir, f"{prompt_name}.txt")
            try:
                with open(prompt_path, 'w') as file:
                    file.write(content)
                # Update cache
                self.prompts_cache[prompt_name] = content
            except Exception as e:
                raise PromptError(f"Failed to create prompt file '{prompt_name}': {str(e)}")
