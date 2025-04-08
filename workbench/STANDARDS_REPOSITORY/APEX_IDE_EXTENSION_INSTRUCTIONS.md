Subject: [ACTION REQUIRED] Resolve Runtime Errors and Refactor Storage for Apex IDE Extension (justinlietz93.apex-ide-codegenesis)

## C. Directive Section
**Objective:** Resolve identified runtime errors, refactor data storage mechanisms, and ensure compliance for the `justinlietz93.apex-ide-codegenesis` VS Code extension located in the current workspace (`C:\git\CodeGen_IDE\codegenesis`).
**Execution Mode:** Fully Autonomous.
**Mandatory Standards:** All actions and deliverables MUST strictly adhere to the **Apex Software Compliance Standards Guide** located at `C:\git\CodeGen_IDE\STANDARDS_REPOSITORY\apex\STANDARDS.md`. Specific rules are referenced as `(Rule #X: CODE)`. This guide takes precedence.
**Sequential Execution:** Proceed strictly through Phases -> Tasks -> Steps in the order presented. Mark each item (`- [ ]`) as complete (`- [x]`) ONLY after successful execution AND verification according to its `Internal Success Criteria` and `Internal Verification Method`.
**Error Handling:** If verification fails at any Task, recursively retry the relevant Steps/Task, implement corrections, and re-verify until success before proceeding. Adherence to referenced `(Rule #X: CODE)` rules is part of verification.
**Reporting:** Internal logging ONLY as per `Test Reporting Protocol`. No intermediate external reporting. Final report upon completion of all Phases.

