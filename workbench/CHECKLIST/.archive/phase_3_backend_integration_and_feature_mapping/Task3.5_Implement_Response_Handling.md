# Phase 3: Backend Integration and Feature Mapping

**Goal:** Integrate the Apex panel UI with the Python backend by defining and implementing a communication protocol, connecting UI actions and mapped Copilot features (commands, menus, shortcuts) to backend logic, and ensuring necessary editor context is captured and passed.

---

## Task 3.5: Implement logic in the panel's webview provider to process responses from the backend and update the UI accordingly (e.g., display results, show errors). [ ]

### Step: Locate the `ApexPanelProvider.ts` (or similarly named file managing the webview panel). Define a public method within the class, named `handleBackendResponse(data: any)`, responsible for receiving data originating from the Python backend. This method will serve as the entry point for processing backend results or errors within the provider. [ ]
#### Success Criteria:
- A method (e.g., `handleBackendResponse`) exists within the `WebviewViewProvider` class.
- Its purpose is to receive processed data/errors intended for the webview.
- This method will be called by the logic that handles the actual backend communication response.
#### Validation Metrics:
- Code review confirms the presence of the `handleBackendResponse(data: any)` method definition in the provider class.

### Step: Define a clear TypeScript interface or type alias for the message structure that will be sent *from* the provider *to* the webview's JavaScript using `postMessage`. This structure should accommodate different response types (e.g., results, errors, status updates). Example: `type WebviewMessage = { command: 'updateResults' | 'showError' | 'updateStatus'; payload: any; };` Adapt the specific commands and payload structure based on Apex's needs. [ ]
#### Success Criteria:
- A TypeScript type/interface (e.g., `WebviewMessage`) exists, defining the structure of messages sent from the provider to the webview.
- The structure includes a `command` or `type` field to distinguish message purposes (e.g., `updateResults`, `showError`).
- It includes a `payload` field to carry the relevant data or error information.
#### Validation Metrics:
- Code review confirms the existence of the `WebviewMessage` type definition.
- The definition includes `command`/`type` and `payload` fields with appropriate types.

### Step: Implement the logic within the `handleBackendResponse(data: any)` method. This logic should parse the incoming `data`, determine the nature of the response (e.g., success with results, error message, status change), and construct a message object conforming to the `WebviewMessage` structure defined in the previous step. [ ]
#### Success Criteria:
- The `handleBackendResponse` method contains logic to inspect the input `data`.
- It determines if the data represents a success, error, or status update.
- It constructs a `WebviewMessage` object with the appropriate `command` (e.g., `updateResults`, `showError`) and `payload` based on the input `data`.
#### Validation Metrics:
- Code review confirms conditional logic within `handleBackendResponse` to differentiate response types.
- Code review confirms construction of `WebviewMessage` objects with correct `command` and `payload` assignments.

### Step: Inside `handleBackendResponse`, after constructing the message object, use the `this._view?.webview.postMessage(message)` method to send the formatted message to the webview. Ensure you handle the case where `this._view` might be undefined (panel not visible or disposed) to prevent errors. Hint: Add a null check: `if (this._view) { this._view.webview.postMessage(message); }`. [ ]
#### Success Criteria:
- The `handleBackendResponse` method calls `this._view.webview.postMessage` with the constructed `WebviewMessage` object.
- A check (`if (this._view)`) prevents calling `postMessage` if the view is not available.
#### Validation Metrics:
- Code review confirms the `postMessage` call within `handleBackendResponse`.
- Code review confirms the presence of a null/undefined check for `this._view` before calling `postMessage`.

### Step: Enhance the `handleBackendResponse` method with robust error handling. If the incoming `data` represents an error from the backend, ensure an appropriate `WebviewMessage` with `command: 'showError'` (or similar) and a user-friendly error message in the `payload` is created and sent to the webview. Also, wrap the `postMessage` call in a try/catch block to handle potential errors during message passing. [ ]
#### Success Criteria:
- The logic in `handleBackendResponse` correctly identifies backend errors within the `data`.
- When an error is identified, it constructs a `WebviewMessage` with `command: 'showError'` and a suitable error payload.
- The `postMessage` call itself is wrapped in a `try...catch` block to handle potential exceptions during the send operation.
#### Validation Metrics:
- Code review confirms logic to detect errors in `data` and construct the 'showError' message.
- Code review confirms `try...catch` block around the `postMessage` call.

### Step: Integrate logging within the `handleBackendResponse` method using `console.log` or VS Code's `OutputChannel` API. Log the received backend data and the message being posted to the webview. This will be crucial for debugging the communication flow. [ ]
#### Success Criteria:
- Logging statements are added within `handleBackendResponse`.
- Logs capture the raw data received (`data` parameter) and the structured message being sent to the webview (`WebviewMessage` object).
#### Validation Metrics:
- Code review confirms `console.log` or `OutputChannel.appendLine` calls within `handleBackendResponse`.
- Running the flow shows logs for both received backend data and the message posted to the webview.

### Step: Review the corresponding JavaScript file running inside the webview (e.g., `main.js`, `webview.js`). Ensure that the `window.addEventListener('message', event => { ... });` handler is implemented and correctly parses the incoming `event.data` based on the `WebviewMessage` structure defined in Step 2. Implement the necessary JavaScript logic to update the webview's DOM elements (display results, show errors, etc.) based on the received `command` and `payload`. [ ]
#### Success Criteria:
- The webview's message listener correctly handles messages with commands like `updateResults` and `showError`.
- It extracts the `payload` from the received message.
- It uses the `payload` data to update the appropriate DOM elements (displaying results in the output area, showing errors in the error display area).
#### Validation Metrics:
- Code review confirms the webview message listener handles `updateResults` and `showError` commands.
- Code review confirms extraction and use of `event.data.payload`.
- Code review confirms DOM manipulation logic to display results and errors.
- Testing confirms UI updates correctly when corresponding messages are received.