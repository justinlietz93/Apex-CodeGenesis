# Task 2.1: Implement `IChatAgentImplementation.invoke`

**Status:** Completed

## Goal

Implement the basic structure and message handling for the chat agent's `invoke` method (represented by `handleCodeGenesisRequest`).

## Implementation Steps

-   **Define Handler:** Defined `handleCodeGenesisRequest` as the standalone handler function instead of a class method for simplicity initially. [X]
-   **Implement Signature:** Ensured `handleCodeGenesisRequest` matches the required signature for a chat participant handler. [X]
-   **Retrieve Context:** Added logic to access `request.prompt` and `_context.history`. [X]
-   **Construct Messages:** Implemented logic to map `_context.history` and `request.prompt` into the `LanguageModelChatMessage` array format, including a system prompt. Used type guards to handle history turn types. [X]

## Notes

-   The initial implementation used `vscode.ChatMessage` and `ChatMessageRole`, which caused errors. Corrected to use `LanguageModelChatMessage` and `LanguageModelChatMessageRole`.
-   Type guards (`'prompt' in turn`, `'response' in turn`) were added to correctly process the history array.
-   Removed use of `LanguageModelChatMessageRole.System` as the official documentation states system messages are not currently supported by the API.
