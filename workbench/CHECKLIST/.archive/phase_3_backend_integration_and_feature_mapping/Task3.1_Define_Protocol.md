# Phase 3: Backend Integration and Feature Mapping

**Goal:** Integrate the Apex panel UI with the Python backend by defining and implementing a communication protocol, connecting UI actions and mapped Copilot features (commands, menus, shortcuts) to backend logic, and ensuring necessary editor context is captured and passed.

---

## Task 3.1: Define the communication protocol between the VS Code extension (TypeScript/JavaScript) and the Python backend (e.g., REST API, WebSockets, stdio). [x]

### Step: Analyze the communication requirements between the VS Code extension frontend (TypeScript/JavaScript running in the Extension Host) and the Python backend process. Identify the types of interactions needed (e.g., sending user requests, receiving code suggestions, status updates, configuration changes). Determine if the communication needs to be synchronous (request-response) or asynchronous (notifications, streaming). [x] (Identified core interactions: init, task exec, config, lifecycle. Mostly async, task exec involves streaming, tool calls are Py->Host request/response)
#### Success Criteria:
- The necessary types of messages/interactions between the extension host and Python backend are identified.
- Each interaction is classified regarding its purpose (request, response, notification) and timing (synchronous, asynchronous, streaming).
#### Validation Metrics:
- A list of required interactions (e.g., `sendUserPrompt`, `receiveSuggestions`, `updateStatus`, `applyConfig`) is documented.
- Each item in the list specifies direction (Host->Py, Py->Host) and nature (sync/async/stream).

### Step: Evaluate potential communication methods: REST API (via localhost HTTP server), WebSockets, and standard input/output (stdio) pipes between the extension process and a spawned Python child process. Compare them based on performance (latency, overhead), complexity of implementation (libraries, setup), reliability, ease of process management (starting/stopping the Python backend), and suitability for bidirectional communication within a VS Code extension context. [x] (Evaluated REST, WebSockets, stdio. Stdio favored for efficiency, direct process control, no port needs despite requiring message framing.)
#### Success Criteria:
- REST (localhost), WebSockets, and stdio are systematically compared against the specified criteria (performance, complexity, reliability, process management, bidirectionality).
- A summary of the pros and cons for each method in the context of this specific extension is produced.
#### Validation Metrics:
- A document or table exists detailing the evaluation of REST, WebSockets, and stdio against performance, complexity, reliability, process mgmt, and bidirectionality criteria.
- The evaluation considers the VS Code extension and child process architecture.

### Step: Based on the evaluation in Step 2, select the most appropriate communication method. **Hint:** Given that the Python backend will likely be managed as a child process by the extension, stdio often provides a direct and efficient communication channel without the need for network port management. Consider using a structured protocol over stdio, such as JSON-RPC 2.0, for message formatting and handling requests/responses. [x] (Selected: stdio with JSON-RPC 2.0 protocol layer)
#### Success Criteria:
- A specific communication method (e.g., stdio) is chosen based on the evaluation.
- A specific message formatting protocol (e.g., JSON-RPC 2.0 over stdio) is potentially selected.
#### Validation Metrics:
- The chosen method (e.g., "stdio") and protocol (e.g., "JSON-RPC 2.0") are explicitly documented as the selected approach for extension-backend communication.

### Step: Define the specific message format based on the chosen protocol (e.g., JSON-RPC 2.0). Specify the structure for requests (e.g., `jsonrpc`, `method`, `params`, `id`) and responses (e.g., `jsonrpc`, `result` or `error`, `id`). Define a basic set of JSON-RPC error codes relevant to the extension-backend interaction (e.g., parse error, invalid request, method not found, internal error, application-specific errors). [x] (Defined standard JSON-RPC 2.0 request/response/error structures. Defined standard codes and initial application-specific codes -32000 to -32004.)
#### Success Criteria:
- The exact structure (required fields, types) for request messages is defined according to the chosen protocol (e.g., JSON-RPC 2.0).
- The exact structure for success and error response messages is defined.
- A list of relevant error codes (standard and application-specific) and their meanings is defined.
#### Validation Metrics:
- Documentation or type definitions (e.g., TypeScript interfaces) specify the JSON structure for requests, success responses, and error responses (including `jsonrpc`, `id`, `method`/`result`/`error`, `params`).
- A documented list maps defined error codes to their descriptions.

### Step: Identify and define the initial set of RPC methods (or API endpoints/message types if not using JSON-RPC) required for the core functionality identified in Step 1. Examples might include: `initializeBackend`, `requestCompletion`, `applySuggestion`, `getBackendStatus`, `updateConfiguration`, `sendDocumentContext`. Specify the expected parameters (`params`) and the structure of the expected return value (`result`) or `error` for each method. [x] (Defined methods: Host->Py: initialize, executeTask, updateConfiguration, toolResponse, shutdown; Py->Host: $/logMessage, $/statusUpdate, $/partialResult, $/requestToolExecution, $/taskError)
#### Success Criteria:
- A list of specific method names (e.g., `initializeBackend`, `requestCompletion`) needed for core functionality is defined.
- For each method, the structure and types of its parameters (`params`) are defined.
- For each method, the structure and types of its potential success result (`result`) and error (`error`) payloads are defined.
#### Validation Metrics:
- Documentation lists each method name.
- For each method, associated type definitions (e.g., TypeScript interfaces) for `params`, `result`, and `error` structures exist.

### Step: Document the chosen communication protocol and message definitions in a designated file within the project (e.g., `docs/communication_protocol.md` or `PROTOCOL.md`). This document should clearly outline the chosen method (e.g., stdio JSON-RPC), the exact message structures, the defined methods/endpoints with their parameters and return types, and the error handling strategy. [x] (Created `apex/docs/PROTOCOL.md` with details)
#### Success Criteria:
- A documentation file (`PROTOCOL.md` or similar) exists and is committed to the project.
- The document accurately describes the selected communication method (e.g., stdio JSON-RPC).
- It details the structure of requests, success responses, and error responses.
- It lists all defined methods/endpoints, including their specific `params`, `result`, and `error` structures.
- It outlines the agreed-upon error codes and general error handling approach.
#### Validation Metrics:
- File `PROTOCOL.md` exists in the project repository.
- Content review confirms all required sections (method, message structures, method definitions, error handling) are present and accurately reflect the decisions from previous steps.

### Step: Consider potential challenges and edge cases with the chosen protocol. For stdio: How will message framing be handled (e.g., prepending content length)? How will the extension manage the lifecycle of the Python process? How will errors from the Python process itself (not just RPC errors) be captured and handled? Briefly document these considerations and potential solutions within the protocol documentation or related design notes. [x] (Added 'Implementation Considerations' section to `PROTOCOL.md`)
#### Success Criteria:
- Potential implementation challenges specific to the chosen protocol (e.g., stdio message framing, process management, non-RPC errors) are identified.
- Plausible solutions or strategies for handling these challenges are proposed.
- These considerations and solutions are documented.
#### Validation Metrics:
- The protocol documentation or related design notes contain a section discussing challenges like message framing (e.g., "Use Content-Length header"), process lifecycle management (e.g., "Spawn on activation, kill on deactivation"), and Python process errors (e.g., "Log stderr to OutputChannel").
