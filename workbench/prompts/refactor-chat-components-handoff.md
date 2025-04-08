Subject: [SESSION HANDOFF] Continue Refactoring Chat UI Components (Phases 3-5)

## C. Directive Section
*   **Objective:** Continue refactoring the large React components, focusing now on `ChatRow.tsx` (Phase 3) and `BrowserSessionRow.tsx` (Phase 4), followed by final integration and verification (Phase 5). The goal remains to decompose these into smaller, more focused sub-components and custom hooks to improve maintainability, readability, and testability, aiming for individual file sizes closer to 300-500 LLOC where feasible.
*   **Execution Mode:** Autonomous.
*   **Sequential Execution:** Mandatory. Complete all steps for one component before starting the next, following the Phase/Task/Step hierarchy. Mark checkboxes (`- [x]`) only upon successful verification.
*   **Apex Standards:** Adherence to `../apex/STANDARDS.md` is **MANDATORY**. All relevant rules apply, especially `QUAL-SIZE` (Rule #16), `QUAL-DRY` (Rule #19), `QUAL-FMT` (Rule #17), `QUAL-NAME` (Rule #18), `DOC-API` (Rule #56), `DOC-INT` (Rule #57), `IMPL-REQ` (Rule #60), and `FINAL-SWEEP` (Rule #62).
*   **Reporting:** Disabled until final completion.
*   **Internal Logging:** Log test results per `Test Reporting Protocol`.
*   **Handoff Context:** Phases 1 (ChatView.tsx) and 2 (ChatTextArea.tsx) have been completed and verified via build. Manual testing/verification is pending. Proceed with Phase 3.

## D. Test Reporting Protocol (Internal)
*   **Location:** `codegenesis/docs/Test_Result_Analysis.md`
*   **Data Points:** Date/Time, Scope (e.g., "ChatRow Refactor Build"), Pass/Fail Status, ESLint Warnings Count, TypeScript Errors Count, Findings/Notes.
*   **Frequency:** After each `npm run package` execution (Task Completion Testing).

## E. Hierarchical Execution Blocks (Remaining Work)
---
- [ ] **Phase 3: Refactor `ChatRow.tsx`**
    *   **Objective:** Decompose `ChatRow.tsx` to separate the rendering logic for different message types and complex elements like code blocks and tool outputs.
    - [ ] **Task 3.1: Analyze `ChatRow.tsx`**
        - [ ] * **Step 3.1.1:** Read and analyze `codegenesis/webview-ui/src/components/chat/ChatRow.tsx` to identify rendering logic for different `message.say` and `message.ask` types (API requests, tool calls, commands, errors, user feedback, markdown, etc.). (Rule #16: QUAL-SIZE)
    - [ ] **Task 3.2: Create `ChatRow` Subdirectory and Modules**
        - [ ] * **Step 3.2.1:** Create directory `codegenesis/webview-ui/src/components/chat/ChatRow/`. (Rule #12: CONF-EXT)
        - [ ] * **Step 3.2.2:** Create `MessageHeader.tsx` component file for rendering the icon/title row. (Rule #16: QUAL-SIZE)
        - [ ] * **Step 3.2.3:** Create `ToolCallRenderer.tsx` component file. (Rule #16: QUAL-SIZE)
        - [ ] * **Step 3.2.4:** Create `CommandRenderer.tsx` component file. (Rule #16: QUAL-SIZE)
        - [ ] * **Step 3.2.5:** Create `ApiRequestRenderer.tsx` component file. (Rule #16: QUAL-SIZE)
        - [ ] * **Step 3.2.6:** Create `McpRenderer.tsx` component file for MCP tool/resource asks. (Rule #16: QUAL-SIZE)
        - [ ] * **Step 3.2.7:** Create `FeedbackRenderer.tsx` component file for user feedback messages. (Rule #16: QUAL-SIZE)
        - [ ] * **Step 3.2.8:** Create `DefaultMessageRenderer.tsx` component file for standard markdown/text messages. (Rule #16: QUAL-SIZE)
    - [ ] **Task 3.3: Refactor Header Logic into `MessageHeader.tsx`**
        - [ ] * **Step 3.3.1:** Move the `useMemo` hook calculating `icon` and `title` and the corresponding JSX (`headerStyle` div) into `MessageHeader.tsx`. (Rule #12: DES-MODULARITY), (Rule #19: QUAL-DRY)
        - [ ] * **Step 3.3.2:** Pass necessary props (`message`, `isCommandExecuting`, `isMcpServerResponding`, `cost`, `apiReqCancelReason`, `apiRequestFailedMessage`, etc.). (Rule #56: DOC-API)
        - [ ] * **Step 3.3.3:** Update `ChatRowContent` to render `MessageHeader`. (Rule #60: IMPL-REQ)
    - [ ] **Task 3.4: Refactor Tool Rendering into `ToolCallRenderer.tsx`**
        - [ ] * **Step 3.4.1:** Move the logic checking `if (tool)` and the subsequent `switch (tool.tool)` statement rendering `CodeAccordian` or file links into `ToolCallRenderer.tsx`. (Rule #12: DES-MODULARITY)
        - [ ] * **Step 3.4.2:** Pass the `tool` object, `isExpanded`, and `onToggleExpand` as props. (Rule #56: DOC-API)
        - [ ] * **Step 3.4.3:** Update `ChatRowContent` to render `ToolCallRenderer` when `tool` is not null. (Rule #60: IMPL-REQ)
    - [ ] **Task 3.5: Refactor Command Rendering into `CommandRenderer.tsx`**
        - [ ] * **Step 3.5.1:** Move the logic checking `if (message.ask === "command" || message.say === "command")` and the rendering of the command and its expandable output into `CommandRenderer.tsx`. (Rule #12: DES-MODULARITY)
        - [ ] * **Step 3.5.2:** Pass `message`, `isExpanded`, `onToggleExpand`, `icon`, and `title` as props. (Rule #56: DOC-API)
        - [ ] * **Step 3.5.3:** Update `ChatRowContent` to render `CommandRenderer` for command messages. (Rule #60: IMPL-REQ)
    - [ ] **Task 3.6: Refactor API Request Rendering into `ApiRequestRenderer.tsx`**
        - [ ] * **Step 3.6.1:** Move the logic for `message.say === "api_req_started"` (including header, badge, error display, and expandable code accordian) into `ApiRequestRenderer.tsx`. (Rule #12: DES-MODULARITY)
        - [ ] * **Step 3.6.2:** Pass `message`, `isExpanded`, `onToggleExpand`, `icon`, `title`, `cost`, `apiRequestFailedMessage`, `apiReqStreamingFailedMessage` as props. (Rule #56: DOC-API)
        - [ ] * **Step 3.6.3:** Update `ChatRowContent` to render `ApiRequestRenderer`. (Rule #60: IMPL-REQ)
    - [ ] **Task 3.7: Refactor MCP Rendering into `McpRenderer.tsx`**
        - [ ] * **Step 3.7.1:** Move the logic for `message.ask === "use_mcp_server" || message.say === "use_mcp_server"` into `McpRenderer.tsx`. (Rule #12: DES-MODULARITY)
        - [ ] * **Step 3.7.2:** Pass `message`, `icon`, `title`, `mcpServers`, `mcpMarketplaceCatalog`, `isExpanded`, `onToggleExpand` as props. (Rule #56: DOC-API)
        - [ ] * **Step 3.7.3:** Update `ChatRowContent` to render `McpRenderer`. (Rule #60: IMPL-REQ)
    - [ ] **Task 3.8: Refactor Feedback Rendering into `FeedbackRenderer.tsx`**
        - [ ] * **Step 3.8.1:** Move the logic for `message.say === "user_feedback"` and `message.say === "user_feedback_diff"` into `FeedbackRenderer.tsx`. (Rule #12: DES-MODULARITY)
        - [ ] * **Step 3.8.2:** Pass `message`, `isExpanded`, `onToggleExpand` as props. (Rule #56: DOC-API)
        - [ ] * **Step 3.8.3:** Update `ChatRowContent` to render `FeedbackRenderer`. (Rule #60: IMPL-REQ)
    - [ ] **Task 3.9: Refactor Default Rendering into `DefaultMessageRenderer.tsx`**
        - [ ] * **Step 3.9.1:** Move the default rendering logic (e.g., for `say: "text"`, `ask: "followup"`, `ask: "plan_mode_respond"`, `say: "error"`, etc.) that primarily involves rendering markdown and potentially `OptionsButtons` into `DefaultMessageRenderer.tsx`. (Rule #12: DES-MODULARITY)
        - [ ] * **Step 3.9.2:** Pass `message`, `icon`, `title`, `isLast`, `lastModifiedMessage` as props. (Rule #56: DOC-API)
        - [ ] * **Step 3.9.3:** Update `ChatRowContent` to use `DefaultMessageRenderer` as the fallback within its main switch/if structure. (Rule #60: IMPL-REQ)
    - [ ] **Task 3.10: Finalize `ChatRow.tsx` Refactoring**
        - [ ] * **Step 3.10.1:** Simplify `ChatRowContent` to primarily act as a dispatcher, determining which specialized renderer component to use based on `message.type`, `message.say`, or `message.ask`, and passing the necessary props. Remove direct rendering logic for specific message types. (Rule #12: DES-MODULARITY), (Rule #16: QUAL-SIZE)
        - [ ] * **Step 3.10.2:** Ensure `ChatRow` itself remains a simple wrapper handling the `useSize` hook and checkpoint overlay logic. (Rule #60: IMPL-REQ)
    - [ ] **Task 3.11: Verification for `ChatRow` Refactor**
        *   **Internal Success Criteria:** `ChatRow.tsx` and `ChatRowContent` are significantly smaller; rendering logic for different message types is encapsulated; functionality remains identical; no new build errors. Compliance with all referenced Apex Standards Rules.
        *   **Internal Verification Method:** Run `npm run package` in `codegenesis/`. Check for build errors. Manually inspect various message types in the chat UI (commands, tool calls, API requests, errors, user feedback, standard text) to ensure they render correctly. Test message expansion. Verify compliance with all referenced Apex Standards Rules for this Task and its Steps.
        *   **Task Completion Testing (Internal):** Update `codegenesis/docs/Test_Result_Analysis.md` with build results.

---
- [ ] **Phase 4: Refactor `BrowserSessionRow.tsx`**
    *   **Objective:** Decompose `BrowserSessionRow.tsx` to separate the browser state display (URL, screenshot, logs) and the rendering of individual actions within a session.
    - [ ] **Task 4.1: Analyze `BrowserSessionRow.tsx`**
        - [ ] * **Step 4.1.1:** Read and analyze `codegenesis/webview-ui/src/components/chat/BrowserSessionRow.tsx` to identify distinct responsibilities (page state calculation, screenshot/URL/log display, action rendering, pagination). (Rule #16: QUAL-SIZE)
    - [ ] **Task 4.2: Create `BrowserSessionRow` Subdirectory and Modules**
        - [ ] * **Step 4.2.1:** Create directory `codegenesis/webview-ui/src/components/chat/BrowserSessionRow/`. (Rule #12: CONF-EXT)
        - [ ] * **Step 4.2.2:** Create `BrowserStateDisplay.tsx` component file. (Rule #16: QUAL-SIZE)
        - [ ] * **Step 4.2.3:** Create `BrowserActionList.tsx` component file. (Rule #16: QUAL-SIZE)
        - [ ] * **Step 4.2.4:** Create `BrowserPagination.tsx` component file. (Rule #16: QUAL-SIZE)
    - [ ] **Task 4.3: Refactor State Display into `BrowserStateDisplay.tsx`**
        - [ ] * **Step 4.3.1:** Move the JSX responsible for rendering the URL bar, screenshot area (including image, placeholder, cursor), and expandable console logs into `BrowserStateDisplay.tsx`. (Rule #12: DES-MODULARITY)
        - [ ] * **Step 4.3.2:** Pass `displayState`, `browserSettings`, `mousePosition`, `consoleLogsExpanded`, `setConsoleLogsExpanded`, `maxWidth`, `shouldShowSettings` as props. (Rule #56: DOC-API)
        - [ ] * **Step 4.3.3:** Update `BrowserSessionRow` to render `BrowserStateDisplay`. (Rule #60: IMPL-REQ)
    - [ ] **Task 4.4: Refactor Action Rendering into `BrowserActionList.tsx`**
        - [ ] * **Step 4.4.1:** Move the `actionContent` definition (including the mapping over `currentPage?.nextAction?.messages` and rendering `BrowserSessionRowContent`) into `BrowserActionList.tsx`. Also move the related `BrowserSessionRowContent` and `BrowserActionBox` components into this file or a shared utility file within the subdirectory. (Rule #12: DES-MODULARITY), (Rule #16: QUAL-SIZE)
        - [ ] * **Step 4.4.2:** Pass `currentPage`, `isBrowsing`, `initialUrl`, `messages` (or relevant subset), `isExpanded`, `onToggleExpand`, `lastModifiedMessage`, `isLast`, `setMaxActionHeight` as props. (Rule #56: DOC-API)
        - [ ] * **Step 4.4.3:** Update `BrowserSessionRow` to render `BrowserActionList`. (Rule #60: IMPL-REQ)
    - [ ] **Task 4.5: Refactor Pagination into `BrowserPagination.tsx`**
        - [ ] * **Step 4.5.1:** Move the pagination JSX (Step X of Y, Previous/Next buttons) into `BrowserPagination.tsx`. (Rule #12: DES-MODULARITY)
        - [ ] * **Step 4.5.2:** Pass `currentPageIndex`, `totalPages` (calculated as `pages.length`), `isBrowsing`, `setCurrentPageIndex` as props. (Rule #56: DOC-API)
        - [ ] * **Step 4.5.3:** Update `BrowserSessionRow` to render `BrowserPagination` conditionally. (Rule #60: IMPL-REQ)
    - [ ] **Task 4.6: Finalize `BrowserSessionRow.tsx` Refactoring**
        - [ ] * **Step 4.6.1:** Simplify `BrowserSessionRow` to manage state related to page calculation (`pages`, `currentPageIndex`, `latestState`, `displayState`), determine `isBrowsing`, and render the header, `BrowserStateDisplay`, `BrowserActionList`, and `BrowserPagination`. (Rule #12: DES-MODULARITY), (Rule #16: QUAL-SIZE)
        - [ ] * **Step 4.6.2:** Remove logic and JSX moved to sub-components. (Rule #19: QUAL-DRY)
    - [ ] **Task 4.7: Verification for `BrowserSessionRow` Refactor**
        *   **Internal Success Criteria:** `BrowserSessionRow.tsx` is significantly smaller; state display, action rendering, and pagination are encapsulated; functionality remains identical; no new build errors. Compliance with all referenced Apex Standards Rules.
        *   **Internal Verification Method:** Run `npm run package` in `codegenesis/`. Check for build errors. Manually test browser sessions in the UI, including pagination, state display (URL, screenshot, logs), and action rendering. Verify compliance with all referenced Apex Standards Rules for this Task and its Steps.
        *   **Task Completion Testing (Internal):** Update `codegenesis/docs/Test_Result_Analysis.md` with build results.

---
- [ ] **Phase 5: Final Integration and Verification**
    *   **Objective:** Ensure all refactored components integrate correctly and the application functions as expected.
    - [ ] **Task 5.1: Comprehensive Build and Linting**
        - [ ] * **Step 5.1.1:** Run `npm run package` within `codegenesis/` directory. (Rule #55: TOOL-ZERO-WARN)
        - [ ] * **Step 5.1.2:** Verify the build completes with zero TypeScript errors and zero ESLint errors (warnings should ideally be addressed but are not blockers if justified). (Rule #55: TOOL-ZERO-WARN)
    - [ ] **Task 5.2: Manual Smoke Testing**
        - [ ] * **Step 5.2.1:** Install the packaged VSIX locally.
        - [ ] * **Step 5.2.2:** Perform manual smoke tests covering core chat functionalities: sending messages, receiving responses, context mentions, image handling, tool usage display (file edits, commands), browser session display, pagination, mode switching, model selection, message expansion/collapse, scrolling. (Rule #33: TEST-REQ-COVERAGE)
    - [ ] **Task 5.3: Final Standards Compliance Check**
        - [ ] * **Step 5.3.1:** Perform a final review of the refactored code against the Apex Standards Guide, focusing on `QUAL-*`, `DOC-*`, and `IMPL-*` rules. (Rule #62: FINAL-SWEEP)
    - [ ] **Task 5.4: Verification for Final Integration**
        *   **Internal Success Criteria:** Build successful with no errors; manual smoke tests pass; final standards review confirms compliance.
        *   **Internal Verification Method:** Review build logs; execute manual test checklist; review standards compliance checklist. Verify compliance with all referenced Apex Standards Rules for this Task and its Steps.
        *   **Task Completion Testing (Internal):** Update `codegenesis/docs/Test_Result_Analysis.md` with final build and test results.

---
## F. Final Instruction
Begin execution of the plan sequentially, starting with Phase 3, Task 3.1. Mark each Step/Task/Phase checkbox (`- [x]`) only upon successful completion and verification against its `Internal Success Criteria` and all referenced Apex Standards (`../apex/STANDARDS.md`). Log test results internally per the protocol. Report ONLY upon successful completion of all phases or if an unrecoverable error occurs.

## G. Contextual Footer
*(Instructions based on requirements established as of 2025-04-07 1:15 PM (America/Chicago, UTC-5:00). Location context: c:/git/CodeGen_IDE. Handoff after completion of Phase 2.)*
