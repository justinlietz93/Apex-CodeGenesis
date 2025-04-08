# Phase 3: Backend Integration and Feature Mapping

**Goal:** Integrate the Apex panel UI with the Python backend by defining and implementing a communication protocol, connecting UI actions and mapped Copilot features (commands, menus, shortcuts) to backend logic, and ensuring necessary editor context is captured and passed.

---

## Task 3.4: Connect UI actions in the Apex panel (e.g., button clicks, text input submission) to trigger calls to the backend API. [ ]

### Step: In the webview's JavaScript file (`panel.js` or similar), identify all interactive UI elements (buttons, input fields, etc.) that should trigger backend actions. For each element, add an appropriate event listener (e.g., `addEventListener('click', ...)` for buttons, `addEventListener('submit', ...)` for forms or specific key presses for input fields). [ ]
#### Success Criteria:
- Event listeners (`click`, `keydown`, `submit`, etc.) are attached to all relevant interactive UI elements in the webview.
#### Validation Metrics:
- Code review confirms `addEventListener` calls for buttons, input fields, etc., in the webview's JavaScript.
- Interacting with these UI elements in the running extension triggers the attached listener functions (verifiable with temporary logging).

### Step: Within each event listener created in the previous step, prevent default browser actions if necessary (e.g., `event.preventDefault()` for form submissions). Then, acquire the `vscode` API object (using `acquireVsCodeApi()`). Use `vscode.postMessage()` to send a message to the extension host. Structure the message clearly, including a `command` identifier (e.g., 'runApexQuery', 'clearHistory') and any necessary `payload` (e.g., the text from an input field). [ ]
#### Success Criteria:
- Event listeners call `event.preventDefault()` where appropriate.
- Event listeners retrieve data from the UI (e.g., input value).
- Event listeners call `vscode.postMessage` with a structured message containing a `command` and relevant `payload`.
#### Validation Metrics:
- Code review confirms `preventDefault` calls.
- Code review confirms data retrieval from UI elements.
- Code review confirms `vscode.postMessage` calls with correct structure within listeners.
- Triggering UI actions results in messages being sent (verifiable via logging in the extension host).

### Step: In your extension's TypeScript/JavaScript file where the webview panel provider is defined (e.g., `apexPanelViewProvider.ts`), locate or implement the `webview.onDidReceiveMessage` listener within the `resolveWebviewView` method. [ ]
#### Success Criteria:
- The `webview.onDidReceiveMessage` listener is correctly implemented and registered within the `WebviewViewProvider`'s `resolveWebviewView` method.
#### Validation Metrics:
- Code review confirms the presence and correct registration of the `onDidReceiveMessage` handler.

### Step: Inside the `onDidReceiveMessage` listener, add a `switch` statement or `if/else` block to handle incoming messages based on the `message.command` property you defined in Step 2. Log the received message for debugging purposes. [ ]
#### Success Criteria:
- The `onDidReceiveMessage` handler contains conditional logic (switch/if) that routes execution based on `message.command`.
- Logging is implemented to show received messages.
#### Validation Metrics:
- Code review confirms the switch/if structure handling different commands.
- Code review confirms logging calls.
- Messages sent from the webview are correctly logged in the Extension Host console with their commands.

### Step: For each relevant `command` identified in the message handler, implement the logic to call the corresponding Python backend API function/endpoint. Use the previously established method for Node.js-Python communication (e.g., `child_process.spawn`, HTTP request via `axios`, JSON-RPC library). Ensure you pass the `message.payload` (e.g., user input text) to the Python backend correctly. [ ]
#### Success Criteria:
- Within the conditional blocks for relevant commands (e.g., `case 'runApexQuery':`), code is added to initiate communication with the Python backend using the chosen method.
- The correct backend method/endpoint is targeted based on the command.
- Data from `message.payload` is correctly formatted and passed to the backend communication call.
#### Validation Metrics:
- Code review confirms backend communication calls (`axios.post`, `connection.sendRequest`, etc.) within the appropriate command handlers.
- Code review confirms `message.payload` data is included in the backend request.
- Triggering a UI action results in a corresponding request being received by the Python backend (verifiable via backend logs).

### Step: Implement logic to capture and process the response (stdout/response data) and potential errors (stderr/error response) from the Python backend process or API call. Assume the Python backend returns results in a structured format (e.g., JSON). Parse the response. [ ]
#### Success Criteria:
- Code exists (e.g., in `async/await` block for `axios` or callback/promise handlers for stdio/RPC) to handle the data returned by the Python backend.
- Logic correctly parses the expected structured response format (e.g., `JSON.parse`).
- Error conditions (stderr output, non-200 HTTP status, RPC error objects) are detected and handled separately from successful responses.
#### Validation Metrics:
- Code review confirms handling of success responses (e.g., processing `response.data` from axios).
- Code review confirms parsing logic (e.g., `JSON.parse`).
- Code review confirms error handling logic (e.g., `catch` block, checking `stderr`, checking RPC error field).

