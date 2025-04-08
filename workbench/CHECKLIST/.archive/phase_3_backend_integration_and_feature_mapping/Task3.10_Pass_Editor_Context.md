# Phase 3: Backend Integration and Feature Mapping

**Goal:** Integrate the Apex panel UI with the Python backend by defining and implementing a communication protocol, connecting UI actions and mapped Copilot features (commands, menus, shortcuts) to backend logic, and ensuring necessary editor context is captured and passed.

---

## Task 3.10: Ensure necessary editor context (e.g., selected code, active file language) is captured and passed to the backend when required for Apex actions. [ ]

### Step: Identify all command handlers and webview message listeners within the extension's TypeScript code (likely in `extension.ts` and/or the webview panel provider file) that trigger Apex backend actions requiring information about the current editor state. List the specific actions/commands that need context like selected text, active file path, language ID, or cursor position. [ ]
#### Success Criteria:
- A list is created identifying which specific extension command handlers or webview message handlers require editor context.
- For each identified handler, the specific context needed (selection, path, language, position) is specified.
#### Validation Metrics:
- Documented list exists mapping commands/message types (e.g., `runApexQuery`, `explainSelection`) to required context fields (e.g., `filePath`, `languageId`, `selectedText`).

### Step: Create a new utility function, perhaps named `getEditorContext`, within your extension's TypeScript code (e.g., in a `utilities.ts` file or directly in `extension.ts`). This function should utilize the `vscode` API, specifically `vscode.window.activeTextEditor`, to access the currently active text editor. [ ]
#### Success Criteria:
- A function (e.g., `getEditorContext`) is defined in a suitable location (`utilities.ts` or `extension.ts`).
- The function uses `vscode.window.activeTextEditor`.
#### Validation Metrics:
- Code review confirms the function definition exists.
- Code review confirms usage of `vscode.window.activeTextEditor`.

### Step: Implement the `getEditorContext` function to safely retrieve the following information if an active editor exists: the selected text (`editor.document.getText(editor.selection)`), the full file path (`editor.document.uri.fsPath`), the language identifier (`editor.document.languageId`), and the cursor position (`editor.selection.active`). Ensure the function handles cases where `vscode.window.activeTextEditor` is undefined (no active editor) or where there's no selection, returning a consistent structure (e.g., an object with potentially null/undefined fields or default values). [ ]
#### Success Criteria:
- `getEditorContext` function retrieves selected text, file path, language ID, and cursor position when an active editor exists.
- The function handles the absence of an active editor gracefully (returns null/undefined or default object).
- The function handles the absence of a text selection gracefully (e.g., `selectedText` is empty string or null).
- The function returns a consistently structured object containing the context information.
#### Validation Metrics:
- Code review confirms retrieval of all specified context fields using correct VS Code APIs.
- Code review confirms handling of `undefined` `activeTextEditor`.
- Code review confirms handling of empty selection.
- Code review confirms a consistent return type/structure.
- Unit tests (if applicable) verify function behavior in different scenarios (editor open/closed, selection/no selection).

### Step: Refactor the command handlers identified in Step 1. Before initiating communication with the Python backend for context-dependent actions, call your new `getEditorContext` function. Modify the data payload being sent to the backend to include the retrieved context information. Hint: Define or update a TypeScript interface for the payload structure to ensure consistency. [ ]
#### Success Criteria:
- Relevant command handlers are modified to call `getEditorContext()`.
- The payload sent to the Python backend includes the context data returned by `getEditorContext()`.
- TypeScript interfaces for payloads are updated to include optional context fields.
#### Validation Metrics:
- Code review confirms `getEditorContext()` calls within relevant command handlers.
- Code review confirms context data is added to the backend request payload.
- Code review confirms payload interfaces include context fields (e.g., `filePath?: string`).

### Step: Refactor the webview message listeners identified in Step 1 that handle messages triggering context-dependent backend actions. When such a message is received from the webview, ensure the handler (running in the extension host process) calls `getEditorContext`. Modify the data payload being forwarded to the Python backend to include this context. Hint: Remember the webview cannot directly access the `vscode` API; the context must be gathered in the extension host. [ ]
#### Success Criteria:
- Relevant `onDidReceiveMessage` handlers (for messages from the webview that trigger context-dependent actions) are modified to call `getEditorContext()`.
- The payload forwarded to the Python backend includes the context data returned by `getEditorContext()`.
#### Validation Metrics:
- Code review confirms `getEditorContext()` calls within relevant `onDidReceiveMessage` cases.
- Code review confirms context data is added to the backend request payload initiated from these handlers.

### Step: Update any TypeScript interfaces or type definitions used for the communication messages between the extension (frontend/webview provider) and the Python backend. Add the new optional fields for editor context (e.g., `selectedText?: string`, `filePath?: string`, `languageId?: string`, `cursorPosition?: { line: number, character: number }`). Ensure these types are used consistently in the modified handlers. [ ]
#### Success Criteria:
- TypeScript interfaces/types defining the backend request payload structure are updated.
- Optional fields for `selectedText`, `filePath`, `languageId`, `cursorPosition` are added.
- Modified command handlers and message listeners use these updated types.
#### Validation Metrics:
- Code review confirms updated interface/type definitions including context fields.
- Code review confirms consistent usage of these updated types in handler functions and backend communication calls.
- TypeScript compilation succeeds without type errors.

### Step: Add temporary logging (`console.log`) within the modified command handlers and message listeners, just before sending data to the backend. Log the complete payload, including the gathered editor context. Manually test triggering the relevant actions (via commands, keyboard shortcuts, and panel UI interactions) under different conditions (no file open, file open with no selection, file open with selection, different file types) to verify the correct context is captured and included. [ ]
#### Success Criteria:
- Correct editor context (or lack thereof) is logged just before backend requests are sent for context-dependent actions.
- Logging confirms context is captured correctly in various scenarios (no editor, no selection, selection, different languages).
#### Validation Metrics:
- Add `console.log` before backend communication calls in modified handlers.
- Trigger actions manually in different editor states:
    - No file open: Verify logged context is null/default.
    - File open, no selection: Verify logged context includes path, language, position, but null/empty selection.
    - File open, with selection: Verify logged context includes selected text.
- Logged context values match the actual editor state.

### Step: Remove the temporary logging statements added in the previous step after confirming the context is being captured and passed correctly. [ ]
#### Success Criteria:
- Temporary `console.log` statements added specifically for verifying context capture are removed from the codebase.
#### Validation Metrics:
- Code review confirms removal of the temporary context logging statements.