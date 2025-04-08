# Phase 1: Extension Setup & Agent Registration

**Goal:** Scaffold a new VS Code extension and register a basic Chat Participant (`@apex_agent`) that appears in the native Chat view.

---

## Task 1.1: Scaffold New VS Code Extension [x]
- Step: Use `yo code` or a similar generator to create a new TypeScript-based VS Code extension project. (Manual creation used instead)
- Step: Configure basic `package.json` details (name, publisher, activation events). [x]
- Step: Set up the development environment (linting, formatting, build scripts). [x]

## Task 1.2: Register Basic Chat Participant [x]
- Step: Add the `chatParticipants` contribution point to `package.json`. [x]
- Step: Define the basic metadata for the `@apex_agent` participant (id, name, description). [x]
- Step: Implement the minimal `activate` function in the extension's entry point (`extension.ts`). [x]
- Step: Use `vscode.chat.createChatParticipant` within `activate` to register the participant. [x]
- Step: Provide a placeholder `IChatAgentImplementation` (e.g., one that just echoes the request). [x]
- Step: Verify that `@CodeGenesis` is the default agent in the Chat view. [x] (Verified 4/4/2025 after enabling `chatParticipantAdditions` and `defaultChatParticipant` proposed APIs in package.json and launch args).
