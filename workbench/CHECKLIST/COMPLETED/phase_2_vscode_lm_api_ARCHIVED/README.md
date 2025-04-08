# Phase 2: Core Agent Implementation

**Goal:** Implement the core logic for the custom `@apex_agent` participant, enabling basic interaction with an LLM via VS Code's native services.

**Goal:** Implement the core logic for the custom `@apex_agent` participant, enabling basic interaction with an LLM via VS Code's native services.

**Status:** Completed / Ready for Verification Testing. Core logic implemented and refined based on testing. Agent now uses the user-selected model from the request context and correctly processes stream fragments (`fragment.value`). Edit mode availability fixed in `package.json`.

---

## Task 2.1: Implement `IChatAgentImplementation.invoke` [Completed]
- Step: Define a class that implements `IChatAgentImplementation`. (Note: Using standalone `handleCodeGenesisRequest` function for now) [X]
- Step: Implement the `invoke` method within this class. (Implemented as `handleCodeGenesisRequest`) [X]
- Step: Inside `invoke`, retrieve the user's message and relevant chat history from the `request` and `history` parameters. [X]
- Step: Construct a basic prompt (e.g., user message + history) suitable for an LLM. (System message removed as unsupported by API). [X]

## Task 2.2: Integrate with `ILanguageModelsService` [Completed]
- Step: Inject `ILanguageModelsService` into the agent implementation class. (N/A - Model provided in request) [X]
- Step: Within `invoke`, use `languageModelsService.selectChatModels` to find a suitable model. (Removed; using `request.model`) [X]
- Step: Call `selectedModel.sendRequest` with the chosen model identifier, constructed messages, and cancellation token. (Using `request.model.sendRequest`) [X]

## Task 2.3: Handle Streaming Response [Completed]
- Step: Process the `stream` (AsyncIterable<IChatResponseFragment>) returned by `sendRequest`. (Basic `for await...of` loop implemented) [X]
- Step: For each `IChatResponseFragment` containing a `text` part:
    - Use the `progress` callback provided to `invoke` to send `kind: 'markdownContent'` updates to the Chat view. (Code updated to use `fragment.value` based on logs) [X]
- Step: Handle the completion or potential errors from the `result` promise returned by `sendRequest`. (Removed incorrect `.result` handling; stream completion signifies end) [X]
- Step: Return a basic `IChatAgentResult` upon completion. (Returning `{}` on success) [X]

## Task 2.4: Basic Error Handling [Completed]
- Step: Wrap the `sendRequest` call and stream processing in a try/catch block. (Select model call removed) [X]
- Step: If an error occurs, use the `progress` callback to report an error (e.g., `kind: 'error'`) to the Chat view. (Using `response.markdown` to report error message) [X]
- Step: Return an `IChatAgentResult` with appropriate `errorDetails`. (Returning `{ errorDetails: { message: ... } }`) [X]
