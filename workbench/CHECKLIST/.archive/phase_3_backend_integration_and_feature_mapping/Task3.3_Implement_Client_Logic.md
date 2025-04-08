# Phase 3: Backend Integration and Feature Mapping

**Goal:** Integrate the Apex panel UI with the Python backend by defining and implementing a communication protocol, connecting UI actions and mapped Copilot features (commands, menus, shortcuts) to backend logic, and ensuring necessary editor context is captured and passed.

---

## Task 3.3: Implement the client-side logic within the VS Code extension to send requests and receive responses from the Python backend. [ ]

### Step: Open the JavaScript file responsible for your webview panel's frontend logic (e.g., `src/webview/main.js`). Identify the UI elements (buttons, input fields) that need to trigger backend requests. Implement functions for each trigger that gather the necessary data (e.g., input text) and use `vscode.postMessage({ command: 'yourCommandName', data: yourData })` to send the data to the extension host. Define distinct `command` names for different actions. [ ]
#### Success Criteria:
- Functions exist in the webview script (`main.js`) corresponding to user actions that require backend interaction.
- These functions gather relevant data from the UI (e.g., input value).
- These functions use `vscode.postMessage` to send messages to the extension host with distinct `command` names (e.g., `requestSuggestion`, `acceptSuggestion`) and the gathered `data`.
#### Validation Metrics:
- Code review confirms functions exist for triggering backend actions.
- Code review confirms data gathering from UI elements.
- Code review confirms `vscode.postMessage` calls with appropriate `command` and `data` structure within these functions.

### Step: Open your main extension file (e.g., `src/extension.ts`) or the file containing your `WebviewPanelProvider`. Locate the code where the webview panel is created and managed. Implement a message listener using `panel.webview.onDidReceiveMessage(message => { /* handler logic */ }, undefined, context.subscriptions);`. [ ]
#### Success Criteria:
- The `WebviewViewProvider` (or `WebviewPanelProvider`) class contains an implementation for `webview.onDidReceiveMessage`.
- The listener is correctly registered (e.g., within `resolveWebviewView`) and its disposable is added to `context.subscriptions`.
#### Validation Metrics:
- Code review confirms the `webview.onDidReceiveMessage((message) => { ... })` handler exists and is registered.
- Code review confirms the disposable is pushed to `context.subscriptions`.

### Step: Inside the `onDidReceiveMessage` handler in `extension.ts`, add a `switch` statement or `if/else if` block to check `message.command`. Log the received message and command to the console for debugging purposes (`console.log('Received message from webview:', message);`). [ ]
#### Success Criteria:
- The `onDidReceiveMessage` handler contains a `switch` or `if/else if` structure routing logic based on `message.command`.
- A `console.log` statement exists to output received messages for debugging.
#### Validation Metrics:
- Code review confirms the presence of conditional logic based on `message.command`.
- Code review confirms the `console.log` call.
- Triggering an action in the webview results in the corresponding message being logged in the Extension Host's Developer Tools console.

### Step: Install the `axios` library for making HTTP requests from the extension host. Run `npm install axios` in your extension's project directory. Import `axios` at the top of your `extension.ts` file: `import axios from 'axios';`. (If using stdio/JSON-RPC, install relevant libraries like `vscode-jsonrpc` instead). [ ]
#### Success Criteria:
- The necessary library for communicating with the Python backend (e.g., `axios` for HTTP, `vscode-jsonrpc` for JSON-RPC over stdio) is added as a dependency.
- The library is installed via npm/yarn.
- The library is imported correctly in the relevant TypeScript file(s) (e.g., `extension.ts` or a dedicated service file).
#### Validation Metrics:
- `package.json` lists the chosen communication library (e.g., `axios`, `vscode-jsonrpc`) in `dependencies`.
- `npm install` completes successfully.
- Code review confirms the `import` statement for the library exists in the relevant `.ts` file.

### Step: Define a constant or configuration variable for your Python backend base URL (e.g., `const BACKEND_URL = 'http://127.0.0.1:5000';`). Inside the `onDidReceiveMessage` handler, for a specific command received from the webview, construct the appropriate API endpoint path (e.g., `/generate`, `/explain`). Use `axios.post` or `axios.get` to make an asynchronous request to the constructed URL (e.g., `${BACKEND_URL}/generate`), sending `message.data` as the request body if applicable. Use `async/await` for handling the promise. (If using stdio/JSON-RPC, instead establish the connection and use the library's methods to send notifications or requests, e.g., `connection.sendRequest('suggest', message.data)`). [ ]
#### Success Criteria:
- Logic exists within the `onDidReceiveMessage` handler (or functions called by it) to initiate communication with the Python backend based on the received `message.command`.
- **If HTTP:** The backend URL is defined (ideally via config). `axios.post`/`get` is called with the correct URL and `message.data`. `async/await` is used.
- **If stdio/JSON-RPC:** The connection is established (likely earlier). The appropriate library method (e.g., `connection.sendRequest`, `connection.sendNotification`) is called with the correct method name (matching Python backend) and `message.data`.
#### Validation Metrics:
- Code review confirms communication initiation logic within the message handler.
- **If HTTP:** Code review confirms `axios` calls with correct URL construction and data passing. `async/await` is used.
- **If stdio/JSON-RPC:** Code review confirms calls to the JSON-RPC library's request/notification sending methods with correct parameters.

