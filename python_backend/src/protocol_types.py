from typing import TypedDict, List, Optional, Literal, Any # Added 'Any'

# --- Common Structures ---

class EditorContext(TypedDict):
    """Represents the editor context sent from host to backend."""
    activeEditorContent: Optional[str]
    activeEditorPath: Optional[str]
    selection: Optional[str]
    openFiles: List[str]
    # relevantFiles: List[str] # Consider adding if needed later

class RpcErrorData(TypedDict, total=False):
    """Structure for the 'data' field within a JSON-RPC error object."""
    details: Optional[str]
    # Add other relevant fields as needed

class RpcError(TypedDict):
    """JSON-RPC Error Object structure."""
    code: int
    message: str # Corrected from 'string' to 'str'
    data: Optional[RpcErrorData]

# --- Method-Specific Parameter & Result Types ---

# executeTask (Request Params)
class ExecuteTaskParams(TypedDict):
    taskId: str
    prompt: str
    context: EditorContext

# executeTask (Result - Success)
class ExecuteTaskResult(TypedDict):
    status: Literal["completed", "error"]
    message: Optional[str] # Optional message, e.g., on error

# $/partialResult (Notification Params)
class PartialResultParams(TypedDict):
    taskId: str
    content: str
    type: Literal["thought", "code", "text"]

# $/requestToolExecution (Request Params)
class RequestToolExecutionParams(TypedDict):
    toolCallId: str
    toolName: str
    toolInput: dict # Tool input structure varies per tool

# toolResponse (Response Params from Host)
class ToolResponseParams(TypedDict):
    toolCallId: str
    result: Optional[Any]
    error: Optional[RpcError] # Use RpcError structure for tool errors

# $/logMessage (Notification Params)
class LogMessageParams(TypedDict):
    type: Literal["info", "warn", "error"]
    message: str

# $/statusUpdate (Notification Params)
class StatusUpdateParams(TypedDict):
    message: str
    progress: Optional[float] # e.g., 0.0 to 1.0

# $/taskError (Notification Params)
class TaskErrorParams(TypedDict):
    taskId: str
    message: str
    details: Optional[Any]

# initialize (Notification Params)
class InitializeParams(TypedDict):
    initialConfig: dict # Structure depends on actual config needed
    workspaceRoot: Optional[str]
    environment: dict # e.g., { 'vscodeVersion': '1.80.0', 'platform': 'win32' }

# updateConfiguration (Notification Params)
class UpdateConfigurationParams(TypedDict):
    updatedConfig: dict # Structure depends on actual config changed
