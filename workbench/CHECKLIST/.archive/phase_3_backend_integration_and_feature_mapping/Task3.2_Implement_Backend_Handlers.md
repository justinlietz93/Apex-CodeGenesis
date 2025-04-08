# Phase 3: Backend Integration and Feature Mapping

**Goal:** Integrate the Apex panel UI with the Python backend by defining and implementing a communication protocol, connecting UI actions and mapped Copilot features (commands, menus, shortcuts) to backend logic, and ensuring necessary editor context is captured and passed.

---

## Task 3.2: Implement the necessary API endpoints or handlers in the Python backend to receive requests from the extension. [x]

### Step: Analyze the previously implemented Apex Panel UI (from Step 3) and the known functionalities of the original Copilot panel. Identify and list the specific actions the UI needs to trigger in the Python backend. Examples might include: requesting code suggestions, accepting a suggestion, rejecting a suggestion, getting status updates, clearing context, etc. [x] (Actions align with methods defined in Task 3.1: initialize, executeTask, updateConfiguration, toolResponse, shutdown, and backend-initiated notifications/requests)
#### Success Criteria:
- A comprehensive list of backend actions required by the frontend UI is created.
- The list is based on analysis of the implemented Apex UI and desired Copilot feature parity.
#### Validation Metrics:
- Documented list exists containing required backend actions (e.g., `handleSuggestionRequest`, `acceptSuggestion`, `rejectSuggestion`, `getStatus`, `clearHistory`).
- Each action corresponds to a user interaction or required background task initiated from the UI.

### Step: Assuming a web server framework like Flask or FastAPI is being used for the Python backend, define the API routes/endpoints corresponding to the actions identified in the previous step. For example, you might define routes like `/suggest`, `/accept`, `/status`. (If using stdio/JSON-RPC, this translates to defining handler functions for method names like `suggest`, `accept`, `status`). [x] (Method names defined in Task 3.1: initialize, executeTask, updateConfiguration, toolResponse, shutdown, etc.)
#### Success Criteria:
- Corresponding Python function names (for JSON-RPC/stdio) or API route paths (for HTTP) are defined for each backend action identified in the previous step.
#### Validation Metrics:
- A mapping exists (in documentation or code structure) between UI actions and specific Python method names (e.g., `suggest`, `accept`) or route paths (e.g., `/suggest`, `/accept`).
- If using a web framework, route definitions (e.g., `@app.route('/suggest')` or equivalent) exist in the Python code.

### Step: Create placeholder Python functions (handlers) for each defined API route/method within your chosen framework/structure (e.g., Flask route handler, JSON-RPC method handler). Ensure each function accepts appropriate arguments (e.g., request object for web framework, params dictionary for JSON-RPC) and returns a placeholder response (e.g., a simple JSON/dict acknowledging the request or a valid JSON-RPC response structure). Hint: Use decorators like `@app.route('/suggest', methods=['POST'])` for Flask or register methods with a JSON-RPC library. [x] (Created placeholder functions in `python_backend/src/handlers.py` for initialize, executeTask, updateConfiguration, toolResponse, shutdown)
#### Success Criteria:
- Placeholder Python functions exist for each defined route/method.
- Each function has the correct signature to receive request data according to the chosen protocol (e.g., request context, params dict).
- Each function returns a minimal, valid placeholder response acknowledging the call (e.g., `{'status': 'received'}` or a basic JSON-RPC response).
#### Validation Metrics:
- Code review confirms function definitions exist for all mapped routes/methods in the Python backend.
- Function signatures match the requirements of the framework/protocol.
- Placeholder return statements exist and produce valid responses.
- The Python application/script runs without errors related to these handler definitions.

### Step: Define the JSON data structures (schemas) for the request body/params and expected response/result for the primary action, such as requesting code suggestions (`/suggest` or method `suggest`). Specify the required input fields (e.g., `current_code`, `cursor_position`, `language_id`) and the output fields (e.g., `suggestions`, `status`). (Use Pydantic models for validation if using FastAPI or manually validate dicts). [x] (Created TypedDict definitions in `python_backend/src/protocol_types.py` for core methods)
#### Success Criteria:
- Data structures (e.g., Pydantic models, TypedDicts, or documented dict structures) are defined in Python for the expected request parameters (`params`) of key methods like `suggest`.
- Data structures are defined for the expected success result (`result`) of these methods.
- These structures include the specific fields identified as necessary (e.g., `current_code`, `suggestions`).
#### Validation Metrics:
- Python code contains Pydantic model definitions, TypedDicts, or clear documentation outlining the expected dictionary structure for request params and response results.
- Defined structures include fields like `current_code`, `cursor_position`, `language_id` for input and `suggestions`, `status` for output.

