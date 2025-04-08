# Task 2.3: Refactor Handler for Direct API Calls

**Status:** Completed

## Goal

Modify `CodeGenesis/src/agent.ts` (`handleCodeGenesisRequest`) to bypass the built-in VS Code LM API and make direct calls to provider APIs (starting with Google Gemini).

## Implementation Steps

1.  **Import SDK:** Added necessary imports from `@google/generative-ai` to `agent.ts` (removed unused imports like `HarmCategory`). [X]
2.  **API Key Retrieval:** Implemented reading `process.env.GEMINI_API_KEY` (and placeholders for others) with error handling. [X]
3.  **Remove VS Code LM Calls:** Removed `selectChatModels` and `selectedModel.sendRequest` calls. [X]
4.  **Provider Logic:**
    *   Added conditional logic for `providerDetails.provider === 'gemini'`. [X]
    *   **Gemini Implementation:**
        *   Instantiated Gemini client. [X]
        *   Got model using mapped name (from Task 2.4 helper). [X]
        *   Adapted messages using `adaptMessagesForGemini` helper (handles roles, system prompt). [X]
        *   Initiated chat session with history. [X]
        *   Sent message using `sendMessageStream`. [X]
        *   Processed stream using `chunk.text()` and `response.markdown()`. [X]
    *   **Other Providers (Placeholder):** Added `else if` blocks with warnings for OpenAI/Anthropic. [X]
5.  **Error Handling:** Adapted `try...catch` block for direct API call errors. [X]

## Next Steps

-   Verify implementation through testing.
-   Implement direct API calls for other providers (OpenAI, Anthropic) as needed.
