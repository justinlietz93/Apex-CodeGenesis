# Phase 6: Build & Packaging Fixes

**Goal:** Resolve all outstanding TypeScript errors and successfully package the `codegenesis` extension using `vsce`.

## Task 6.1: Refactor Controller (`src/core/controller/index.ts`)

**Goal:** Improve modularity and address property access errors by refactoring the monolithic Controller class.

- [ ] **Step 6.1.1:** Create modules directory: `src/core/controller/modules/`.
- [ ] **Step 6.1.2:** Extract Webview Message Handling logic into `src/core/controller/modules/webview-handler.ts`.
  - [ ] Define necessary interfaces/types.
  - [ ] Move relevant methods (e.g., `handleWebviewMessage`, `postMessageToWebview`).
  - [ ] Update `index.ts` to import and delegate.
- [ ] **Step 6.1.3:** Extract Task Lifecycle Management logic into `src/core/controller/modules/task-lifecycle.ts`.
  - [ ] Move relevant methods (e.g., `initApexWithTask`, `initApexWithHistoryItem`, `clearTask`, `cancelTask`).
  - [ ] Update `index.ts` to import and delegate.
- [ ] **Step 6.1.4:** Extract State Management logic into `src/core/controller/modules/state-updater.ts`.
  - [ ] Move relevant methods (e.g., `postStateToWebview`, `getStateToPostToWebview`, `updateTelemetrySetting`, `updateCustomInstructions`).
  - [ ] Update `index.ts` to import and delegate.
- [ ] **Step 6.1.5:** Extract API/Provider Helper logic into `src/core/controller/modules/api-helpers.ts`.
  - [ ] Move relevant methods (e.g., `getOllamaModels`, `getLmStudioModels`, `getVsCodeLmModels`, `refreshOpenRouterModels`, `readOpenRouterModels`, `getOpenAiModels`).
  - [ ] Update `index.ts` to import and delegate.
- [ ] **Step 6.1.6:** Extract Context Menu/Code Action logic into `src/core/controller/modules/context-actions.ts`.
  - [ ] Move relevant methods (e.g., `addSelectedCodeToChat`, `addSelectedTerminalOutputToChat`, `fixWithApex`, `getFileMentionFromPath`, `convertDiagnosticsToProblemsString`).
  - [ ] Update `index.ts` to import and delegate.
- [ ] **Step 6.1.7:** Extract Task History Management logic into `src/core/controller/modules/history-manager.ts`.
  - [ ] Move relevant methods (e.g., `getTaskWithId`, `showTaskWithId`, `exportTaskWithId`, `deleteTaskWithId`, `deleteAllTaskHistory`, `updateTaskHistory`, `refreshTotalTasksSize`).
  - [ ] Update `index.ts` to import and delegate.
- [ ] **Step 6.1.8:** Extract Authentication logic into `src/core/controller/modules/auth-handler.ts`.
  - [ ] Move relevant methods (e.g., `handleSignOut`, `setUserInfo`, `validateAuthState`, `handleAuthCallback`, `handleOpenRouterCallback`).
  - [ ] Update `index.ts` to import and delegate.
- [ ] **Step 6.1.9:** Extract MCP logic into `src/core/controller/modules/mcp-handler.ts`.
  - [ ] Move relevant methods (e.g., `getDocumentsPath`, `ensureMcpServersDirectoryExists`, `fetchMcpMarketplaceFromApi`, `silentlyRefreshMcpMarketplace`, `fetchMcpMarketplace`, `downloadMcp`).
  - [ ] Update `index.ts` to import and delegate.
- [ ] **Step 6.1.10:** Extract Miscellaneous logic (e.g., OpenGraph, Image checks) into `src/core/controller/modules/misc-helpers.ts`.
  - [ ] Move relevant methods (e.g., `fetchOpenGraphData`, `checkIsImageUrl`).
  - [ ] Update `index.ts` to import and delegate.
- [x] **Step 6.1.11:** Update `src/core/controller/index.ts` imports and constructor to use the new modules. Correct property accesses (e.g., `this.task?.apiHandlerModule?.method()`) during refactoring. Ensure all original functionality is preserved through delegation.

## Task 6.2: Resolve Remaining TypeScript Errors

- [x] **Step 6.2.1:** Fix Module Resolution Errors in `src/core/task/modules/api_handler/`
  - [x] Correct relative import paths in `api-stream-handler.ts`.
  - [x] Correct relative import paths in `api-tool-processor.ts`.
- [x] **Step 6.2.2:** Fix Property Access Error in `src/core/task/modules/stream-processor.ts`
  - [x] Correct access for `didCompleteReadingStream`.
- [x] **Step 6.2.3:** Fix Type Errors in `src/test/file-system-tools.test.ts`
  - [x] Update test file to match current function signatures/types.

## Task 6.3: Verify Build

- [x] **Step 6.3.1:** Run `tsc --noEmit` in `codegenesis` directory and confirm no errors.

## Task 6.4: Package Extension

- [x] **Step 6.4.1:** Run `cd codegenesis ; npx vsce package --no-dependencies` and confirm successful packaging.
