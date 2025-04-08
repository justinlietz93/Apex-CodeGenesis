# Task 3.2: Expose Tools to the Language Model

**Status:** In Progress

## Goal

Modify the `handleCodeGenesisRequest` function in `CodeGenesis/src/agent.ts` to define available tools and pass their specifications to the language model via the `vscode.lm.sendChatRequest` options.

## Implementation Steps

1.  **Define Tools:** Defined `availableTools` array in `agent.ts` with `read_file` and `list_files` definitions based on Task 3.1 schema. [X]
2.  **Adapt for Gemini:** Created `toolsForApi` variable, mapping `inputSchema` to `parameters` and initially using `SchemaType` enums. [X]
3.  **Pass to API:** Passed `toolsForApi` to the `tools` parameter of `model.generateContentStream`. [X]
4.  **Troubleshooting:**
    *   Encountered TS errors related to `SchemaType` and schema structure. Used `as any` cast on `parameters` as a workaround. [X]
    *   Encountered Gemini API 400 error due to invalid `default` field in `list_files` schema. Removed the `default` field. [X]
5.  **Logging:** Added logs to confirm tool definition. [X]

## Next Steps

- Implement the changes in `CodeGenesis/src/agent.ts`.
- Update the main Phase 3 checklist.
- Update the knowledge graph.
- Proceed to Task 3.3 (Handle Tool Call Requests).
