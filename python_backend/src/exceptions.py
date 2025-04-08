"""
Custom exceptions for the Hierarchical Reasoning Checklist Generator.
"""

class ChecklistGeneratorError(Exception):
    """Base exception for all checklist generator errors."""
    pass


class LLMError(ChecklistGeneratorError):
    """Exception raised for errors in LLM API calls."""
    pass


class PromptError(ChecklistGeneratorError):
    """Exception raised for errors in prompt loading or formatting."""
    pass


class ConfigError(ChecklistGeneratorError):
    """Exception raised for errors in configuration loading or validation."""
    pass


class CheckpointError(ChecklistGeneratorError):
    """Exception raised for errors in checkpoint operations."""
    pass


class ValidationError(ChecklistGeneratorError):
    """Exception raised for errors in data validation."""
    pass


class ReasoningTreeError(ChecklistGeneratorError):
    """Exception raised for errors in reasoning tree operations."""
    pass


class CouncilCritiqueError(ChecklistGeneratorError):
    """Exception raised for errors in council critique operations."""
    pass


class QAValidationError(ChecklistGeneratorError):
    """Exception raised for errors in QA validation operations."""
    pass
