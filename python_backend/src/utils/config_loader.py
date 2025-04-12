"""
Utility for loading and managing configuration settings.
"""
import sys
import os
import yaml
from dotenv import load_dotenv
# Adjust import path for the new location
from exceptions import ConfigError


class ConfigLoader:
    """
    Loads and manages configuration settings from config.yaml and environment variables.
    """

    def __init__(self, config_path=None):
        """
        Initialize the ConfigLoader.

        Args:
            config_path (str, optional): Path to the configuration file. Defaults to None.
        """
        # Adjust path calculation for the new location within python_backend
        self.config_path = config_path or os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), # Goes up to python_backend root
            "config.yaml" # Assumes config.yaml is in python_backend root
        )
        self.config = self._load_config()
        self._load_env_vars()

    def _load_config(self):
        """
        Load configuration from the YAML file.

        Returns:
            dict: Configuration settings.

        Raises:
            ConfigError: If the configuration file cannot be loaded.
        """
        try:
            with open(self.config_path, 'r') as file:
                return yaml.safe_load(file)
        except FileNotFoundError:
             # Allow operation without config file if API key is set via env
             if os.getenv("GEMINI_API_KEY"):
                 return {} # Return empty config
             else:
                 raise ConfigError(f"Configuration file not found at {self.config_path} and GEMINI_API_KEY not set.")
        except Exception as e:
            raise ConfigError(f"Failed to load configuration from {self.config_path}: {str(e)}")

    def _load_env_vars(self):
        """
        Load environment variables from .env file.

        Raises:
            ConfigError: If required environment variables are missing.
        """
        # Load environment variables from .env file
        # Adjust path calculation for the new location
        env_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), # Goes up to python_backend root
            ".env" # Assumes .env is in python_backend root
        )
        
        # Try to load from .env file, but don't fail if it doesn't exist
        load_dotenv(env_path, override=True)
        
        # Check for required environment variables (only if not found in config)
        # Allow API key to be optional if provided in config.yaml later
        # if not os.getenv("GEMINI_API_KEY") and not self.config.get("llm", {}).get("api_key"):
        #     raise ConfigError("GEMINI_API_KEY environment variable or llm.api_key in config is required")
        # Simplified: Assume API key is primary way for now
        if not os.getenv("GEMINI_API_KEY"):
             # Log a warning instead of raising an error immediately
             # The component using the key should handle its absence
             print("Warning: GEMINI_API_KEY environment variable not found.", file=sys.stderr)


    def get_llm_config(self):
        """
        Get LLM configuration settings.

        Returns:
            dict: LLM configuration settings.
        """
        # Prioritize env var for API key if present
        config = self.config.get("llm", {})
        if os.getenv("GEMINI_API_KEY"):
            config["api_key"] = os.getenv("GEMINI_API_KEY")
        return config

    def get_decomposition_config(self):
        """
        Get hierarchical decomposition configuration settings.

        Returns:
            dict: Decomposition configuration settings.
        """
        return self.config.get("decomposition", {})

    def get_reasoning_tree_config(self):
        """
        Get reasoning tree configuration settings.

        Returns:
            dict: Reasoning tree configuration settings.
        """
        return self.config.get("reasoning_tree", {})

    def get_council_config(self):
        """
        Get council critique configuration settings.

        Returns:
            dict: Council critique configuration settings.
        """
        return self.config.get("council", {})

    def get_qa_validation_config(self):
        """
        Get QA validation configuration settings.

        Returns:
            dict: QA validation configuration settings.
        """
        return self.config.get("qa_validation", {})

    def get_checkpoint_config(self):
        """
        Get checkpoint configuration settings.

        Returns:
            dict: Checkpoint configuration settings.
        """
        # Checkpointing might not be relevant in the integrated backend context
        return self.config.get("checkpointing", {"enabled": False}) # Default to disabled

    def get_output_config(self):
        """
        Get output configuration settings.

        Returns:
            dict: Output configuration settings.
        """
        # File output might not be relevant in the integrated backend context
        return self.config.get("output", {})

    def get_logging_config(self):
        """
        Get logging configuration settings.

        Returns:
            dict: Logging configuration settings.
        """
        return self.config.get("logging", {})

    def get_api_key(self):
        """
        Get the Gemini API key.

        Returns:
            str: Gemini API key or None if not found.
        """
        # Prioritize env var
        return os.getenv("GEMINI_API_KEY") or self.config.get("llm", {}).get("api_key")


    def is_reasoning_tree_enabled(self):
        """
        Check if reasoning tree is enabled.

        Returns:
            bool: True if reasoning tree is enabled, False otherwise.
        """
        # Reasoning tree might be implicitly enabled if methods are called
        return self.config.get("reasoning_tree", {}).get("enabled", True)

    def is_council_enabled(self):
        """
        Check if council critique is enabled.

        Returns:
            bool: True if council critique is enabled, False otherwise.
        """
        return self.config.get("council", {}).get("enabled", True)

    def is_qa_validation_enabled(self):
        """
        Check if QA validation is enabled.

        Returns:
            bool: True if QA validation is enabled, False otherwise.
        """
        # QA validation might not be relevant for direct RPC calls
        return self.config.get("qa_validation", {}).get("enabled", False) # Default to disabled

    def is_checkpointing_enabled(self):
        """
        Check if checkpointing is enabled.

        Returns:
            bool: True if checkpointing is enabled, False otherwise.
        """
        return self.config.get("checkpointing", {}).get("enabled", False) # Default to disabled

    def get_enabled_council_personas(self):
        """
        Get the list of enabled council personas.

        Returns:
            list: List of enabled council persona names.
        """
        personas = self.config.get("council", {}).get("personas", [])
        return [p["name"] for p in personas if p.get("enabled", True)]
