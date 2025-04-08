# Phase 3: Backend Integration and Feature Mapping

**Goal:** Integrate the Apex panel UI with the Python backend by defining and implementing a communication protocol, connecting UI actions and mapped Copilot features (commands, menus, shortcuts) to backend logic, and ensuring necessary editor context is captured and passed.

---

## Task 3.7: Replicate relevant Copilot context menu entries related to the panel, linking them to the appropriate Apex backend functions. [ ]

### Step: Identify the specific context menu commands contributed by the GitHub Copilot extension that appear when interacting with its panel view (identified in Step 1 of the high-level plan). Inspect the Copilot extension's `package.json` (specifically the `contributes.menus` and `contributes.commands` sections) or use VS Code's Developer tools while interacting with the Copilot panel in a separate instance to list these commands, their IDs, and their associated menu locations (e.g., `view/item/context`, `view/title/context`). Focus only on commands relevant to the panel's functionality (e.g., actions on suggestions, history management, not general editor commands). [ ]
#### Success Criteria:
- A list of Copilot's panel-specific context menu command IDs is created.
- The menu location (e.g., `view/item/context`) for each command is identified.
#### Validation Metrics:
- Documented list contains command IDs and menu locations obtained from inspecting Copilot's `package.json` or Dev Tools.
- The list focuses only on panel-relevant actions.

### Step: Based on the identified Copilot context menu commands, define equivalent command IDs and user-facing titles for your Apex extension in the `contributes.commands` section of your extension's `package.json`. Choose clear and descriptive IDs (e.g., `apex.panel.copySuggestion`, `apex.panel.clearHistory`). [ ]
#### Success Criteria:
- New command entries are added to `contributes.commands` in `package.json` for each context menu action to be replicated.
- Each entry has a unique `command` ID (e.g., `apex.panel.copySuggestion`) and a user-friendly `title`.
#### Validation Metrics:
- Code review confirms new entries in `contributes.commands`.
- Each entry has `command` and `title` properties.

### Step: In your main extension file (e.g., `extension.ts`), register command handlers for each new command defined in the previous step using `vscode.commands.registerCommand`. Implement placeholder handlers for now that log a message indicating the command was triggered (e.g., `console.log('Apex command triggered:', commandId)`). Ensure these registrations occur within the `activate` function. [ ]
#### Success Criteria:
- `vscode.commands.registerCommand` is called in `extension.ts` for each new command ID defined in Step 2.
- Placeholder handler functions (logging) are provided.
- Disposables are added to `context.subscriptions`.
#### Validation Metrics:
- Code review confirms `registerCommand` calls for the new context menu command IDs.
- Code review confirms placeholder logging logic.
- Code review confirms adding disposables to `context.subscriptions`.

### Step: In your extension's `package.json`, add entries to the `contributes.menus` section to make your new commands appear in the context menu of your panel view. Use the same menu location(s) identified in Step 1 (e.g., `view/item/context`). Ensure each menu item entry includes the `command` ID and a `when` clause targeting your panel's view ID (e.g., `when: "view == 'your.apex.panel.id'"`). If the context menu applies to specific items within the panel, refine the `when` clause accordingly (e.g., `when: "view == 'your.apex.panel.id' && viewItem == 'apexSuggestion'"`, adapting `apexSuggestion` based on your view item context value). [ ]
#### Success Criteria:
- The `contributes.menus` section in `package.json` defines menu items for the new commands.
- Each menu item specifies the correct `command` ID (defined in Step 2).
- Each menu item targets the correct menu location (identified in Step 1, e.g., `view/item/context`).
- Each menu item has an appropriate `when` clause referencing the Apex panel's view ID and potentially `viewItem` context.
#### Validation Metrics:
- Code review confirms entries in `contributes.menus`.
- Each entry has `command` and `when` properties.
- The `when` clause correctly targets the Apex view ID (e.g., `view == 'GitHub Copilot Suggestions'`).
- Running the extension shows the new menu items appearing in the correct context menu within the Apex panel.

### Step: Update the command handlers implemented in Step 3. Replace the placeholder logging with logic that communicates with your Apex Python backend. Invoke the appropriate backend function corresponding to the triggered context menu action. Utilize the established communication channel (e.g., sending a JSON message via stdio, making an HTTP request) to pass necessary information (like the command type and any relevant context from the UI/panel) to the Python process. Handle any necessary responses or confirmations from the backend. [ ]
#### Success Criteria:
- Placeholder logic in the command handlers (registered in Step 3) is replaced with actual implementation.
- The implementation uses the established communication channel to call the appropriate Apex backend function mapped to the context menu action.
- Relevant context (if needed, e.g., data associated with the specific UI item clicked) is gathered and passed to the backend.
- Backend responses are handled (e.g., results posted back to webview if needed).
#### Validation Metrics:
- Code review confirms placeholder logic is replaced with backend communication calls.
- Code review confirms correct backend function is targeted.
- Code review confirms context data is passed if required.
- Testing confirms clicking the context menu item triggers the backend call and handles the response.

### Step: Map the specific functionality of each replicated Copilot context menu command to the corresponding Apex backend action. For example, if replicating a 'Copy Suggestion' command, ensure the handler retrieves the relevant suggestion text from the panel/webview context and sends it to a backend function designed to handle copying or processing that text. If replicating 'Clear History', ensure it triggers the backend function responsible for clearing Apex's interaction history for the panel. [ ]
#### Success Criteria:
- The implementation of each context menu command handler correctly performs the action intended for that menu item.
- **Copy Suggestion:** Handler gets suggestion text (likely needs data passed from webview context menu invocation) and potentially uses `vscode.env.clipboard.writeText`.
- **Clear History:** Handler sends a command to the backend (via communication channel) to clear history state.
- Other commands are similarly mapped and implemented.
#### Validation Metrics:
- Code review confirms the logic within each handler matches its intended functionality.
- Testing 'Copy Suggestion' results in the correct text being copied to the clipboard.
- Testing 'Clear History' results in the panel's history being cleared (requires backend implementation and webview update).

### Step: Thoroughly test the new context menu items within your Apex panel. Verify that: a) The items appear in the correct context menu location(s). b) Clicking each item triggers the corresponding command handler. c) The handler correctly communicates with the Apex backend. d) The backend performs the expected action. e) Test with various panel states and item contexts if applicable. [ ]
#### Success Criteria:
- Context menu items appear correctly in the UI.
- Clicking items triggers the associated command handlers.
- Backend communication is successful.
- The intended action (copying, clearing history, etc.) is performed correctly.
- Behavior is correct across different panel states (e.g., clicking copy on different suggestions).
#### Validation Metrics:
- Visual inspection confirms menu items appear in the right place/context.
- Verify logs/debugger show command handlers being executed on click.
- Verify backend logs show requests being received.
- Verify the functional outcome of the action (clipboard content, history cleared, etc.).
- Test edge cases (e.g., clear empty history, copy non-existent item).