### Step: After receiving and parsing the response from the Python backend, use `webview.postMessage()` within the extension host (inside the `onDidReceiveMessage` handler or its subsequent promise/callback) to send the results (or error details) back to the webview. Define distinct message types or structures for successful results vs. errors (e.g., `{ type: 'apexResult', data: ... }`, `{ type: 'apexError', message: ... }`). [ ]
#### Success Criteria:
- Upon successful backend response processing, `webview.postMessage` is called with a success message structure (e.g., `{ type: 'apexResult', data: ... }`) containing the parsed data.
- Upon detecting a backend error, `webview.postMessage` is called with an error message structure (e.g., `{ type: 'apexError', message: ... }`) containing error details.
#### Validation Metrics:
- Code review confirms `webview.postMessage` calls in both success and error paths of backend communication handling.
- Code review confirms distinct message structures are used for success vs. error.
- Testing confirms messages are sent back to the webview in both scenarios (verifiable via webview console logging).

### Step: Return to the webview's JavaScript file (`panel.js`). Implement a message listener using `window.addEventListener('message', event => { ... })` to receive messages sent *from* the extension host. [ ]
#### Success Criteria:
- The webview's JavaScript contains a `window.addEventListener('message', ...)` handler.
#### Validation Metrics:
- Code review confirms the presence of the message event listener in the webview script.

### Step: Inside the webview's message listener, process the incoming `event.data`. Use a `switch` or `if/else` based on the message `type` (e.g., 'apexResult', 'apexError') you defined in Step 7. Update the webview's DOM to display the results or show error messages accordingly. Consider adding loading indicators triggered before sending the message in Step 2 and removed upon receiving a response here. [ ]
#### Success Criteria:
- The webview's message listener handles incoming messages based on their `type` or `command` (e.g., `apexResult`, `apexError`).
- Logic within the success case updates the UI to display the received results (`event.data.data`).
- Logic within the error case updates the UI to display the received error message (`event.data.message`).
- (Optional) Logic exists to show a loading indicator when a request is sent (Step 2) and hide it when a response (`apexResult` or `apexError`) is received here.
#### Validation Metrics:
- Code review confirms conditional logic handling `apexResult` and `apexError` messages.
- Code review confirms DOM updates within each case to display data or errors.
- (Optional) Code review confirms logic for managing loading indicator visibility.
- Testing confirms UI updates correctly upon receiving mock success/error messages from the host.

### Step: Review and enhance error handling across the entire communication chain: Webview event listener -> Extension message handler -> Python backend call -> Extension response handler -> Webview message listener. Ensure errors from the Python backend are properly propagated and displayed to the user in the Apex panel. [ ]
#### Success Criteria:
- Errors originating from the Python backend (e.g., exceptions, RPC errors) are caught by the extension host.
- The extension host sends a specific error message back to the webview.
- The webview receives the error message and displays it appropriately to the user.
- Errors in other parts of the chain (e.g., webview sending, host receiving) are also handled gracefully (e.g., logged, potentially user notification).
#### Validation Metrics:
- Induce an error in the Python backend (e.g., raise an exception). Verify the error message is displayed in the Apex panel UI.
- Simulate network/connection errors. Verify appropriate feedback (e.g., error message, logged error).
- Code review confirms error handling exists at each stage of the communication flow.

### Step: Test the complete flow thoroughly by interacting with the UI elements in the Apex panel. Verify that actions trigger the correct backend calls, results are displayed correctly, and errors are handled gracefully. Use VS Code's Developer Tools (for the webview) and Debug Console/Output Channel (for the extension host) to diagnose issues. [ ]
#### Success Criteria:
- End-to-end user actions (e.g., typing prompt, clicking send) result in the correct backend action being invoked.
- Successful backend responses are correctly rendered in the Apex panel UI.
- Backend errors result in user-friendly error messages displayed in the Apex panel UI.
- The system behaves reliably under normal usage.
#### Validation Metrics:
- Perform a standard user workflow (e.g., ask a question). Verify the expected response appears in the UI.
- Trigger an action known to cause a backend error. Verify an error message appears in the UI.
- Check Extension Host logs/console and Webview console for any unexpected errors during the workflow.