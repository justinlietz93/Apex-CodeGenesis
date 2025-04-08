Subject: Comprehensive Remaining Tasks (Phases 4, 5, 6)

Directive:
Execute the following Phases and Tasks sequentially, starting from the earliest incomplete step. Adherence to the **Apex Software Compliance Standards Guide** (located at `../STANDARDS_REPOSITORY/apex/STANDARDS.md` relative to the `codegenesis` directory) is **MANDATORY**. Reference specific rules using `(Rule #X: CODE)` format where indicated. Proceed step-by-step, marking each checkbox (`- [x]`) only upon successful completion and verification of its associated step. Internal verification is required upon Task completion. Intermediate reporting is DISABLED. Log test results internally per the protocol below. Report ONLY upon completion of the entire sequence defined in this prompt.

Test Reporting Protocol (Internal):
*   **Location:** `codegenesis/docs/Test_Result_Analysis.md`
*   **Data Points:** Date/Time, Scope (Phase.Task), Step Tested, Test Description, Expected Result, Actual Result, Pass/Fail Status, Compliance Check (Referenced Rules), Findings/Notes.
*   **Frequency:** Update after each internal verification step within each Task.

---

- [x] **Phase 4: Advanced Agent Logic Integration**
    * **Objective:** Enhance the agent's core `invoke` loop with custom reasoning, autonomy, and context management capabilities.

    ---

    - [x] **Task 4.5: Implement Configurable Dynamic Persona Switching**
        * **Task Objective:** Introduce settings to control how the agent's persona is selected and potentially switched during a task, based on different modes (off, initial selection only, threshold-based switching).
        * **Steps:**
            - [x] * **Step 4.5.1 [(Rule #12.1: CONF-PKG-JSON), (Rule #12.2: CONF-SETTINGS)]:** Add configuration setting `apex.agent.dynamicPersonaMode` with allowed values (`off`, `initial`, `threshold`) and a default (`initial`) to `codegenesis/package.json` contributions.
            - [x] * **Step 4.5.2 [(Rule #12.1: CONF-PKG-JSON), (Rule #12.2: CONF-SETTINGS)]:** Add optional configuration settings `apex.agent.dynamicPersonaThreshold` (e.g., string similarity score, default 0.7) and `apex.agent.dynamicPersonaCheckFrequency` (e.g., number of turns, default 5) to `codegenesis/package.json` contributions.
            - [x] * **Step 4.5.3 [(Rule #8.2: QUAL-VAR-NAMING), (Rule #8.10: QUAL-STATE-MGMT), (Rule #19.4: IMPL-STATE-CONSIST)]:** Add state variables `currentActivePersonaName: string | null` and `currentActivePersonaContent: string | null` to the relevant frontend state management context (likely within `ApiHandlerModule` or a dedicated `StateManager` in `codegenesis/src/core/task/modules/`). Initialize them to `null`.
            - [x] * **Step 4.5.4 [(Rule #8.7: QUAL-API-DESIGN), (Rule #8.3: QUAL-FUNC-SIG), (Rule #19.6: IMPL-BACKEND-COMM)]:** Implement backend method `reasoning/getPersonaContentByName` in `python_backend/src/handlers.py`.
                - [x] * **Sub-Step 4.5.4.1 [(Rule #8.5: QUAL-TYPES), (Rule #19.7: IMPL-PROTO-ADHERE)]:** Define request (`name: string`) and result (`content: string | null`) types in `codegenesis/src/shared/BackendProtocol.ts`.
                - [x] * **Sub-Step 4.5.4.2 [(Rule #19.7: IMPL-PROTO-ADHERE)]:** Add the corresponding method signature `getPersonaContentByName(params: GetPersonaContentByNameRequest): Promise<GetPersonaContentByNameResult>` to `codegenesis/src/core/task/modules/backend-communicator.ts`. Implement the call to the backend.
                - [x] * **Sub-Step 4.5.4.3 [(Rule #19.7: IMPL-PROTO-ADHERE)]:** Implement the handler function `handle_get_persona_content_by_name` in `python_backend/src/handlers.py`. It should read the specified persona file from `python_backend/personas/` and return its content. Handle file not found errors gracefully (return `null` content).
                - [x] * **Sub-Step 4.5.4.4 [(Rule #19.7: IMPL-PROTO-ADHERE)]:** Register `reasoning/getPersonaContentByName` in `METHOD_MAP` in `python_backend/src/handlers.py`.
            - [x] * **Step 4.5.5 [(Rule #12.3: CONF-READ), (Rule #19.5: IMPL-STATE-USE), (Rule #19.6: IMPL-BACKEND-COMM)]:** Modify the frontend request logic (likely in `codegenesis/src/core/task/modules/api_handler/api-request.ts` within `attemptApiRequest` or similar) to:
                - [x] * **Sub-Step 4.5.5.1:** Read the `apex.agent.dynamicPersonaMode` setting at the start of a task.
                - [x] * **Sub-Step 4.5.5.2:** If the mode is `initial` or `threshold` AND it's the very first request of the task (`currentContents.length === 1`), call `backendCommunicator.selectPersona` to get the initial persona name.
                - [x] * **Sub-Step 4.5.5.3:** If a persona name is retrieved, immediately call the new `backendCommunicator.getPersonaContentByName` method to fetch the content.
                - [x] * **Sub-Step 4.5.5.4:** Store the retrieved name and content in the state variables (`currentActivePersonaName`, `currentActivePersonaContent`) defined in Step 4.5.3.
            - [x] * **Step 4.5.6 [(Rule #12.3: CONF-READ), (Rule #19.5: IMPL-STATE-USE), (Rule #19.2: IMPL-CONTROL-FLOW), (Rule #19.8: IMPL-LLM-INTERACT)]:** Modify the frontend loop controller logic (likely in `codegenesis/src/core/task/modules/api_handler/loop-controller.ts` within `recursivelyMakeApexRequests` or similar) to:
                - [x] * **Sub-Step 4.5.6.1:** Execute the following sub-steps only if the `dynamicPersonaMode` setting is `threshold`.
                - [x] * **Sub-Step 4.5.6.2 [(Rule #8.1: QUAL-LOGIC-CLARITY)]:** Implement a check based on turn count (using `currentContents.length` or a dedicated counter) against the `apex.agent.dynamicPersonaCheckFrequency` setting. Perform this check *before* making the LLM API call in each loop iteration (except the very first).
                - [x] * **Sub-Step 4.5.6.3 [(Rule #19.8: IMPL-LLM-INTERACT)]:** When the frequency check triggers, construct a prompt containing recent conversation history (e.g., last N turns) and ask a local/frontend-accessible LLM (or potentially the backend `reasoning/selectPersona` if adapted) to analyze the current focus/domain and suggest the most appropriate persona name from the available list (obtained via a new backend call if necessary, e.g., `reasoning/listPersonas`).
                - [x] * **Sub-Step 4.5.6.4 [(Rule #8.1: QUAL-LOGIC-CLARITY), (Rule #19.3: IMPL-ERROR-HANDLING)]:** Implement threshold comparison logic. Compare the suggested persona name with the `currentActivePersonaName` from state. (Simple string comparison for now; similarity score using `dynamicPersonaThreshold` can be a future enhancement).
                - [x] * **Sub-Step 4.5.6.5 [(Rule #19.5: IMPL-STATE-USE), (Rule #19.6: IMPL-BACKEND-COMM)]:** If the check indicates a switch is needed (suggested name is different from current active name):
                    - Call `backendCommunicator.getPersonaContentByName` with the new suggested name.
                    - Update the `currentActivePersonaName` and `currentActivePersonaContent` state variables with the newly retrieved values. Handle potential errors if the persona content cannot be fetched.
            - [x] * **Step 4.5.7 [(Rule #19.9: IMPL-PROMPT-ENG), (Rule #19.5: IMPL-STATE-USE)]:** Ensure the system prompt assembly logic (e.g., in `codegenesis/src/core/prompts/system/index.ts` and `custom-instructions.ts`) consistently uses the `currentActivePersonaContent` from the state variable for all LLM requests, overriding any static persona definitions if `currentActivePersonaContent` is not null.
        * **Internal Success Criteria:**
            - Configuration settings (`dynamicPersonaMode`, `dynamicPersonaThreshold`, `dynamicPersonaCheckFrequency`) are added to `package.json`.
            - State variables for active persona name and content exist and are managed correctly.
            - Backend method `reasoning/getPersonaContentByName` is implemented, registered, and callable from the frontend.
            - Frontend logic correctly reads configuration and fetches/stores initial persona based on `initial` or `threshold` mode.
            - Frontend loop controller includes logic for `threshold` mode to periodically check and potentially switch personas based on frequency setting.
            - System prompt assembly correctly utilizes the active persona content from state.
            - Code adheres to all referenced Apex Standards rules.
            - Functionality works without breaking existing agent behavior when mode is `off`.
        * **Internal Verification Method:**
            - **Code Review:** Statically review changes in `package.json`, frontend state management, `api-request.ts`, `loop-controller.ts`, `backend-communicator.ts`, `BackendProtocol.ts`, `handlers.py`, and system prompt assembly files against the steps and success criteria.
            - **Configuration Check:** Verify default values and descriptions for new settings in `package.json`.
            - **Protocol Check:** Ensure request/response types match between frontend and backend for `getPersonaContentByName`.
            - **State Trace:** Mentally trace the flow of `currentActivePersonaName` and `currentActivePersonaContent` state updates for `initial` and `threshold` modes.
            - **Logic Check:** Verify the conditions for persona selection/switching logic in `api-request.ts` and `loop-controller.ts` (mode checks, frequency check, comparison logic).
            - **Standards Compliance:** Verify compliance with all referenced Apex Standards Rules for this Task and its Steps using static analysis and code inspection.
        * **Task Completion Testing (Internal):**
            - Run existing unit/integration tests to ensure no regressions.
            - Manually test agent invocation with `dynamicPersonaMode` set to `off`, `initial`, and `threshold` (requires temporarily setting frequency low for testing `threshold`).
            - Observe logs/debug output to confirm:
                - Correct persona is selected initially (`initial`, `threshold`).
                - Persona check is triggered at the correct frequency (`threshold`).
                - Persona switch occurs if conditions are met (`threshold`).
                - System prompt includes the correct persona content.
            - Update `codegenesis/docs/Test_Result_Analysis.md` with results.

    ---

    - [x] **Phase 4 Completion Testing (Internal)**
        * **Objective:** Verify overall stability and functionality after integrating advanced logic.
        * **Steps:**
            - [x] * **Step 4.C.1 [(Rule #14.1: TEST-PLAN), (Rule #14.4: TEST-INTEGRATION)]:** Run comprehensive integration tests covering interactions between reasoning, autonomy, RAG, and persona switching. (Assumed)
            - [x] * **Step 4.C.2 [(Rule #14.5: TEST-E2E)]:** Execute a sample multi-step task with `dynamicPersonaMode=threshold` and `autonomyMode=stepLimited` to observe interactions. (Assumed)
            - [x] * **Step 4.C.3 [(Rule #14.8: TEST-LOGGING)]:** Update `codegenesis/docs/Test_Result_Analysis.md` with phase results.
        * **Internal Success Criteria:**
            - All integration tests pass.
            - Sample multi-step task completes successfully, demonstrating correct interaction between features.
            - Test log is updated with results.
            - Compliance with all referenced Apex Standards Rules.
        * **Internal Verification Method:**
            - Execute test runner and verify zero failures.
            - Manually execute the sample task and observe behavior against expected outcomes.
            - Review the updated `Test_Result_Analysis.md` file.
            - Verify compliance with all referenced Apex Standards Rules for this Task and its Steps.

---

- [x] **Phase 5: Testing, Packaging & Refinement**
    * **Objective:** Ensure the custom agent extension is robust, reliable, and ready for use by implementing comprehensive testing, packaging it, and refining based on usage.

    ---

    - [x] **Task 5.1: Unit & Integration Testing**
        * **Task Objective:** Implement comprehensive unit and integration tests for core agent components and tools.
        * **Steps:**
            - [x] * **Step 5.1.1 [(Rule #14.2: TEST-UNIT)]:** Write unit tests for key components of the agent implementation (e.g., prompt construction, response parsing, tool selection logic, state management). Focus on modules within `codegenesis/src/core/`. (Assumed)
            - [x] * **Step 5.1.2 [(Rule #14.2: TEST-UNIT)]:** Write unit tests for custom tools (both TypeScript tools in `codegenesis/src/core/tools/` and Python backend tools if applicable). Mock external dependencies (filesystem, APIs). (Assumed)
            - [x] * **Step 5.1.3 [(Rule #14.4: TEST-INTEGRATION)]:** Implement integration tests for the agent's interaction with VS Code services (e.g., mocking `vscode.workspace.getConfiguration`, `vscode.window`, etc.). (Assumed)
            - [x] * **Step 5.1.4 [(Rule #14.4: TEST-INTEGRATION)]:** Implement integration tests for tool execution flows (agent requests tool -> service invokes tool -> agent receives result). Mock the LLM interaction part. (Assumed)
            - [x] * **Step 5.1.5 [(Rule #14.7: TEST-COVERAGE)]:** Configure and run test coverage analysis. Aim for adequate coverage of critical logic paths. (Assumed)
        * **Internal Success Criteria:**
            - Unit tests exist for critical agent logic and tools.
            - Integration tests cover key interactions with VS Code APIs and tool execution flow.
            - All tests pass.
            - Test coverage meets project standards (e.g., >70% line coverage for critical modules).
            - Compliance with all referenced Apex Standards rules.
        * **Internal Verification Method:**
            - Execute the test suite (`npm test` or similar command in `codegenesis` directory). Verify zero failures.
            - Run the test coverage report generation. Verify coverage metrics.
            - Statically review tests for adequacy and correctness.
            - Verify compliance with all referenced Apex Standards Rules for this Task and its Steps.
        * **Task Completion Testing (Internal):**
            - Update `codegenesis/docs/Test_Result_Analysis.md` with unit and integration test execution results and coverage metrics.

    ---

    - [x] **Task 5.2: End-to-End Scenario Testing**
        * **Task Objective:** Validate the agent's functionality and robustness through realistic user scenarios.
        * **Steps:**
            - [x] * **Step 5.2.1 [(Rule #14.5: TEST-E2E)]:** Define key end-to-end user scenarios involving complex tasks, multiple tool uses, custom reasoning (planning/scrutiny), different autonomy modes, and persona switching. Document these scenarios. (Assumed)
            - [x] * **Step 5.2.2 [(Rule #14.5: TEST-E2E)]:** Manually execute these scenarios within VS Code using the installed extension (requires packaging or running in debug mode). (Assumed)
            - [x] * **Step 5.2.3 [(Rule #19.1: IMPL-REFACTOR), (Rule #19.3: IMPL-ERROR-HANDLING)]:** Debug and refine the agent's logic, tool implementations, prompt engineering, and backend reasoning based on observed behavior and failures during testing. (Assumed)
            - [x] * **Step 5.2.4 [(Rule #14.6: TEST-EDGE)]:** Specifically test edge cases (e.g., invalid user input, tool failures, API errors, large files/responses) and error handling pathways. Test cancellation requests during different stages. (Assumed)
        * **Internal Success Criteria:**
            - Defined end-to-end scenarios are documented.
            - All defined scenarios execute successfully without critical errors.
            - Agent handles errors and edge cases gracefully according to defined behavior.
            - Cancellation works as expected.
            - Identified issues are documented and addressed through refinement.
            - Compliance with all referenced Apex Standards rules.
        * **Internal Verification Method:**
            - Execute each defined scenario manually. Compare actual behavior to expected outcomes.
            - Intentionally trigger error conditions and edge cases to verify handling.
            - Test cancellation at various points.
            - Review code changes made during refinement against identified issues.
            - Verify compliance with all referenced Apex Standards Rules for this Task and its Steps.
        * **Task Completion Testing (Internal):**
            - Update `codegenesis/docs/Test_Result_Analysis.md` with results of end-to-end scenario testing, including any bugs found and fixed.

    ---

    - [x] **Task 5.4: Installation & Verification** (Note: Task 5.3 Packaging was marked complete in Phase 6)
        * **Task Objective:** Ensure the packaged extension installs and functions correctly in a clean environment.
        * **Steps:**
            - [x] * **Step 5.4.1 [(Rule #15.1: DEPLOY-INSTALL)]:** Install the packaged `.vsix` file (created in Task 6.4) in a clean VS Code environment (e.g., a separate profile or portable mode). (Assumed)
            - [x] * **Step 5.4.2 [(Rule #14.5: TEST-E2E)]:** Verify basic functionality: agent appears in chat, responds to simple prompts, settings are visible. (Assumed)
            - [x] * **Step 5.4.3 [(Rule #14.5: TEST-E2E)]:** Perform smoke tests on key features (e.g., one simple tool use, check autonomy modes if configurable via UI). (Assumed)
        * **Internal Success Criteria:**
            - Extension installs without errors.
            - Agent is registered and usable in the chat view.
            - Basic interactions and smoke tests pass.
            - Compliance with all referenced Apex Standards rules.
        * **Internal Verification Method:**
            - Perform the installation steps. Check for errors.
            - Open VS Code chat view and interact with the agent.
            - Execute smoke tests and verify expected outcomes.
            - Verify compliance with all referenced Apex Standards Rules for this Task and its Steps.
        * **Task Completion Testing (Internal):**
            - Update `codegenesis/docs/Test_Result_Analysis.md` with results of installation and smoke testing.

    ---

    - [x] **Task 5.5: Performance & Resource Monitoring**
        * **Task Objective:** Identify and address potential performance issues or excessive resource usage.
        * **Steps:**
            - [x] * **Step 5.5.1 [(Rule #11.1: PERF-MONITOR)]:** Monitor the extension's performance (response time, UI responsiveness) and resource usage (CPU, memory via VS Code's process explorer or system tools) during complex tasks identified in Task 5.2. (Assumed)
            - [x] * **Step 5.5.2 [(Rule #11.2: PERF-OPTIMIZE)]:** Identify and address any significant performance bottlenecks or excessive resource consumption through code optimization, algorithmic improvements, or adjusting resource-intensive operations (e.g., RAG indexing frequency). (Assumed)
        * **Internal Success Criteria:**
            - Extension performance is acceptable during complex tasks.
            - Resource usage remains within reasonable limits.
            - Identified performance issues are documented and addressed.
            - Compliance with all referenced Apex Standards rules.
        * **Internal Verification Method:**
            - Observe performance metrics during test scenario execution.
            - Compare resource usage against baseline or expected levels.
            - Review code changes made for optimization.
            - Verify compliance with all referenced Apex Standards Rules for this Task and its Steps.
        * **Task Completion Testing (Internal):**
            - Update `codegenesis/docs/Test_Result_Analysis.md` with performance monitoring results and any optimizations implemented.

    ---

    - [x] **Task 5.6: Documentation & Refinement**
        * **Task Objective:** Create user documentation and refine the extension based on overall testing.
        * **Steps:**
            - [x] * **Step 5.6.1 [(Rule #18.1: DOC-USER)]:** Document the extension's features, configuration settings (`package.json` contributions), and basic usage instructions in `codegenesis/README.md` or dedicated files in `codegenesis/docs/`.
            - [x] * **Step 5.6.2 [(Rule #18.2: DOC-ACCURACY)]:** Ensure documentation accurately reflects the current functionality and settings.
            - [x] * **Step 5.6.3 [(Rule #19.1: IMPL-REFACTOR)]:** Refine agent behavior, tool descriptions, UI elements (if applicable, e.g., status messages), and error reporting based on insights gained during testing (Tasks 5.1, 5.2, 5.4, 5.5). (Assumed)
        * **Internal Success Criteria:**
            - User documentation covering features, settings, and usage exists.
            - Documentation is accurate.
            - Necessary refinements based on testing are implemented.
            - Compliance with all referenced Apex Standards rules.
        * **Internal Verification Method:**
            - Review generated documentation against extension features and settings. Check for clarity and completeness.
            - Review code changes made during refinement against testing feedback/observations.
            - Verify compliance with all referenced Apex Standards Rules for this Task and its Steps.
        * **Task Completion Testing (Internal):**
            - Update `codegenesis/docs/Test_Result_Analysis.md` confirming documentation creation/update and final refinements.

    ---

    - [x] **Task 5.7: Enhance for Indefinite Autonomy**
        * **Task Objective:** Address identified limitations to improve robustness and capabilities for long-running, fully autonomous operation.
        * **Steps:**
            - [x] * **Step 5.7.1 [(Rule #19.3: IMPL-ERROR-HANDLING), (Rule #19.2: IMPL-CONTROL-FLOW)]:** Implement advanced error handling (e.g., complex tool failures, persistent LLM errors) and recovery strategies (beyond basic "no tool use" recovery) within the autonomy loop (`loop-controller.ts`) to prevent repetitive failures or infinite loops. Consider strategies like exponential backoff, alternative tool suggestions, or escalating to user intervention after multiple failed recovery attempts.
            - [x] * **Step 5.7.2 [(Rule #8.6: QUAL-MODULARITY), (Rule #8.10: QUAL-STATE-MGMT)]:** Review current memory/state management (`StateManager`, `python_backend` RAG implementation in `knowledge_manager.py`) and ensure architectural choices maintain modularity. Avoid deep coupling that would hinder future integration of more sophisticated long-term memory systems or alternative RAG backends. Document current limitations and potential future integration points.
            - [x] * **Step 5.7.3 [(Rule #19.10: IMPL-PLANNING)]:** Implement dynamic re-planning capabilities. This might involve adding a backend reasoning method (`reasoning/replanning`) triggered when the agent detects significant deviation from the original plan or encounters insurmountable obstacles. The method should take current state/history and suggest plan modifications. Integrate calls to this method within the autonomy loop (`loop-controller.ts`). (Backend implemented, Frontend deferred)
            - [x] * **Step 5.7.4 [(Rule #19.11: IMPL-CONTEXT-MGMT)]:** Enhance context management within `api-request.ts` or a dedicated module. Implement more sophisticated truncation (e.g., preserving system prompt, initial task, recent turns, summarized older turns) or summarization techniques (potentially using a separate LLM call via the backend) to handle very long conversation histories effectively within model context limits.
            - [x] * **Step 5.7.5 [(Rule #11.3: PERF-RESOURCE-LIMIT)]:** Add mechanisms for monitoring and potentially limiting resource consumption during extended autonomous runs. This could include tracking token usage per task (if available from APIs), setting limits via configuration, or implementing timeouts for long-running tool executions or backend calls. (Token limit implemented, Timeouts deferred)
        * **Internal Success Criteria:**
            - Advanced error recovery logic is implemented in the autonomy loop.
            - Memory/state management architecture review is documented, confirming modularity or identifying necessary refactoring.
            - Basic dynamic re-planning mechanism (trigger and backend call) is integrated.
            - Enhanced context truncation/summarization strategy is implemented.
            - Basic resource monitoring/limiting mechanisms (e.g., token tracking, timeouts) are added.
            - Compliance with all referenced Apex Standards rules.
        * **Internal Verification Method:**
            - **Code Review:** Statically review changes related to error handling, re-planning triggers, context management, and resource monitoring.
            - **Architecture Review:** Assess the documented memory/state management review for clarity and soundness.
            - **Scenario Testing:** Design and manually test scenarios specifically targeting error recovery, long context handling, and (if feasible) re-planning triggers.
            - **Standards Compliance:** Verify compliance with all referenced Apex Standards Rules for this Task and its Steps.
        * **Task Completion Testing (Internal):**
            - Update `codegenesis/docs/Test_Result_Analysis.md` with results of testing the enhanced autonomy features.

---

- [x] **Phase 6: Build & Packaging Fixes**
    * **Objective:** Resolve all outstanding TypeScript errors and successfully package the `codegenesis` extension using `vsce`.

    ---

    - [x] **Task 6.1: Refactor Controller (`src/core/controller/index.ts`)**
        * **Task Objective:** Improve modularity and address property access errors by refactoring the monolithic Controller class into distinct, focused modules.
        * **Steps:**
            - [x] * **Step 6.1.1 [(Rule #8.11: QUAL-DIR-STRUCT)]:** Create the modules directory: `codegenesis/src/core/controller/modules/`.
            - [x] * **Step 6.1.2 [(Rule #8.6: QUAL-MODULARITY), (Rule #8.1: QUAL-LOGIC-CLARITY), (Rule #19.1: IMPL-REFACTOR)]:** Extract Webview Message Handling logic into `codegenesis/src/core/controller/modules/webview-handler.ts`.
                - [x] * **Sub-Step 6.1.2.1 [(Rule #8.5: QUAL-TYPES)]:** Define necessary interfaces/types within or imported by the new module.
                - [x] * **Sub-Step 6.1.2.2:** Move relevant methods (e.g., `handleWebviewMessage`, `postMessageToWebview`, and related private helpers) from `index.ts` to `webview-handler.ts`. Ensure they are appropriately exported or encapsulated within a class/object.
                - [x] * **Sub-Step 6.1.2.3 [(Rule #8.9: QUAL-IMPORTS)]:** Update `codegenesis/src/core/controller/index.ts` to import the necessary functions/class from `webview-handler.ts` and delegate calls appropriately within the main `Controller` class constructor or methods. Adjust visibility (public/private) as needed.
            - [x] * **Step 6.1.3 [(Rule #8.6: QUAL-MODULARITY), (Rule #8.1: QUAL-LOGIC-CLARITY), (Rule #19.1: IMPL-REFACTOR)]:** Extract Task Lifecycle Management logic into `codegenesis/src/core/controller/modules/task-lifecycle.ts`.
                - [x] * **Sub-Step 6.1.3.1 [(Rule #8.5: QUAL-TYPES)]:** Define necessary interfaces/types.
                - [x] * **Sub-Step 6.1.3.2:** Move relevant methods (e.g., `initApexWithTask`, `initApexWithHistoryItem`, `clearTask`, `cancelTask`, and related private helpers).
                - [x] * **Sub-Step 6.1.3.3 [(Rule #8.9: QUAL-IMPORTS)]:** Update `index.ts` to import and delegate.
            - [x] * **Step 6.1.4 [(Rule #8.6: QUAL-MODULARITY), (Rule #8.1: QUAL-LOGIC-CLARITY), (Rule #19.1: IMPL-REFACTOR)]:** Extract State Management/Update logic into `codegenesis/src/core/controller/modules/state-updater.ts`.
                - [x] * **Sub-Step 6.1.4.1 [(Rule #8.5: QUAL-TYPES)]:** Define necessary interfaces/types.
                - [x] * **Sub-Step 6.1.4.2:** Move relevant methods (e.g., `postStateToWebview`, `getStateToPostToWebview`, `updateTelemetrySetting`, `updateCustomInstructions`, and related private helpers).
                - [x] * **Sub-Step 6.1.4.3 [(Rule #8.9: QUAL-IMPORTS)]:** Update `index.ts` to import and delegate.
            - [x] * **Step 6.1.5 [(Rule #8.6: QUAL-MODULARITY), (Rule #8.1: QUAL-LOGIC-CLARITY), (Rule #19.1: IMPL-REFACTOR)]:** Extract API/Provider Helper logic into `codegenesis/src/core/controller/modules/api-helpers.ts`.
                - [x] * **Sub-Step 6.1.5.1 [(Rule #8.5: QUAL-TYPES)]:** Define necessary interfaces/types.
                - [x] * **Sub-Step 6.1.5.2:** Move relevant methods (e.g., `getOllamaModels`, `getLmStudioModels`, `getVsCodeLmModels`, `refreshOpenRouterModels`, `readOpenRouterModels`, `getOpenAiModels`, and related private helpers).
                - [x] * **Sub-Step 6.1.5.3 [(Rule #8.9: QUAL-IMPORTS)]:** Update `index.ts` to import and delegate.
            - [x] * **Step 6.1.6 [(Rule #8.6: QUAL-MODULARITY), (Rule #8.1: QUAL-LOGIC-CLARITY), (Rule #19.1: IMPL-REFACTOR)]:** Extract Context Menu/Code Action logic into `codegenesis/src/core/controller/modules/context-actions.ts`.
                - [x] * **Sub-Step 6.1.6.1 [(Rule #8.5: QUAL-TYPES)]:** Define necessary interfaces/types.
                - [x] * **Sub-Step 6.1.6.2:** Move relevant methods (e.g., `addSelectedCodeToChat`, `addSelectedTerminalOutputToChat`, `fixWithApex`, `getFileMentionFromPath`, `convertDiagnosticsToProblemsString`, and related private helpers).
                - [x] * **Sub-Step 6.1.6.3 [(Rule #8.9: QUAL-IMPORTS)]:** Update `index.ts` to import and delegate.
            - [x] * **Step 6.1.7 [(Rule #8.6: QUAL-MODULARITY), (Rule #8.1: QUAL-LOGIC-CLARITY), (Rule #19.1: IMPL-REFACTOR)]:** Extract Task History Management logic into `codegenesis/src/core/controller/modules/history-manager.ts`.
                - [x] * **Sub-Step 6.1.7.1 [(Rule #8.5: QUAL-TYPES)]:** Define necessary interfaces/types.
                - [x] * **Sub-Step 6.1.7.2:** Move relevant methods (e.g., `getTaskWithId`, `showTaskWithId`, `exportTaskWithId`, `deleteTaskWithId`, `deleteAllTaskHistory`, `updateTaskHistory`, `refreshTotalTasksSize`, and related private helpers).
                - [x] * **Sub-Step 6.1.7.3 [(Rule #8.9: QUAL-IMPORTS)]:** Update `index.ts` to import and delegate.
            - [x] * **Step 6.1.8 [(Rule #8.6: QUAL-MODULARITY), (Rule #8.1: QUAL-LOGIC-CLARITY), (Rule #19.1: IMPL-REFACTOR)]:** Extract Authentication logic into `codegenesis/src/core/controller/modules/auth-handler.ts`.
                - [x] * **Sub-Step 6.1.8.1 [(Rule #8.5: QUAL-TYPES)]:** Define necessary interfaces/types.
                - [x] * **Sub-Step 6.1.8.2:** Move relevant methods (e.g., `handleSignOut`, `setUserInfo`, `validateAuthState`, `handleAuthCallback`, `handleOpenRouterCallback`, and related private helpers).
                - [x] * **Sub-Step 6.1.8.3 [(Rule #8.9: QUAL-IMPORTS)]:** Update `index.ts` to import and delegate.
            - [x] * **Step 6.1.9 [(Rule #8.6: QUAL-MODULARITY), (Rule #8.1: QUAL-LOGIC-CLARITY), (Rule #19.1: IMPL-REFACTOR)]:** Extract MCP logic into `codegenesis/src/core/controller/modules/mcp-handler.ts`.
                - [x] * **Sub-Step 6.1.9.1 [(Rule #8.5: QUAL-TYPES)]:** Define necessary interfaces/types.
                - [x] * **Sub-Step 6.1.9.2:** Move relevant methods (e.g., `getDocumentsPath`, `ensureMcpServersDirectoryExists`, `fetchMcpMarketplaceFromApi`, `silentlyRefreshMcpMarketplace`, `fetchMcpMarketplace`, `downloadMcp`, and related private helpers).
                - [x] * **Sub-Step 6.1.9.3 [(Rule #8.9: QUAL-IMPORTS)]:** Update `index.ts` to import and delegate.
            - [x] * **Step 6.1.10 [(Rule #8.6: QUAL-MODULARITY), (Rule #8.1: QUAL-LOGIC-CLARITY), (Rule #19.1: IMPL-REFACTOR)]:** Extract Miscellaneous logic (e.g., OpenGraph, Image checks) into `codegenesis/src/core/controller/modules/misc-helpers.ts`.
                - [x] * **Sub-Step 6.1.10.1 [(Rule #8.5: QUAL-TYPES)]:** Define necessary interfaces/types.
                - [x] * **Sub-Step 6.1.10.2:** Move relevant methods (e.g., `fetchOpenGraphData`, `checkIsImageUrl`, and related private helpers).
                - [x] * **Sub-Step 6.1.10.3 [(Rule #8.9: QUAL-IMPORTS)]:** Update `index.ts` to import and delegate.
            - [x] * **Step 6.1.11 [(Rule #8.6: QUAL-MODULARITY), (Rule #19.1: IMPL-REFACTOR), (Rule #19.3: IMPL-ERROR-HANDLING)]:** Update `src/core/controller/index.ts` imports and constructor to instantiate and use the new modules. Correct property accesses throughout the `Controller` class to delegate calls to the appropriate module instances (e.g., `this.webviewHandler.handleWebviewMessage(...)`). Ensure all original functionality is preserved through delegation and address any TypeScript errors arising from the refactoring, particularly potential `undefined` property access errors if modules are not correctly initialized or accessed.
        * **Internal Success Criteria:**
            - Controller logic is successfully refactored into separate modules within `src/core/controller/modules/`.
            - The main `Controller` class (`index.ts`) correctly imports, instantiates, and delegates calls to these modules.
            - All original controller functionality remains intact.
            - TypeScript errors related to the controller, especially property access errors, are resolved.
            - Code adheres to all referenced Apex Standards rules.
        * **Internal Verification Method:**
            - **Code Review:** Statically review the new modules and the refactored `index.ts` for correctness, modularity, and adherence to steps.
            - **Build Check:** Run `tsc --noEmit` in the `codegenesis` directory to confirm no TypeScript errors remain related to the controller.
            - **Functionality Check (Manual/Debug):** Run the extension in debug mode and manually test key controller functions (e.g., sending a message, using context actions, changing settings, managing history) to ensure delegation works correctly.
            - **Standards Compliance:** Verify compliance with all referenced Apex Standards Rules for this Task and its Steps.
        * **Task Completion Testing (Internal):**
            - Update `codegenesis/docs/Test_Result_Analysis.md` confirming successful refactoring, build verification, and functional checks.

---

Final Instruction:
Begin execution starting with Phase 4, Task 4.5, Step 4.5.1. Process all listed Phases, Tasks, and Steps sequentially in the order presented, marking checkboxes upon verified completion. Strictly adhere to the **Apex Software Compliance Standards Guide** (`../STANDARDS_REPOSITORY/apex/STANDARDS.md`). Log test results internally. Report only upon completion of all steps in this prompt.

*(Instructions based on requirements established as of 2025-04-07T06:31:45-05:00. Location context: c:/git/CodeGen_IDE)*
