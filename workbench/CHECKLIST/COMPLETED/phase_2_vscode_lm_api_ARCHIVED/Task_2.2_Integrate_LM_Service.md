# Task 2.2: Integrate with `ILanguageModelsService`

**Status:** Completed

## Goal

Integrate the agent with VS Code's Language Model service to select a model and send the chat request.

## Implementation Steps

-   **Access Service:** N/A - Model is provided directly in the request. [X]
-   **Select Model:** Removed logic for `selectChatModels`. Code now uses `request.model` passed to the handler. [X]
-   **Call API:** Uses `selectedModel.sendRequest(messages, options, token)` where `selectedModel` is `request.model`. [X]
-   **Enable Proposed API:** Removed `"languageModels"` from `enabledApiProposals` in `package.json`. [X]

## Blocking Issue Resolution (Workaround)

-   Previous issues with `selectChatModels` (TS errors, runtime errors) are bypassed by using the model provided directly in the `request` object.

## Notes

-   The agent now correctly uses the model selected by the user in the VS Code UI.
