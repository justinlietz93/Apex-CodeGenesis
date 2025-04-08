# Phase 3: Backend Integration and Feature Mapping

**Goal:** Integrate the Apex panel UI with the Python backend by defining and implementing a communication protocol, connecting UI actions and mapped Copilot features (commands, menus, shortcuts) to backend logic, and ensuring necessary editor context is captured and passed.

---

## Task 3.8: Define and register keyboard shortcuts in the extension's `package.json` that mirror Copilot's panel-related shortcuts, mapping them to Apex actions. [ ]

### Step: Research and identify the default keyboard shortcuts specifically associated with the GitHub Copilot *panel* view. Focus on actions like focusing the panel, navigating within it, accepting suggestions presented *in the panel*, or triggering panel-specific actions. Document these keybindings and their associated Copilot commands or actions. Hint: Use the VS Code Keyboard Shortcuts UI (search for 'Copilot'), examine Copilot's documentation, or search online resources. [ ]
#### Success Criteria:
- A list of keyboard shortcuts used by the Copilot panel is created.
- For each shortcut, the corresponding Copilot command ID is identified.
#### Validation Metrics:
- Documented list contains key combinations (e.g., `ctrl+alt+]`) and associated Copilot command IDs.
- Research source (Keyboard Shortcuts UI, docs) is noted.

### Step: For each identified Copilot panel shortcut, determine the equivalent action that should occur within the Apex panel. Verify if a corresponding VS Code command already exists in the Apex extension's codebase (`extension.ts` or similar) and is registered in `package.json` under `contributes.commands`. If a command doesn't exist, define a new command ID for it. [ ]
#### Success Criteria:
- Each Copilot shortcut is mapped to an intended Apex action.
- A corresponding Apex command ID (existing or newly defined) is associated with each action.
#### Validation Metrics:
- A documented mapping exists: Copilot Shortcut -> Apex Action -> Apex Command ID.
- Code review confirms existing commands or notes new IDs to be created.

### Step: Register any new Apex command IDs identified in the previous step within the `contributes.commands` section of the Apex extension's `package.json`. Provide a descriptive `title` for each new command. If the command implementation doesn't exist yet in `extension.ts`, create placeholder functions registered with `vscode.commands.registerCommand` that log a message indicating the command was triggered. [ ]
#### Success Criteria:
- Any newly required Apex command IDs are added to `contributes.commands` in `package.json` with titles.
- Corresponding placeholder command handlers (logging) are registered in `extension.ts` using `vscode.commands.registerCommand` and added to subscriptions.
#### Validation Metrics:
- Code review confirms additions to `contributes.commands`.
- Code review confirms new `registerCommand` calls with placeholder logic in `extension.ts`.

### Step: Ensure a `contributes.keybindings` array exists in the Apex extension's `package.json`. If not, create it. [ ]
#### Success Criteria:
- The `package.json` file contains a top-level `contributes` object, which contains a `keybindings` key whose value is an array.
#### Validation Metrics:
- Code review confirms the structure `"contributes": { ..., "keybindings": [] }` exists in `package.json`.

### Step: Populate the `contributes.keybindings` array. For each identified Copilot panel shortcut and its corresponding Apex command (verified or created in previous steps), add a keybinding entry. Set the `key` property to the exact key combination used by Copilot. Set the `command` property to the relevant Apex command ID. [ ]
#### Success Criteria:
- The `contributes.keybindings` array contains objects defining the mirrored shortcuts.
- Each object has a `key` property matching the Copilot shortcut key combination.
- Each object has a `command` property set to the corresponding Apex command ID.
#### Validation Metrics:
- Code review confirms entries in the `keybindings` array.
- Each entry has `key` and `command` properties with values matching the mapping from Step 2.

### Step: For each keybinding entry added in the previous step, define the `when` context clause. This clause should precisely mirror the conditions under which the original Copilot shortcut is active. Use the Apex panel's view ID (e.g., `view == 'your.apex.panel.id'`) and potentially other relevant contexts (e.g., `editorTextFocus`, `inputFocus`, `viewItemFocus`). Hint: You might need to use VS Code's 'Developer: Inspect Context Keys' tool again while the Copilot panel (if temporarily re-enabled) or your Apex panel is focused to determine the correct context keys and values. [ ]
#### Success Criteria:
- Each keybinding entry in `contributes.keybindings` includes a `when` property.
- The `when` clause string accurately reflects the context needed for the shortcut (e.g., focus within the Apex panel view: `view == 'GitHub Copilot Suggestions'`).
- Contexts match those used by the original Copilot shortcuts where possible.
#### Validation Metrics:
- Code review confirms `when` properties exist for all relevant keybinding entries.
- The `when` clauses correctly reference the Apex view ID and other necessary context keys (verified via `Inspect Context Keys` or documentation).

### Step: Review the complete `contributes.keybindings` section in `package.json` to ensure all intended shortcuts are mapped correctly to Apex commands with appropriate `when` clauses, effectively mirroring the Copilot panel's keyboard interactions. [ ]
#### Success Criteria:
- The `contributes.keybindings` section accurately defines all targeted shortcuts.
- Mappings (`key` to `command`) are correct.
- Activation contexts (`when` clauses) are correct and precise.
#### Validation Metrics:
- Manual review of `contributes.keybindings` confirms correctness against the mapping and context research.
- Testing in the Extension Development Host shows shortcuts are active only in the intended contexts.