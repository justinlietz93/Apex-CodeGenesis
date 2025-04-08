# Task 2.5: System Prompt / Persona Integration

**Status:** Pending

## Goal

Implement logic to load and include a custom system prompt or persona definition when making direct API calls.

## Initial Approach

1.  **Define System Prompt:**
    *   Create a constant string variable within `agent.ts` (e.g., `CODEGENESIS_SYSTEM_PROMPT`) containing the desired default system prompt/persona text.
    *   Example: `const CODEGENESIS_SYSTEM_PROMPT = "You are CodeGenesis, an expert AI pair programmer..."`
2.  **Adapt Message Formatting:**
    *   Modify the message adaptation logic within the provider-specific blocks (e.g., the Gemini block in Task 2.3).
    *   Ensure the message array/history passed to the provider's SDK correctly incorporates the system prompt according to that SDK's requirements.
        *   **Gemini:** The `@google/generative-ai` SDK typically handles history and the current message separately. System instructions are often best placed as the *first user message* in the `startChat` history, or potentially via specific `generationConfig` options if available. Research needed during implementation.
        *   **OpenAI:** The `openai` SDK expects an array of messages including one with `role: 'system'`.
        *   **Anthropic:** The `@anthropic-ai/sdk` often uses a dedicated `system` parameter in its `messages.create` call.
3.  **Configuration (Future):** Plan to make the system prompt configurable via VS Code settings later, similar to API keys.

## Next Steps

-   Implement the system prompt inclusion logic as part of Task 2.3 (Refactor Handler).
-   Verify the correct way to pass system prompts for the `@google/generative-ai` SDK during implementation.
