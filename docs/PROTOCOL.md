# Apex Extension-Backend Communication Protocol

This document defines the communication protocol used between the Apex VS Code extension (TypeScript/JavaScript, acting as the client) and the Python backend agent (acting as the server).

## 1. Transport Layer

The communication occurs over **Standard Input/Output (stdio)** pipes between the VS Code extension host process and the spawned Python backend process.

## 2. Protocol Layer

**JSON-RPC 2.0** is used as the structured protocol layer over stdio. This provides standard formats for requests, responses, and notifications, along with basic error handling.

## 3. Message Framing

To delineate individual JSON-RPC messages sent over the stdio stream, the **Language Server Protocol (LSP) Base Protocol** framing mechanism is used. Each JSON-RPC message is preceded by HTTP-style headers, primarily:

-   `Content-Length: <number>`: Specifies the size of the JSON-RPC message body in bytes (encoded in UTF-8).
-   `\r\n`: A blank line separating the headers from the message body.

Example:

```
Content-Length: 123\r\n
\r\n
{"jsonrpc": "2.0", "method": "exampleMethod", "params": {...}}
```

Libraries like `vscode-jsonrpc` (TypeScript) and `python-jsonrpc-server` or `pygls` (Python) typically handle this framing automatically.

## 4. Message Structures

Messages adhere to the JSON-RPC 2.0 specification.

### 4.1. Request Object

```typescript
interface RequestMessage {
  jsonrpc: "2.0";
  id: number | string; // Omitted for Notifications
  method: string;
  params?: object | any[];
}
```

### 4.2. Response Object (Success)

```typescript
interface ResponseMessage {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: any;
}
```

### 4.3. Response Object (Error)

```typescript
interface ErrorMessage {
  jsonrpc: "2.0";
  id: number | string | null;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}
```

## 5. Defined Methods

### 5.1. Host (Client) -> Python Backend (Server)

-   **`initialize` (Notification)**
    -   `params`: `{ initialConfig: object, workspaceRoot: string | null, environment: object }`
    -   *Purpose:* Sent once on backend startup with initial configuration and context.
-   **`executeTask` (Request)**
    -   `params`: `{ taskId: string, prompt: string, context: { activeEditorContent: string | null, activeEditorPath: string | null, selection: string | null, openFiles: string[], relevantFiles: string[] } }`
    -   `result`: `{ status: 'completed' | 'error', message?: string }` (Indicates final status; intermediate results via notifications)
    -   *Purpose:* Starts a user-initiated task.
-   **`updateConfiguration` (Notification)**
    -   `params`: `{ updatedConfig: object }`
    -   *Purpose:* Informs the backend of setting changes.
-   **`toolResponse` (Response to `$/requestToolExecution`)**
    -   `params`: `{ toolCallId: string, result: any | null, error: object | null }`
    -   *Purpose:* Returns the result (or error) of a tool execution requested by the backend. `toolCallId` must match the request ID.
-   **`shutdown` (Notification)**
    -   `params`: *None*
    -   *Purpose:* Signals the backend to terminate gracefully.

### 5.2. Python Backend (Server) -> Host (Client)

*(Note: `$/` prefix indicates non-standard notifications/requests as per JSON-RPC convention)*

-   **`$/logMessage` (Notification)**
    -   `params`: `{ type: 'info' | 'warn' | 'error', message: string }`
    -   *Purpose:* Sends logging information to the VS Code OutputChannel.
-   **`$/statusUpdate` (Notification)**
    -   `params`: `{ message: string, progress?: number }`
    -   *Purpose:* Provides user-visible status updates.
-   **`$/partialResult` (Notification)**
    -   `params`: `{ taskId: string, content: string, type: 'thought' | 'code' | 'text' }`
    -   *Purpose:* Streams intermediate results for a task.
-   **`$/requestToolExecution` (Request)**
    -   `params`: `{ toolCallId: string, toolName: string, toolInput: object }`
    -   `result`: (Sent by Host via `toolResponse`)
    -   *Purpose:* Asks the VS Code host to execute a specific tool/capability.
-   **`$/taskError` (Notification)**
    -   `params`: `{ taskId: string, message: string, details?: any }`
    *   *Purpose:* Reports an error encountered during a specific task execution.

*(Parameter and result/error structures will be further detailed with specific TypeScript/Python type definitions during implementation).*

## 6. Error Handling

-   Standard JSON-RPC errors (`-32700` to `-32600`) are used for protocol-level issues.
-   Implementation-defined server errors (`-32000` to `-32099`) are used for application-specific errors:
    -   `-32000`: Backend Initialization Error
    -   `-32001`: Task Execution Error
    -   `-32002`: Configuration Error
    -   `-32003`: Tool Execution Error (Reported by Host in `toolResponse`)
    -   `-32004`: Context Error
-   Errors originating directly from the Python process (e.g., uncaught exceptions, crashes) will be captured from the process's `stderr` stream by the extension host and logged to the OutputChannel.

## 7. Implementation Considerations & Challenges

-   **Message Framing:** As noted, LSP Base Protocol (Content-Length headers) will be used for framing. Both client (TS) and server (Python) implementations must strictly adhere to this to ensure correct message parsing. Libraries like `vscode-jsonrpc` and `python-jsonrpc-server` handle this.
-   **Process Lifecycle Management:**
    -   The VS Code extension host is responsible for spawning the Python backend process.
    -   The process should ideally be spawned when the extension activates or when the first request requiring the backend is made.
    -   The extension must monitor the child process and handle unexpected termination (e.g., crashes), potentially attempting a restart or notifying the user.
    -   The extension should gracefully terminate the Python process (e.g., sending the `shutdown` notification and then killing if necessary) when the extension deactivates or VS Code closes.
-   **Python Process Errors (Non-RPC):**
    -   Errors occurring within the Python backend *before* the JSON-RPC server is fully initialized or *after* it has shut down (or due to crashes) will not be reported via JSON-RPC error responses.
    -   The extension host must monitor the Python process's `stderr` stream. Any output to `stderr` should be treated as an error, logged to the Apex OutputChannel, and potentially trigger a notification to the user or a backend restart attempt.
-   **Concurrency and State:** The Python backend might need to handle concurrent requests or manage state across multiple requests (though the current design implies one main task at a time). The protocol implementation must consider how state is managed and if request handling needs to be serialized or support concurrency. For now, assume serial processing of `executeTask` requests.
-   **Large Data Transfer:** Sending extensive context (e.g., multiple large files) in `executeTask` parameters could potentially hit limits or performance bottlenecks with stdio/JSON. Consider strategies like sending file paths and having the backend request file content via a tool call if necessary, or implementing chunking if the protocol libraries support it.
