# Task 3.3: Handle Tool Call Requests from LLM

**Status:** In Progress

## Goal

Detect and parse tool call requests made by the LLM within the response stream or aggregated response.

## Implementation Steps

1.  **Detect Tool Calls:**
    *   **Gemini:** Added logic after the stream processing loop in `agent.ts` to check `result.response.functionCalls()`. [X]
    *   **OpenAI/Anthropic:** Placeholder logic needed for other providers (often involves checking specific message types or content within the stream). [ ]
2.  **Parse Request:**
    *   **Gemini:** Implemented logic to loop through `functionCalls` array and extract `name` and `args`. [X]
    *   **OpenAI/Anthropic:** Placeholder logic needed. [ ]
3.  **Validate Request:** Implemented logic to:
    *   Find the corresponding tool definition in `availableTools` based on the parsed `name`. [X]
    *   Check if required arguments (from `inputSchema.required`) are present in the parsed `args` (using type assertion). [X]

## Notes

-   Current implementation only detects and logs Gemini function calls after the main text stream finishes.
-   Parsing and validation logic is not yet implemented.
-   Handling tool calls that might arrive *during* the stream (if supported by other providers) is not yet implemented.

## Next Steps

-   Implement parsing and validation logic.
-   Proceed to Task 3.4 (Execute Tools).
