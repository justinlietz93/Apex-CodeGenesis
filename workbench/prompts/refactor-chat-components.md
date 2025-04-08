Subject: Refactor Chat UI Components for Modularity

## C. Directive Section
*   **Objective:** Refactor the large React components `ChatView.tsx`, `ChatTextArea.tsx`, `ChatRow.tsx`, and `BrowserSessionRow.tsx` into smaller, more focused sub-components and custom hooks to improve maintainability, readability, and testability, aiming for individual file sizes closer to 300-500 LLOC where feasible.
*   **Execution Mode:** Autonomous.
*   **Sequential Execution:** Mandatory. Complete all steps for one component before starting the next, following the Phase/Task/Step hierarchy. Mark checkboxes (`- [x]`) only upon successful verification.
*   **Apex Standards:** Adherence to `../apex/STANDARDS.md` is **MANDATORY**. All relevant rules apply, especially `QUAL-SIZE` (Rule #16), `QUAL-DRY` (Rule #19), `QUAL-FMT` (Rule #17), `QUAL-NAME` (Rule #18), `DOC-API` (Rule #56), `DOC-INT` (Rule #57), `IMPL-REQ` (Rule #60), and `FINAL-SWEEP` (Rule #62).
*   **Reporting:** Disabled until final completion.
*   **Internal Logging:** Log test results per `Test Reporting Protocol`.

## D. Test Reporting Protocol (Internal)
*   **Location:** `codegenesis/docs/Test_Result_Analysis.md`
*   **Data Points:** Date/Time, Scope (e.g., "ChatView Refactor Build"), Pass/Fail Status, ESLint Warnings Count, TypeScript Errors Count, Findings/Notes.
*   **Frequency:** After each `npm run package` execution (Task Completion Testing).

## E. Hierarchical Execution Blocks
---
- [x] **Phase 1: Refactor `ChatView.tsx`**
    *   **Objective:** Decompose `ChatView.tsx` into smaller components and hooks for managing layout, message list rendering, and state logic.
    - [x] **Task 1.1: Analyze `ChatView.tsx`**
        - [x] * **Step 1.1.1:** Read and analyze `codegenesis/webview-ui/src/components/chat/ChatView.tsx` to identify distinct responsibilities (welcome screen, message list, input area, state derivation, scroll management). (Rule #16: QUAL-SIZE)
    - [x] **Task 1.2: Create `ChatView` Subdirectory and Initial Modules**
        - [x] * **Step 1.2.1:** Create directory `codegenesis/webview-ui/src/components/chat/ChatView/`. (Rule #12: CONF-EXT)
        - [x] * **Step 1.2.2:** Create `ChatViewWelcome.tsx` within the new directory. (Rule #16: QUAL-SIZE)
        - [x] * **Step 1.2.3:** Move the JSX responsible for rendering the initial welcome screen (when `task` is null) from `ChatView.tsx` to `ChatViewWelcome.tsx`. Ensure all necessary props (`version`, `telemetrySetting`, `showAnnouncement`, `hideAnnouncement`, `taskHistory`, `showHistoryView`) are passed and typed correctly. (Rule #19: QUAL-DRY), (Rule #56: DOC-API)
        - [x] * **Step 1.2.4:** Adjust import paths within `ChatViewWelcome.tsx` for `HistoryPreview`, `TelemetryBanner`, and `Announcement`. (Rule #60: IMPL-REQ)
        - [x] * **Step 1.2.5:** Create `ChatMessageList.tsx` within the new directory. (Rule #16: QUAL-SIZE)
        - [x] * **Step 1.2.6:** Create `ChatInputArea.tsx` within the new directory. (Rule #16: QUAL-SIZE)
        - [x] * **Step 1.2.7:** Create `useChatViewState.ts` hook file within the new directory. (Rule #16: QUAL-SIZE)
        - [x] * **Step 1.2.8:** Create `useChatScrollManager.ts` hook file within the new directory. (Rule #16: QUAL-SIZE)
    - [x] **Task 1.3: Refactor State Logic into `useChatViewState` Hook**
        - [x] * **Step 1.3.1:** Move state variables (`apexAsk`, `enableButtons`, `primaryButtonText`, `secondaryButtonText`, `didClickCancel`) and the `useDeepCompareEffect` logic that derives them from `messages` into `useChatViewState.ts`. (Rule #12: DES-MODULARITY), (Rule #19: QUAL-DRY)
        - [x] * **Step 1.3.2:** Ensure the hook returns the derived state variables. (Rule #60: IMPL-REQ)
        - [x] * **Step 1.3.3:** Update `ChatView.tsx` to use the `useChatViewState` hook. (Rule #60: IMPL-REQ)
    - [x] **Task 1.4: Refactor Scroll Logic into `useChatScrollManager` Hook**
        - [x] * **Step 1.4.1:** Move scroll-related state (`showScrollToBottom`, `isAtBottom`), refs (`virtuosoRef`, `scrollContainerRef`, `disableAutoScrollRef`), and effects/callbacks (`scrollToBottomSmooth`, `scrollToBottomAuto`, `handleWheel`, scroll effects related to message length/expansion) into `useChatScrollManager.ts`. (Rule #12: DES-MODULARITY), (Rule #19: QUAL-DRY)
        - [x] * **Step 1.4.2:** Ensure the hook accepts necessary dependencies (like `groupedMessages.length`) and returns refs, state, and handler functions. (Rule #56: DOC-API)
        - [x] * **Step 1.4.3:** Update `ChatView.tsx` (and later `ChatMessageList.tsx`) to use this hook. (Rule #60: IMPL-REQ)
    - [x] **Task 1.5: Refactor Message List Rendering into `ChatMessageList.tsx`**
        - [x] * **Step 1.5.1:** Move the `Virtuoso` component and related logic (`groupedMessages`, `itemContent`, `toggleRowExpansion`, `handleRowHeightChange`, `expandedRows` state) into `ChatMessageList.tsx`. (Rule #12: DES-MODULARITY), (Rule #16: QUAL-SIZE)
        - [x] * **Step 1.5.2:** Pass necessary props (e.g., `groupedMessages`, `modifiedMessages`, `lastModifiedMessage`) and integrate the `useChatScrollManager` hook. (Rule #56: DOC-API)
        - [x] * **Step 1.5.3:** Update `ChatView.tsx` to render `ChatMessageList`. (Rule #60: IMPL-REQ)
    - [x] **Task 1.6: Refactor Input Area into `ChatInputArea.tsx`**
        - [x] * **Step 1.6.1:** Move the `ChatTextArea` component and its associated controls (`AutoApproveMenu`, primary/secondary buttons, scroll-to-bottom button) into `ChatInputArea.tsx`. (Rule #12: DES-MODULARITY), (Rule #16: QUAL-SIZE)
        - [x] * **Step 1.6.2:** Pass necessary props (`inputValue`, `setInputValue`, `textAreaDisabled`, `placeholderText`, `selectedImages`, `setSelectedImages`, `onSend`, `onSelectImages`, `shouldDisableImages`, button states/handlers from `useChatViewState`, scroll handlers from `useChatScrollManager`). (Rule #56: DOC-API)
        - [x] * **Step 1.6.3:** Update `ChatView.tsx` to render `ChatInputArea`. (Rule #60: IMPL-REQ)
    - [x] **Task 1.7: Finalize `ChatView.tsx` Refactoring**
        - [x] * **Step 1.7.1:** Update `ChatView.tsx` to import and render `ChatViewWelcome`, `TaskHeader`, `ChatMessageList`, and `ChatInputArea` based on the `task` state. (Rule #60: IMPL-REQ)
        - [x] * **Step 1.7.2:** Remove all logic and JSX that was moved to sub-components/hooks. (Rule #19: QUAL-DRY)
        - [x] * **Step 1.7.3:** Ensure all necessary props are passed down correctly. (Rule #60: IMPL-REQ)
    - [x] **Task 1.8: Verification for `ChatView` Refactor**
        *   **Internal Success Criteria:** `ChatView.tsx` is significantly smaller; core functionalities (welcome screen, message list, input area, state logic, scrolling) are encapsulated in separate modules/hooks; the application renders and functions identically to before the refactor; no TypeScript errors; ESLint warnings minimized. Compliance with all referenced Apex Standards Rules.
        *   **Internal Verification Method:** Run `npm run package` in `codegenesis/`. Check for build errors (TypeScript, ESLint). Manually inspect the rendered UI and test basic chat functionality (sending messages, scrolling, context menu, mode switching, welcome screen). Verify compliance with all referenced Apex Standards Rules for this Task and its Steps.
        *   **Task Completion Testing (Internal):** Update `codegenesis/docs/Test_Result_Analysis.md` with build results.

---
- [x] **Phase 2: Refactor `ChatTextArea.tsx`**
    *   **Objective:** Decompose `ChatTextArea.tsx` to isolate context mention logic, image thumbnail display, model selection UI, and mode switching UI.
    - [x] **Task 2.1: Analyze `ChatTextArea.tsx`**
        - [x] * **Step 2.1.1:** Read and analyze `codegenesis/webview-ui/src/components/chat/ChatTextArea.tsx` to identify distinct responsibilities (text input, context menu handling, image thumbnails, model selector, mode switch, controls layout). (Rule #16: QUAL-SIZE)
    - [x] **Task 2.2: Create `ChatTextArea` Subdirectory and Modules**
        - [x] * **Step 2.2.1:** Create directory `codegenesis/webview-ui/src/components/chat/ChatTextArea/`. (Rule #12: CONF-EXT)
        - [x] * **Step 2.2.2:** Create `useContextMentions.ts` hook file. (Rule #16: QUAL-SIZE)
        - [x] * **Step 2.2.3:** Create `ImageThumbnails.tsx` component file (if not already using a common one). (Rule #16: QUAL-SIZE)
        - [x] * **Step 2.2.4:** Create `ModelSelector.tsx` component file. (Rule #16: QUAL-SIZE)
        - [x] * **Step 2.2.5:** Create `ModeSwitch.tsx` component file. (Rule #16: QUAL-SIZE)
        - [x] * **Step 2.2.6:** Create `ChatControls.tsx` component file for the bottom button group. (Rule #16: QUAL-SIZE)
    - [x] **Task 2.3: Refactor Context Mention Logic into `useContextMentions` Hook**
        - [x] * **Step 2.3.1:** Move state (`showContextMenu`, `cursorPosition`, `searchQuery`, `selectedMenuIndex`, `selectedType`, `justDeletedSpaceAfterMention`, `intendedCursorPosition`, `gitCommits`), refs (`contextMenuContainerRef`), effects (`useEffect` for outside click, `useEffect` for git commits), and handlers (`handleMentionSelect`, `handleKeyDown` mention logic, `handleInputChange` mention logic, `handleBlur` mention logic, `handlePaste` mention logic, `updateHighlights`, `updateCursorPosition`, `handleKeyUp`) related to the `@` mention functionality into `useContextMentions.ts`. (Rule #12: DES-MODULARITY), (Rule #19: QUAL-DRY)
        - [x] * **Step 2.3.2:** The hook should accept `inputValue`, `setInputValue`, `textAreaRef`, `queryItems` as parameters and return necessary state (`showContextMenu`, `searchQuery`, `selectedMenuIndex`, `selectedType`) and handlers (`handleKeyDown`, `handleInputChange`, `handleBlur`, `handlePaste`, `handleKeyUp`, `handleMenuMouseDown`, `onMentionSelect`). (Rule #56: DOC-API)
        - [x] * **Step 2.3.3:** Update `ChatTextArea.tsx` to use the `useContextMentions` hook and render the `ContextMenu` component based on its state. (Rule #60: IMPL-REQ)
    - [x] **Task 2.4: Refactor Image Thumbnails**
        - [x] * **Step 2.4.1:** Move the `Thumbnails` component rendering and related state/logic (`thumbnailsHeight`, `handleThumbnailsHeightChange`, `useEffect` for clearing height) into `ImageThumbnails.tsx` (or confirm usage of existing common component). Pass necessary props (`selectedImages`, `setSelectedImages`, `onHeightChange`). (Rule #12: DES-MODULARITY)
        - [x] * **Step 2.4.2:** Update `ChatTextArea.tsx` to render the `ImageThumbnails` component. (Rule #60: IMPL-REQ)
    - [x] **Task 2.5: Refactor Model Selector into `ModelSelector.tsx`**
        - [x] * **Step 2.5.1:** Move the model selector button (`ModelDisplayButton`), tooltip (`ModelSelectorTooltip`), related state (`showModelSelector`, `arrowPosition`, `menuPosition`), refs (`modelSelectorRef`, `buttonRef`, `prevShowModelSelector`), effects (`useEffect` for arrow/menu position, `useEffect` for menu close), handlers (`handleModelButtonClick`, `submitApiConfig`, `useClickAway`), and styled components (`ModelContainer`, `ModelButtonWrapper`, `ModelDisplayButton`, `ModelButtonContent`, `ModelSelectorTooltip`) into `ModelSelector.tsx`. (Rule #12: DES-MODULARITY), (Rule #16: QUAL-SIZE)
        - [x] * **Step 2.5.2:** Pass necessary props (`apiConfiguration`, `openRouterModels`). (Rule #56: DOC-API)
        - [x] * **Step 2.5.3:** Update `ChatTextArea.tsx` (or potentially `ChatControls.tsx`) to render the `ModelSelector` component. (Rule #60: IMPL-REQ)
    - [x] **Task 2.6: Refactor Mode Switch into `ModeSwitch.tsx`**
        - [x] * **Step 2.6.1:** Move the mode switch UI (`SwitchContainer`, `Slider`, `SwitchOption`), related state (`shownTooltipMode`), handlers (`onModeToggle`), and the `Tooltip` component into `ModeSwitch.tsx`. (Rule #12: DES-MODULARITY)
        - [x] * **Step 2.6.2:** Pass necessary props (`chatSettings`, `textAreaDisabled`, `showModelSelector`, `submitApiConfig`, `inputValue`, `selectedImages`). (Rule #56: DOC-API)
        - [x] * **Step 2.6.3:** Update `ChatTextArea.tsx` (or potentially `ChatControls.tsx`) to render the `ModeSwitch` component. (Rule #60: IMPL-REQ)
    - [x] **Task 2.7: Refactor Controls into `ChatControls.tsx`**
        - [x] * **Step 2.7.1:** Move the `ControlsContainer` JSX, including the `ButtonGroup` and its children (`@` button, image button, `ModelSelector`, `ModeSwitch`), into `ChatControls.tsx`. (Rule #12: DES-MODULARITY)
        - [x] * **Step 2.7.2:** Pass necessary props (`textAreaDisabled`, `shouldDisableImages`, `handleContextButtonClick`, `onSelectImages`, etc.). (Rule #56: DOC-API)
        - [x] * **Step 2.7.3:** Update `ChatTextArea.tsx` to render `ChatControls`. (Rule #60: IMPL-REQ)
    - [x] **Task 2.8: Finalize `ChatTextArea.tsx` Refactoring**
        - [x] * **Step 2.8.1:** Update `ChatTextArea.tsx` to primarily render the `DynamicTextArea`, the highlight layer, and the new sub-components (`ContextMenu`, `ImageThumbnails`, `ChatControls`). (Rule #60: IMPL-REQ)
        - [x] * **Step 2.8.2:** Remove all logic and JSX moved to sub-components/hooks. (Rule #19: QUAL-DRY)
        - [x] * **Step 2.8.3:** Ensure props are passed correctly between `ChatTextArea` and its new children/hooks. (Rule #60: IMPL-REQ)
    - [x] **Task 2.9: Verification for `ChatTextArea` Refactor**
        *   **Internal Success Criteria:** `ChatTextArea.tsx` is significantly smaller; context mentions, image thumbnails, model selector, mode switch, and controls are encapsulated; functionality remains identical; no new build errors. Compliance with all referenced Apex Standards Rules.
        *   **Internal Verification Method:** Run `npm run package` in `codegenesis/`. Check for build errors. Manually test context mentions, image adding/pasting, model selection, mode switching, and button interactions. Verify compliance with all referenced Apex Standards Rules for this Task and its Steps.
        *   **Task Completion Testing (Internal):** Update `codegenesis/docs/Test_Result_Analysis.md` with build results.

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
Begin execution of the plan sequentially, starting with Phase 1, Task 1.1. Mark each Step/Task/Phase checkbox (`- [x]`) only upon successful completion and verification against its `Internal Success Criteria` and all referenced Apex Standards (`../apex/STANDARDS.md`). Log test results internally per the protocol. Report ONLY upon successful completion of all phases or if an unrecoverable error occurs.

## G. Contextual Footer
*(Instructions based on requirements established as of 2025-04-07 11:58 AM (America/Chicago, UTC-5:00). Location context: c:/git/CodeGen_IDE)*