### Step: Implement `try...catch` blocks around your `axios` calls in `extension.ts` to handle potential network errors or errors returned from the Python backend (e.g., non-2xx status codes). Log any caught errors. (If using stdio/JSON-RPC, handle potential connection errors or error responses according to the library's error handling mechanism). [ ]
#### Success Criteria:
- Code making calls to the Python backend is wrapped in appropriate error handling blocks (`try...catch` for `axios`, specific error handlers for JSON-RPC library).
- Potential communication errors (network issues, connection drops, backend crashes) and application-level errors (non-2xx status, JSON-RPC error responses) are caught.
- Caught errors are logged.
#### Validation Metrics:
- Code review confirms `try...catch` around `axios` calls or usage of error handlers for the chosen communication library.
- Error handling logic exists for both communication-level and application-level errors.
- Code review confirms logging of caught errors.

### Step: Upon receiving a successful response from the Python backend via `axios` (or the JSON-RPC library), use `panel.webview.postMessage({ command: 'backendResponse', data: response.data });` to send the result back to the webview. If an error occurred (caught in `try...catch` or received as an error response), send an appropriate error message back, e.g., `panel.webview.postMessage({ command: 'backendError', error: 'Failed to communicate with backend.' });`. [ ]
#### Success Criteria:
- After successfully receiving data from the backend, `panel.webview.postMessage` is called with a specific command (e.g., `backendResponse`) and the received `data`.
- If an error occurred during backend communication or an error response was received, `panel.webview.postMessage` is called with a different command (e.g., `backendError`) and relevant error details.
- Messages sent conform to the defined `WebviewMessage` structure.
#### Validation Metrics:
- Code review confirms `postMessage` calls within the success path of the backend communication logic, sending data back to the webview.
- Code review confirms `postMessage` calls within the error handling path, sending error details back to the webview.
- The structure of messages sent via `postMessage` matches the defined types.

### Step: Return to the webview's JavaScript file (`src/webview/main.js`). Add an event listener to handle messages coming *from* the extension host: `window.addEventListener('message', event => { const message = event.data; switch (message.command) { case 'backendResponse': /* handle success */ break; case 'backendError': /* handle error */ break; } });`. [ ]
#### Success Criteria:
- The webview script (`main.js`) contains a `window.addEventListener('message', ...)` handler.
- The handler includes logic (e.g., `switch` statement) to differentiate between messages like `backendResponse` and `backendError`.
#### Validation Metrics:
- Code review confirms the `addEventListener` setup in `main.js`.
- Code review confirms the `switch` or `if/else` block checking `message.command` for `backendResponse` and `backendError`.

### Step: Implement the logic within the `backendResponse` case in `main.js` to update the webview UI with the data received from the backend (e.g., display generated text, update status). Implement the logic within the `backendError` case to display an error notification or message to the user within the webview panel. [ ]
#### Success Criteria:
- JavaScript code within the `case 'backendResponse':` block updates the relevant DOM elements to display the received data (`message.data`).
- JavaScript code within the `case 'backendError':` block updates the DOM to display the received error message (`message.error`).
#### Validation Metrics:
- Code review confirms DOM manipulation logic inside the `backendResponse` case (e.g., updating text content, appending elements).
- Code review confirms DOM manipulation logic inside the `backendError` case (e.g., displaying an error div).
- Testing with mock messages confirms UI updates correctly for both success and error cases.

### Step: Refactor the hardcoded `BACKEND_URL` in `extension.ts`. Use the VS Code configuration API (`vscode.workspace.getConfiguration`) to read the backend URL from a setting (e.g., `apex.backend.url`). Add a default value if the setting is not configured. Update your `package.json` to contribute this configuration setting. (If using stdio, make the Python executable path configurable instead). [ ]
#### Success Criteria:
- **If HTTP:** The backend URL is no longer hardcoded; it's read from VS Code configuration using `vscode.workspace.getConfiguration('apex').get('backend.url')`. A default URL is provided.
- **If stdio:** The path to the Python executable/script is read from configuration (e.g., `apex.backend.pythonPath`). A default path is provided.
- `package.json` includes a `contributes.configuration` section defining the setting (`apex.backend.url` or `apex.backend.pythonPath`) with a `type` and `default` value.
#### Validation Metrics:
- Code review confirms usage of `vscode.workspace.getConfiguration` to get the URL/path.
- Code review confirms a default value is used if the setting is undefined.
- Code review confirms the `contributes.configuration` section in `package.json` defines the setting correctly.
- Changing the setting in VS Code settings UI and reloading affects the URL/path used by the extension.