## D. Test Reporting Protocol (Internal)
* **Log File:** `C:\git\CodeGen_IDE\codegenesis\docs\Apex_IDE_Debug_Run_Log.md` (Create if not present within the extension's project structure).
* **Format:** Append entries with:
    * `## [YYYY-MM-DD HH:MM:SS] - Task X.Y Completion`
    * `**Scope:** [Task Name]`
    * `**Verification Result:** [PASS/FAIL]`
    * `**Key Findings/Corrections:** [Brief notes on checks, rule compliance status, issues found/fixed]`
    * `**Applicable Tests Run:** [List tests executed, e.g., Manual UI Check, Log Review, Unit Test Suite X]`
    * `**Test Pass %:** [Percentage, if applicable]`
    * `**Code Coverage % (if applicable):** [Percentage]`
* **Frequency:** Update log upon successful completion and verification of each Task.

## E. Hierarchical Execution Blocks

---

- [ ] **Phase 1: Disable Unimplemented Features & Fix Network Errors**
    * **Objective:** Prevent runtime errors caused by attempts to reach unimplemented backend services or incorrect external URLs. Reference codebase in `C:\git\CodeGen_IDE\codegenesis\`.

    - [ ] **Task 1.1: Disable MCP Marketplace Feature**
        * **Task Objective:** Modify the extension code (primarily `src/extension/handlers/mcp-handler.ts`) to prevent attempts to fetch or interact with the unimplemented MCP Marketplace backend.
        * **Steps:**
            - [ ] * **Step 1.1.1 [(Rule #12: CONF-FLAGS), (Rule #19: IMPL-LOGIC)]:** Introduce a boolean configuration flag/constant (e.g., `MCP_FEATURE_ENABLED`) within `src/extension/handlers/mcp-handler.ts` or a central config file and set it to `false`.
            - [ ] * **Step 1.1.2 [(Rule #19: IMPL-COND), (Rule #8: QUAL-READ)]:** Modify the `WorkspaceMcpMarketplace` function in `src/extension/handlers/mcp-handler.ts`. Add a conditional check at the beginning using the flag from Step 1.1.1. If disabled, log an informative message and `return` immediately, preventing cache checks and network requests. Post a "feature disabled" message to the webview via `postMessageToWebviewUtil`.
            - [ ] * **Step 1.1.3 [(Rule #19: IMPL-COND), (Rule #8: QUAL-READ)]:** Modify the `silentlyRefreshMcpMarketplace` function in `src/extension/handlers/mcp-handler.ts`. Ensure it respects the feature flag (verify it only calls the gated `WorkspaceMcpMarketplace`).
            - [ ] * **Step 1.1.4 [(Rule #19: IMPL-COND), (Rule #8: QUAL-READ)]:** Modify the `downloadMcp` function in `src/extension/handlers/mcp-handler.ts`. Add a conditional check at the beginning using the flag from Step 1.1.1. If disabled, log a warning, show a `vscode.window.showWarningMessage`, and `return` immediately.
            - [ ] * **Step 1.1.5 [(Rule #19: IMPL-UI), (Rule #18: DOC-SYNC)]:** Identify and disable any UI elements (buttons, commands in webview code, potentially contributions in `package.json`) that trigger MCP-related functions (`WorkspaceMcpMarketplace`, `downloadMcp`). Ensure UI state reflects the disabled feature.
        * **Internal Success Criteria:**
            * The `MCP_FEATURE_ENABLED` flag is implemented and set to `false`.
            * Execution of `WorkspaceMcpMarketplace`, `silentlyRefreshMcpMarketplace`, and `downloadMcp` halts early if the flag is `false`.
            * No network requests are made towards the `MARKETPLACE_URL` when the feature is disabled.
            * Logs clearly indicate the feature is disabled when relevant functions are called.
            * Associated UI elements are appropriately disabled or hidden.
            * Compliance with all referenced Apex Standards Rules from `C:\git\CodeGen_IDE\STANDARDS_REPOSITORY\apex\STANDARDS.md`.
        * **Internal Verification Method:**
            * Run the extension in the Extension Development Host.
            * Trigger actions that would normally call MCP functions (e.g., open the relevant webview panel, execute related commands).
            * Inspect Debug Console logs for messages indicating the feature is disabled and absence of network request attempts or 404 errors related to `MARKETPLACE_URL`.
            * Visually inspect the UI to confirm relevant elements are disabled/hidden.
            * Code review the changes for adherence to logic and flag usage.
            * Verify compliance with all referenced Apex Standards Rules for this Task and its Steps using `C:\git\CodeGen_IDE\STANDARDS_REPOSITORY\apex\STANDARDS.md`.
        * **Task Completion Testing (Internal):**
            * Execute manual tests: Trigger MCP features via UI/commands.
            * Review logs for expected "feature disabled" messages and absence of 404 errors related to MCP.
            * Update `C:\git\CodeGen_IDE\codegenesis\docs\Apex_IDE_Debug_Run_Log.md`.

    - [ ] **Task 1.2: Investigate and Resolve/Remove Unpkg 404 Error**
        * **Task Objective:** Eliminate the 404 error occurring when the extension attempts to load a resource from `www.vscode-unpkg.net`.
        * **Steps:**
            - [ ] * **Step 1.2.1 [(Rule #19: IMPL-DEBUG), (Rule #8: QUAL-SEARCH)]:** Search the entire extension codebase (`C:\git\CodeGen_IDE\codegenesis\`) for any code making HTTP requests to URLs containing `www.vscode-unpkg.net`. Specifically look for `/_gallery/justinlietz93/apex-ide-codegenesis/latest`.
            - [ ] * **Step 1.2.2 [(Rule #19: IMPL-ANALYSIS)]:** Determine the purpose of the request identified in Step 1.2.1.
            - [ ] * **Step 1.2.3 [(Rule #19: IMPL-REFACTOR), (Rule #8: QUAL-DEPS)]:** Based on the analysis: If the request is unnecessary or erroneous, remove the code making the request. If necessary but wrong, fix the URL or resource loading method.
        * **Internal Success Criteria:**
            * The code responsible for the `unpkg.net` request is identified and addressed (removed or fixed).
            * The 404 error related to `www.vscode-unpkg.net` no longer appears in the logs.
            * Compliance with all referenced Apex Standards Rules from `C:\git\CodeGen_IDE\STANDARDS_REPOSITORY\apex\STANDARDS.md`.
        * **Internal Verification Method:**
            * Run the extension in the Extension Development Host. Perform actions that previously triggered the error or observe startup/runtime logs.
            * Inspect Debug Console and Output channel logs for the absence of the specific `unpkg.net` 404 error.
            * Code review the changes.
            * Verify compliance with all referenced Apex Standards Rules for this Task and its Steps using `C:\git\CodeGen_IDE\STANDARDS_REPOSITORY\apex\STANDARDS.md`.
        * **Task Completion Testing (Internal):**
            * Execute manual tests covering extension startup and relevant features.
            * Review logs for absence of the `unpkg.net` 404 error.
            * Update `C:\git\CodeGen_IDE\codegenesis\docs\Apex_IDE_Debug_Run_Log.md`.

---

- [ ] **Phase 2: Refactor Storage Mechanism**
    * **Objective:** Address the "large extension state" warning by refactoring data storage for the MCP Catalog to use the file system via `globalStorageUri`.

    - [ ] **Task 2.1: Refactor MCP Catalog Storage (`globalState` to `globalStorageUri`)**
        * **Task Objective:** Modify storage logic in `src/extension/handlers/mcp-handler.ts` to use the file system via `context.globalStorageUri` instead of `context.globalState` for caching the MCP marketplace catalog.
        * **Steps:**
            - [ ] * **Step 2.1.1 [(Rule #8: QUAL-MOD), (Rule #19: IMPL-API)]:** Import Node.js `fs` and `path` modules in `src/extension/handlers/mcp-handler.ts`.
            - [ ] * **Step 2.1.2 [(Rule #19: IMPL-API), (Rule #8: QUAL-NAMING)]:** Define a constant for the cache filename (e.g., `MCP_CATALOG_FILENAME = 'mcpCatalogCache.json'`).
            - [ ] * **Step 2.1.3 [(Rule #19: IMPL-API), (Rule #19: IMPL-ERR-HAND)]:** Create/Implement a helper function (e.g., `getCatalogCachePath`) that takes `context: vscode.ExtensionContext`, constructs the full path using `path.join(context.globalStorageUri.fsPath, MCP_CATALOG_FILENAME)`, ensures the directory `context.globalStorageUri.fsPath` exists using `fs.mkdirSync(..., { recursive: true })`, and returns the full path.
            - [ ] * **Step 2.1.4 [(Rule #19: IMPL-REFACTOR), (Rule #19: IMPL-ERR-HAND)]:** In `WorkspaceMcpMarketplace`, replace `getGlobalState` logic for reading cache. Use the helper to get the path, check existence (`fs.existsSync`), read file (`fs.readFileSync`), parse JSON (`JSON.parse`), validate structure. Implement `try...catch` for file I/O and parse errors. Delete invalid cache files (`fs.unlinkSync`).
            - [ ] * **Step 2.1.5 [(Rule #19: IMPL-REFACTOR), (Rule #19: IMPL-ERR-HAND)]:** In `WorkspaceMcpMarketplace`'s success block, replace `updateGlobalState`. Use the helper to get path, `JSON.stringify` the catalog, `fs.writeFileSync` the stringified data. Implement `try...catch` for write errors.
            - [ ] * **Step 2.1.6 [(Rule #19: IMPL-REFACTOR)]:** In `downloadMcp`, replace `getGlobalState` call with the file reading logic from Step 2.1.4.
        * **Internal Success Criteria:**
            * Calls to `getGlobalState` and `updateGlobalState` for the MCP catalog key are removed.
            * Catalog data is read from/written to `mcpCatalogCache.json` within `context.globalStorageUri`.
            * File I/O and JSON parse errors are handled gracefully.
            * The "large extension state" warning for the MCP catalog key no longer appears in logs.
            * Catalog caching functionality remains correct (when MCP feature is enabled for testing).
            * Compliance with all referenced Apex Standards Rules from `C:\git\CodeGen_IDE\STANDARDS_REPOSITORY\apex\STANDARDS.md`.
        * **Internal Verification Method:**
            * Temporarily set `MCP_FEATURE_ENABLED` to `true`.
            * Run extension in debug host. Clear previous cache file. Trigger `WorkspaceMcpMarketplace`. Verify `mcpCatalogCache.json` creation and content in `context.globalStorageUri` directory (log path or use debugger).
            * Restart Extension Host. Trigger `WorkspaceMcpMarketplace` (`forceRefresh: false`). Verify cache read from file via logs.
            * Test error handling (corrupt JSON file, test permissions if feasible).
            * Code review changes for API usage, error handling, file paths.
            * Verify compliance with all referenced Apex Standards Rules using `C:\git\CodeGen_IDE\STANDARDS_REPOSITORY\apex\STANDARDS.md`.
            * **Set `MCP_FEATURE_ENABLED` back to `false`.**
        * **Task Completion Testing (Internal):**
            * (With MCP flag temporarily enabled) Run manual tests involving fetching/using the catalog. Verify cache read/write via logs and file inspection.
            * (With MCP flag disabled) Ensure no storage operations occur for the catalog.
            * Review logs for absence of the "large extension state" warning related to the catalog key.
            * Update `C:\git\CodeGen_IDE\codegenesis\docs\Apex_IDE_Debug_Run_Log.md`.

---

- [ ] **Phase 3: Resolve Webview Resource Loading Issues**
    * **Objective:** Ensure all local resources (images, fonts) required by the extension's webview(s) load correctly without errors or CSP warnings.

    - [ ] **Task 3.1: Fix Webview Image Loading (`ApexLogoWhite.png`)**
        * **Task Objective:** Correct the loading mechanism for `ApexLogoWhite.png` (likely in `assets/`) to resolve the `net::ERR_ACCESS_DENIED` error in webviews.
        * **Steps:**
            - [ ] * **Step 3.1.1 [(Rule #8: QUAL-SEARCH), (Rule #19: IMPL-WEBVIEW)]:** Locate the code generating webview HTML where `ApexLogoWhite.png` is referenced (e.g., an `<img>` tag).
            - [ ] * **Step 3.1.2 [(Rule #19: IMPL-API), (Rule #13: SEC-RES)]:** Determine the correct relative path (e.g., `assets/ApexLogoWhite.png`). Create the on-disk `Uri` using `vscode.Uri.joinPath(context.extensionUri, 'assets', 'ApexLogoWhite.png')`.
            - [ ] * **Step 3.1.3 [(Rule #19: IMPL-API), (Rule #13: SEC-RES)]:** Generate the secure webview URI using `webview.asWebviewUri()` with the `Uri` from Step 3.1.2.
            - [ ] * **Step 3.1.4 [(Rule #19: IMPL-WEBVIEW), (Rule #8: QUAL-CODE)]:** Update the `src` attribute in the HTML to use the secure URI from Step 3.1.3.
            - [ ] * **Step 3.1.5 [(Rule #19: IMPL-API), (Rule #13: SEC-CONF)]:** Verify/Add the `assets` directory path (`vscode.Uri.joinPath(context.extensionUri, 'assets')`) to the `options.localResourceRoots` array in the `createWebviewPanel` or `resolveWebviewView` call.
            - [ ] * **Step 3.1.6 [(Rule #13: SEC-CSP)]:** Inspect webview CSP (`<meta http-equiv="Content-Security-Policy"...>`). Ensure `img-src` includes `${webview.cspSource}`.
        * **Internal Success Criteria:**
            * `ApexLogoWhite.png` displays correctly in the webview.
            * `net::ERR_ACCESS_DENIED` error for the image is gone from Webview Developer Tools console.
            * Correct usage of `asWebviewUri` and `localResourceRoots` is confirmed.
            * Image CSP directive is correct.
            * Compliance with all referenced Apex Standards Rules from `C:\git\CodeGen_IDE\STANDARDS_REPOSITORY\apex\STANDARDS.md`.
        * **Internal Verification Method:**
            * Run extension in debug host. Open the relevant webview.
            * Visually confirm image display.
            * Check Webview Developer Tools console for absence of the error.
            * Code review HTML generation, API calls (`asWebviewUri`, `localResourceRoots`), and CSP meta tag.
            * Verify compliance with all referenced Apex Standards Rules using `C:\git\CodeGen_IDE\STANDARDS_REPOSITORY\apex\STANDARDS.md`.
        * **Task Completion Testing (Internal):**
            * Execute manual tests loading the relevant webview(s). Confirm image display and absence of errors.
            * Update `C:\git\CodeGen_IDE\codegenesis\docs\Apex_IDE_Debug_Run_Log.md`.

    - [ ] **Task 3.2: Fix Webview Font Loading/CSP Warning (`codicon.ttf`)**
        * **Task Objective:** Resolve the CSP warning related to loading `codicon.ttf` from `node_modules/@vscode/codicons/dist/`. Prefer using standard VS Code mechanisms over direct loading if possible.
        * **Steps:**
            - [ ] * **Step 3.2.1 [(Rule #8: QUAL-SEARCH), (Rule #19: IMPL-WEBVIEW)]:** Locate how `codicon.ttf` or Codicons in general are being used/referenced in webview HTML/CSS.
            - [ ] * **Step 3.2.2 [(Rule #8: QUAL-ALT), (Rule #19: IMPL-UI)]:** **Investigate Preferred Alternative:** Determine if `@vscode/webview-ui-toolkit` is used or can be used. If yes, refactor the webview UI code to use the toolkit's components (like `<vscode-icon>`) for displaying Codicons, removing any manual `@font-face` rules or direct links for `codicon.ttf`.
            - [ ] * **Step 3.2.3 [(Rule #19: IMPL-REFACTOR), (Rule #13: SEC-RES)]:** **If Alternative (3.2.2) is Not Feasible:** Implement direct loading correctly.
                * Create the on-disk `Uri`: `vscode.Uri.joinPath(context.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.ttf')`.
                * Generate secure URI: `fontUri = webview.asWebviewUri(fontDiskPath)`.
                * Update HTML/CSS (`<link href="...">` or `@font-face src: url(...)`) to use `fontUri`.
            - [ ] * **Step 3.2.4 [(Rule #19: IMPL-API), (Rule #13: SEC-CONF)]:** **If Alternative (3.2.2) is Not Feasible:** Verify/Add the Codicon `dist` directory path (`vscode.Uri.joinPath(context.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist')`) to `options.localResourceRoots`.
            - [ ] * **Step 3.2.5 [(Rule #13: SEC-CSP)]:** Inspect webview CSP. Ensure `font-src` includes `${webview.cspSource}`. Remove any invalid hardcoded `file://` or similar URIs for fonts.
        * **Internal Success Criteria:**
            * CSP warning regarding `codicon.ttf` loading is eliminated from Webview Developer Tools console.
            * Codicons display correctly in the UI (if used).
            * Resources are loaded securely, preferably using standard VS Code toolkit methods.
            * Compliance with all referenced Apex Standards Rules from `C:\git\CodeGen_IDE\STANDARDS_REPOSITORY\apex\STANDARDS.md`.
        * **Internal Verification Method:**
            * Run extension in debug host. Open relevant webview(s).
            * Check Webview Developer Tools console for absence of the font CSP warning.
            * Visually verify Codicons render correctly if used.
            * Code review the changes (preference for toolkit usage, fallback to correct direct loading, CSP, `localResourceRoots`).
            * Verify compliance with all referenced Apex Standards Rules using `C:\git\CodeGen_IDE\STANDARDS_REPOSITORY\apex\STANDARDS.md`.
        * **Task Completion Testing (Internal):**
            * Execute manual tests loading relevant webview(s). Confirm absence of CSP warnings and correct icon rendering.
            * Update `C:\git\CodeGen_IDE\codegenesis\docs\Apex_IDE_Debug_Run_Log.md`.

---

- [ ] **Phase 4: Final Verification & Cleanup**
    * **Objective:** Perform final checks for code quality, compliance, and address any minor remaining issues.

    - [ ] **Task 4.1: Check for Internal API Proposal Usage**
        * **Task Objective:** Ensure the extension's `package.json` does not erroneously list non-existent VS Code API proposals.
        * **Steps:**
            - [ ] * **Step 4.1.1 [(Rule #12: CONF-PKG)]:** Inspect the `package.json` file located at `C:\git\CodeGen_IDE\codegenesis\package.json`.
            - [ ] * **Step 4.1.2 [(Rule #12: CONF-PKG), (Rule #8: QUAL-CLEAN)]:** Locate the `enabledApiProposals` property, if it exists. Check if it contains `"terminalShellType"` or `"chatReadonlyPromptReference"`. If present, remove these specific entries as they are causing warnings (likely from other extensions) and are not valid proposals.
        * **Internal Success Criteria:**
            * The `package.json` file does not list `terminalShellType` or `chatReadonlyPromptReference` under `enabledApiProposals`.
            * Compliance with all referenced Apex Standards Rules from `C:\git\CodeGen_IDE\STANDARDS_REPOSITORY\apex\STANDARDS.md`.
        * **Internal Verification Method:**
            * Examine the `package.json` file contents directly.
            * Verify compliance with all referenced Apex Standards Rules for this Task and its Steps using `C:\git\CodeGen_IDE\STANDARDS_REPOSITORY\apex\STANDARDS.md`.
        * **Task Completion Testing (Internal):**
            * N/A (Verification is direct inspection).
            * Update `C:\git\CodeGen_IDE\codegenesis\docs\Apex_IDE_Debug_Run_Log.md`.

    - [ ] **Task 4.2: Final Compliance Sweep and Regression Test**
        * **Task Objective:** Ensure overall code quality, run any available automated tests, and perform a final manual check for regressions.
        * **Steps:**
            - [ ] * **Step 4.2.1 [(Rule #8: QUAL-LINT), (Rule #8: QUAL-FORMAT)]:** Run configured linters (e.g., ESLint) and formatters (e.g., Prettier) across the modified codebase and fix any reported issues.
            - [ ] * **Step 4.2.2 [(Rule #14: TEST-AUTO)]:** Execute any available automated test suites (unit, integration) for the extension. Analyze results and fix any failing tests introduced by the changes.
            - [ ] * **Step 4.2.3 [(Rule #14: TEST-MANUAL)]:** Perform a manual smoke test of the extension's core functionality in the Extension Development Host, checking for any regressions introduced during the fixes. Pay attention to areas modified in previous phases (MCP feature disabled state, storage impacts (if testable), webview appearance).
            - [ ] * **Step 4.2.4 [(Rule #21: FINAL-SWEEP)]:** Perform a final code review sweep focusing on adherence to key principles in the Apex Software Compliance Standards Guide (`C:\git\CodeGen_IDE\STANDARDS_REPOSITORY\apex\STANDARDS.md`), especially concerning error handling, security, configuration, and implementation correctness across all modified files.
        * **Internal Success Criteria:**
            * Code passes linting and formatting checks.
            * Automated tests (if present) pass.
            * Manual smoke testing reveals no obvious regressions in core functionality.
            * Final review confirms adherence to key Apex Standards.
            * Compliance with all referenced Apex Standards Rules from `C:\git\CodeGen_IDE\STANDARDS_REPOSITORY\apex\STANDARDS.md`.
        * **Internal Verification Method:**
            * Review linter/formatter output.
            * Review automated test results.
            * Document results of manual smoke test.
            * Document result of final compliance sweep.
            * Verify compliance with all referenced Apex Standards Rules for this Task and its Steps using `C:\git\CodeGen_IDE\STANDARDS_REPOSITORY\apex\STANDARDS.md`.
        * **Task Completion Testing (Internal):**
            * Collate results from linting, automated tests, manual testing, and final sweep.
            * Update `C:\git\CodeGen_IDE\codegenesis\docs\Apex_IDE_Debug_Run_Log.md` with final verification results.

---

## F. Final Instruction
**Begin execution.** Process the Phases, Tasks, and Steps sequentially as defined above. Mark items complete (`- [x]`) only upon successful execution and verification. Adhere strictly to the **Apex Software Compliance Standards Guide** (`C:\git\CodeGen_IDE\STANDARDS_REPOSITORY\apex\STANDARDS.md`) at all times. Log internal test results according to the protocol. Report only upon successful completion of all Phases.

## G. Contextual Footer
*(Instructions based on requirements established as of 2025-04-07 18:43:27 CDT. Location context: Menasha, Wisconsin, United States. Target Project: `C:\git\CodeGen_IDE\codegenesis\`)*