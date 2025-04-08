"""
Checkpoint manager for saving and loading application state.
NOTE: This module might be less relevant in the integrated backend context.
"""

import os
import json
import time
import logging
from datetime import datetime
# Adjust import path
from ..exceptions import CheckpointError


class CheckpointManager:
    """
    Manages saving and loading application state to enable resumability.
    NOTE: Functionality might be limited or disabled in the integrated backend.
    """

    def __init__(self, checkpoint_dir=None, config=None, logger=None):
        """
        Initialize the CheckpointManager.

        Args:
            checkpoint_dir (str, optional): Directory for storing checkpoints. Defaults to None.
            config (dict, optional): Checkpoint configuration. Defaults to None.
            logger (logging.Logger, optional): Logger instance.
        """
        self.config = config or {}
        # Default to disabled in the integrated context unless explicitly enabled
        self.enabled = self.config.get("enabled", False)
        self.logger = logger or logging.getLogger(self.__class__.__name__)

        if self.enabled:
            self.checkpoint_dir = checkpoint_dir or os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))), # python_backend root
                "checkpoints" # Assumes checkpoints dir in python_backend root
            )
            # Create checkpoint directory if it doesn't exist
            try:
                os.makedirs(self.checkpoint_dir, exist_ok=True)
                self.logger.info(f"Checkpointing enabled. Directory: {self.checkpoint_dir}")
            except Exception as e:
                 self.logger.error(f"Failed to create checkpoint directory {self.checkpoint_dir}. Disabling checkpointing. Error: {e}")
                 self.enabled = False
        else:
             self.checkpoint_dir = None
             self.logger.info("Checkpointing is disabled by configuration.")


    def save_checkpoint(self, state, checkpoint_type="manual", identifier=None):
        """
        Save the current application state to a checkpoint file.

        Args:
            state (dict): Application state to save.
            checkpoint_type (str, optional): Type of checkpoint (phase, task, step, manual).
                                            Defaults to "manual".
            identifier (str, optional): Unique identifier for the checkpoint.
                                       Defaults to None (timestamp used).

        Returns:
            str: Path to the saved checkpoint file, or None if disabled.

        Raises:
            CheckpointError: If the checkpoint cannot be saved.
        """
        if not self.enabled or not self.checkpoint_dir:
            self.logger.debug("Skipping save_checkpoint (disabled or dir not set).")
            return None

        try:
            # Generate checkpoint identifier if not provided
            if identifier is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                identifier = f"{checkpoint_type}_{timestamp}"

            # Add metadata to state
            state_with_metadata = {
                "metadata": {
                    "timestamp": time.time(),
                    "datetime": datetime.now().isoformat(),
                    "type": checkpoint_type,
                    "identifier": identifier
                },
                "state": state
            }

            # Save checkpoint to file
            checkpoint_path = os.path.join(self.checkpoint_dir, f"{identifier}.json")
            self.logger.info(f"Saving checkpoint: {checkpoint_path}")
            with open(checkpoint_path, 'w') as file:
                json.dump(state_with_metadata, file, indent=2)

            return checkpoint_path
        except Exception as e:
            self.logger.error(f"Failed to save checkpoint: {e}", exc_info=True)
            raise CheckpointError(f"Failed to save checkpoint: {str(e)}")

    def load_checkpoint(self, checkpoint_path=None, identifier=None):
        """
        Load application state from a checkpoint file.

        Args:
            checkpoint_path (str, optional): Path to the checkpoint file. Defaults to None.
            identifier (str, optional): Identifier of the checkpoint to load. Defaults to None.

        Returns:
            dict: Loaded application state, or None if disabled or not found.

        Raises:
            CheckpointError: If the checkpoint cannot be loaded due to errors.
        """
        if not self.enabled or not self.checkpoint_dir:
             self.logger.debug("Skipping load_checkpoint (disabled or dir not set).")
             return None

        try:
            # Determine checkpoint path
            if checkpoint_path is None and identifier is not None:
                checkpoint_path = os.path.join(self.checkpoint_dir, f"{identifier}.json")
            elif checkpoint_path is None:
                # Load the latest checkpoint if no path or identifier is provided
                checkpoint_path = self._get_latest_checkpoint()

            if not checkpoint_path or not os.path.exists(checkpoint_path):
                self.logger.warning(f"Checkpoint file not found: {checkpoint_path}")
                return None # Return None if not found, don't raise error

            # Load checkpoint from file
            self.logger.info(f"Loading checkpoint: {checkpoint_path}")
            with open(checkpoint_path, 'r') as file:
                checkpoint_data = json.load(file)

            return checkpoint_data.get("state", {})
        except Exception as e:
            self.logger.error(f"Failed to load checkpoint: {e}", exc_info=True)
            raise CheckpointError(f"Failed to load checkpoint: {str(e)}")

    def _get_latest_checkpoint(self):
        """
        Get the path to the latest checkpoint file.

        Returns:
            str: Path to the latest checkpoint file, or None if no checkpoints exist.
        """
        if not self.enabled or not self.checkpoint_dir:
             return None
        try:
            checkpoint_files = [
                os.path.join(self.checkpoint_dir, f)
                for f in os.listdir(self.checkpoint_dir)
                if f.endswith('.json')
            ]

            if not checkpoint_files:
                self.logger.info("No checkpoint files found.")
                return None

            # Sort by modification time (newest first)
            checkpoint_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            self.logger.debug(f"Latest checkpoint found: {checkpoint_files[0]}")
            return checkpoint_files[0]
        except Exception as e:
            self.logger.error(f"Failed to get latest checkpoint: {e}", exc_info=True)
            # Don't raise error, just return None
            return None

    def list_checkpoints(self):
        """
        List all available checkpoints.

        Returns:
            list: List of checkpoint metadata.
        """
        if not self.enabled or not self.checkpoint_dir:
            return []

        try:
            checkpoint_files = [
                os.path.join(self.checkpoint_dir, f)
                for f in os.listdir(self.checkpoint_dir)
                if f.endswith('.json')
            ]

            checkpoints = []
            for checkpoint_path in checkpoint_files:
                try:
                    with open(checkpoint_path, 'r') as file:
                        checkpoint_data = json.load(file)
                        metadata = checkpoint_data.get("metadata", {})
                        metadata["path"] = checkpoint_path
                        checkpoints.append(metadata)
                except Exception as e:
                    self.logger.warning(f"Skipping invalid checkpoint file {checkpoint_path}: {e}")
                    continue

            # Sort by timestamp (newest first)
            checkpoints.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
            return checkpoints
        except Exception as e:
            self.logger.error(f"Failed to list checkpoints: {e}", exc_info=True)
            return [] # Return empty list on error

    def delete_checkpoint(self, checkpoint_path=None, identifier=None):
        """
        Delete a checkpoint file.

        Args:
            checkpoint_path (str, optional): Path to the checkpoint file. Defaults to None.
            identifier (str, optional): Identifier of the checkpoint to delete. Defaults to None.

        Returns:
            bool: True if the checkpoint was deleted, False otherwise.
        """
        if not self.enabled or not self.checkpoint_dir:
            return False

        try:
            # Determine checkpoint path
            if checkpoint_path is None and identifier is not None:
                checkpoint_path = os.path.join(self.checkpoint_dir, f"{identifier}.json")

            if not checkpoint_path or not os.path.exists(checkpoint_path):
                self.logger.warning(f"Checkpoint not found for deletion: {checkpoint_path or identifier}")
                return False

            # Delete checkpoint file
            self.logger.info(f"Deleting checkpoint: {checkpoint_path}")
            os.remove(checkpoint_path)
            return True
        except Exception as e:
            self.logger.error(f"Failed to delete checkpoint: {e}", exc_info=True)
            # Don't raise error, just return False
            return False

    def should_checkpoint(self, checkpoint_type):
        """
        Determine if a checkpoint should be created based on configuration.
        NOTE: May always return False if checkpointing is disabled.
        """
        if not self.enabled:
            return False

        frequency = self.config.get("frequency", "manual") # Default to manual if enabled

        if frequency == "phase" and checkpoint_type == "phase":
            return True
        elif frequency == "task" and checkpoint_type in ["phase", "task"]:
            return True
        elif frequency == "step" and checkpoint_type in ["phase", "task", "step"]:
            return True
        elif frequency == "manual": # Only save when explicitly called
             return checkpoint_type == "manual" # Or adjust based on save_checkpoint calls

        return False
