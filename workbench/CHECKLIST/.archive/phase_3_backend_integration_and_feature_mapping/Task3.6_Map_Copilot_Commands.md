# Phase 3: Backend Integration and Feature Mapping

**Goal:** Integrate the Apex panel UI with the Python backend by defining and implementing a communication protocol, connecting UI actions and mapped Copilot features (commands, menus, shortcuts) to backend logic, and ensuring necessary editor context is captured and passed.

---

## Task 3.6: Identify key Copilot panel commands (e.g., chat submit, explain code) and implement corresponding command handlers in the extension that invoke the Apex backend. [ ]

### Step: Research and identify the specific VS Code command IDs used by the GitHub Copilot extension for its primary panel/chat actions. Focus on commands like submitting a chat message, explaining selected code, generating documentation, and potentially clearing the chat. Hints: Re-examine the Copilot `package.json` (`contributes.commands`), search online documentation/forums for 'GitHub Copilot VS Code command IDs', or infer from typical chat interface actions. List the identified command IDs. [ ]
#### Success Criteria:
- A list of relevant VS Code command IDs used by the GitHub Copilot panel is compiled.
#### Validation Metrics:
- Documented list contains command IDs like `github.copilot.submitChat`, `github.copilot.explainSelection` (examples, actual IDs need verification).
- Evidence of research (e.g., notes from `package.json` inspection, links to online resources) supports the identified IDs.

### Step: Map the identified Copilot command IDs to the corresponding functionalities provided by your Apex Python backend. Define the specific function or API endpoint in the Apex backend that should be called for each command (e.g., `apex_backend.handle_chat_message(text)`, `apex_backend.explain_code(code_snippet)`). Document this mapping. [ ]
#### Success Criteria:
- A clear mapping exists between each identified Copilot command ID and a specific Apex backend function/method/endpoint.
#### Validation Metrics:
- A documented table or list shows each Copilot command ID alongside the corresponding Apex backend target function/endpoint name.

### Step: In your extension's main activation file (e.g., `extension.ts`), use `vscode.commands.registerCommand` to register handlers for each of the identified Copilot command IDs you intend to intercept. Create placeholder functions for now. Ensure these commands are added to the `context.subscriptions` array for proper disposal. Hint: The command ID string used in `registerCommand` must exactly match the Copilot command ID you want to intercept. [ ]
#### Success Criteria:
- `vscode.commands.registerCommand` is called for each identified Copilot command ID within the `activate` function.
- The command ID string used exactly matches the target Copilot command ID.
- Placeholder handler functions (e.g., logging functions) are provided initially.
- The returned disposables are added to `context.subscriptions`.
#### Validation Metrics:
- Code review confirms `registerCommand` calls for all target IDs in `extension.ts`.
- Code review confirms exact match of command ID strings.
- Code review confirms placeholder logic (e.g., `console.log`).
- Code review confirms adding disposables to `context.subscriptions`.

### Step: Implement the command handler for chat submission. This handler should: 1. Receive the chat message text (likely passed from the webview panel via `webview.onDidReceiveMessage`). 2. Retrieve any relevant context (e.g., active editor content/selection if needed via `getEditorContext`). 3. Call the appropriate Apex backend function/API endpoint (identified in Step 2) using your established communication method. 4. Handle the response from the Apex backend. 5. Post the response back to the webview panel using `webview.postMessage` to update the UI. [ ]
#### Success Criteria:
- The handler function registered for the chat submission command ID implements the described logic.
- It correctly interfaces with the webview message handler (for input) and `getEditorContext` (if needed).
- It successfully calls the mapped Apex backend function via the established communication channel.
- It processes the backend response.
- It sends the processed result/error back to the webview using `postMessage`.
#### Validation Metrics:
- Code review confirms the handler implementation follows the 5 sub-steps.
- Testing confirms that submitting chat via the intercepted command triggers the full flow: context gathering -> backend call -> response handling -> webview update.

### Step: Implement the command handler for 'explain selected code'. This handler should: 1. Get the active text editor using `vscode.window.activeTextEditor`. 2. Get the selected text using `editor.document.getText(editor.selection)`. 3. If no text is selected, potentially show an error message or explain the entire file/function block. 4. Call the corresponding Apex backend function/API endpoint with the selected code. 5. Handle the explanation response from the backend. 6. Post the response back to the webview panel for display. [ ]
#### Success Criteria:
- The handler function registered for the 'explain code' command ID implements the described logic.
- It uses `vscode.window.activeTextEditor` and related APIs to get selected text.
- It handles the 'no selection' case appropriately.
- It calls the mapped Apex backend 'explain' function with the code.
- It processes the backend response.
- It sends the explanation back to the webview using `postMessage`.
#### Validation Metrics:
- Code review confirms the handler implementation follows the 6 sub-steps.
- Testing confirms selecting code and triggering the command results in an explanation appearing in the webview panel.
- Testing confirms appropriate behavior (e.g., error message) when no text is selected.

### Step: Implement handlers for any other core Copilot commands identified in Step 1 (e.g., 'generate docs', 'clear chat') following the pattern established in Steps 4 and 5: get necessary context (selection, editor state), call the mapped Apex backend function, handle the response, and update the webview UI. [ ]
#### Success Criteria:
- Command handlers are implemented for all other targeted Copilot command IDs.
- Each handler follows the established pattern: gather context, call backend, handle response, update webview.
#### Validation Metrics:
- Code review confirms handlers exist for remaining identified commands.
- Each handler implements the correct logic flow based on the command's purpose.
- Testing confirms each command triggers the expected end-to-end behavior.

### Step: Update your extension's `package.json` file. Add entries to the `contributes.commands` section for each command ID you registered in Step 3. Provide appropriate `title` attributes (e.g., "Apex: Submit Chat Message", "Apex: Explain Selection") so they can appear in the Command Palette. Hint: While you are intercepting Copilot's command IDs, giving them your own titles in the `contributes.commands` section is good practice, though the ID itself is the crucial part for interception. [ ]
#### Success Criteria:
- The `contributes.commands` section in `package.json` includes entries for all intercepted/registered command IDs.
- Each entry has a descriptive `title` attribute.
#### Validation Metrics:
- Code review confirms `contributes.commands` in `package.json` lists all relevant command IDs.
- Each listed command has a `title`.
- Running the extension shows these titles in the Command Palette when searching.

### Step: Test the command handlers thoroughly. Trigger commands using the UI elements in your panel (e.g., submit button, context menu items added previously) and also try triggering them via the VS Code Command Palette (using the titles defined in Step 7). Verify: a) Correct data is sent to the Apex backend. b) The backend processes the request successfully. c) The response is correctly displayed in the panel UI. Debug communication issues between the extension (TypeScript) and the backend (Python). [ ]
#### Success Criteria:
- All implemented command handlers function correctly when triggered via UI or Command Palette.
- Data flow (Context -> Backend -> UI) is accurate for each command.
- Backend processing completes successfully for valid inputs.
- UI updates correctly display results or handle errors.
#### Validation Metrics:
- Execute each command via both UI interaction and Command Palette.
- Verify backend logs show correct data received.
- Verify Apex panel UI displays the expected result.
- Verify error conditions are handled gracefully (e.g., error message in UI).
- Use debugger/logs to trace data flow and identify issues.