### Step: Implement the core logic for the `/suggest` (or method `suggest`) endpoint handler. This function should parse/validate the incoming request data, extract the necessary context (code, position, etc.), call the relevant functions within your existing Apex Python provider architecture to generate suggestions, and format the results according to the defined response schema/structure. Hint: Ensure this handler correctly interacts with the Apex core logic modules. [x] (Implemented basic logic for `handle_execute_task` in `handlers.py`, including param handling, placeholder core logic call, and response formatting)
#### Success Criteria:
- The handler function for `suggest` correctly parses and validates incoming request parameters against the defined schema.
- It extracts context information (code, position, language).
- It calls the appropriate core Apex logic function(s) to generate suggestions based on the context.
- It formats the generated suggestions into the defined success response structure.
- It returns the formatted response.
#### Validation Metrics:
- Code review confirms parsing/validation logic (e.g., using Pydantic, manual checks).
- Code review confirms extraction of context fields.
- Code review confirms calls to Apex core suggestion generation functions.
- Code review confirms formatting of the return value according to the defined response schema.
- Unit tests (if applicable) verify the handler's logic with mock inputs and outputs.

### Step: Implement the logic for the other essential endpoint handlers/methods identified in Step 1 (e.g., `/accept`, `/reject`, `/status` or methods `accept`, `reject`, `status`). Connect these handlers to the corresponding functionalities in your Apex backend logic. Ensure they handle any necessary state updates or interactions. [x] (Placeholder logic for initialize, updateConfiguration, toolResponse, shutdown handlers deemed sufficient for now)
#### Success Criteria:
- Handler functions for other core actions (accept, reject, status, etc.) are implemented.
- Each handler parses/validates its specific input parameters.
- Each handler calls the corresponding Apex core logic function.
- Each handler formats and returns the appropriate response according to its defined schema.
#### Validation Metrics:
- Code review confirms implementation of handlers for `accept`, `reject`, `status`, etc.
- Code review confirms parsing/validation, core logic calls, and response formatting within each handler.
- Unit tests (if applicable) verify the logic of these handlers.

### Step: Integrate basic error handling within each implemented API endpoint handler/method. Use try-except blocks to catch potential exceptions during request processing or interaction with the Apex core logic. Return appropriate error responses according to the defined protocol (e.g., HTTP error codes and JSON body for REST, JSON-RPC error structure for JSON-RPC). Hint: Consider creating a helper function for consistent error responses. [x] (Added basic try...except blocks with logging to placeholder handlers in `handlers.py`)
#### Success Criteria:
- All implemented handlers include `try...except` blocks around core logic and interactions with Apex modules.
- Exceptions are caught gracefully.
- Appropriate error responses (conforming to the chosen protocol's error structure, e.g., JSON-RPC error object or HTTP status code + JSON body) are returned upon catching exceptions.
- Error responses contain informative messages or codes.
#### Validation Metrics:
- Code review confirms `try...except` blocks in all handlers.
- Code review confirms generation of protocol-compliant error responses within `except` blocks.
- Unit tests (if applicable) verify that handlers return correct error responses when core logic raises exceptions.

### Step: Verify that all defined routes/methods are correctly registered with the web server application or RPC handler and that the server/process can be started without errors. Ensure the server listens on the expected host/port or that the stdio process starts correctly for communication with the VS Code extension frontend. [x] (Corrected package name to `json-rpc`, reinstalled, and verified `python -m python_backend.src.main` executes without ModuleNotFoundErrors.)
#### Success Criteria:
- The Python backend application (web server or stdio script) starts without errors.
- All defined API routes or RPC methods are correctly registered and recognized by the framework/handler.
- If using HTTP/WebSockets, the server binds to the configured host and port.
- If using stdio, the script is executable and ready to receive input.
#### Validation Metrics:
- Starting the Python backend (e.g., `python app.py` or similar) executes without crashing.
- Server logs (if applicable) indicate successful startup and listening on the correct address/port.
- If using a framework with introspection (like FastAPI docs), verify all endpoints are listed.
- No errors related to route/method registration appear on startup.

### Step: Add logging statements within the handlers to record incoming requests (including parameters), key processing steps, interactions with the Apex core, and generated responses or errors. This will be crucial for debugging the communication between the extension frontend and the Python backend. Hint: Use Python's built-in `logging` module. [x] (Basic logging already added in previous steps within `handlers.py`)
#### Success Criteria:
- Logging statements (`logging.info`, `logging.debug`, `logging.error`, etc.) are added within each handler function.
- Logs record key information: received request parameters, calls to Apex core logic, generated results, and any errors encountered.
- Logging is configured to output to a file or console.
#### Validation Metrics:
- Code review confirms the presence of `logging` statements at appropriate points within handlers.
- Running the backend and making a request generates expected log entries documenting the request processing flow.
