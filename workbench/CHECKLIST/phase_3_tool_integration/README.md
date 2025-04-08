# Phase 3: Tool Integration (Hybrid Approach)

**Goal:** Refactor the CodeGenesis agent's tool handling to support a **hybrid strategy**: utilizing native LLM function calling (e.g., Gemini) when available, and falling back to XML-based parsing (Apex's original method) for other models. This ensures provider agnosticism. (Ref: `Manus_results/refactoring_plan.md`)

**Status:** Refactoring Required.
 *Note:* Initial Gemini-only implementation was completed, but requires significant rework for the hybrid approach.
 to be clear, we arent necessarily trying to avoid anthropic, we will set up their models later. This platform should be provider agnostic as much as feasible, and the system will use modular and clever setup through the individual wrapper interfaces to the providers which allows any of the models to use the same tools even if their structured output or natural language tool calls are different
 
---

## Task 3.1: Define Tool Specification Format [Completed]
- Step: Research VS Code's proposed API for tool definitions within `ChatParticipant` contributions (if available) or define a custom JSON schema. (Decided on custom schema). [X]
- Step: Document the chosen format for specifying available tools (e.g., name, description, inputSchema). [X]

## Task 3.2: Expose Tools to the Language Model [Completed]
- Step: Modify the `ApiHandler` interface to include `supportsNativeFunctionCalling()`. [X] (Verified interface already includes method)
- Step: Update provider implementations (`GeminiHandler`, others) to implement `supportsNativeFunctionCalling()` and handle tool schemas/XML instructions accordingly. [X] (Core providers: Gemini, Anthropic, OpenAI, Ollama updated)
- Step: Modify `ApiHandlerModule.attemptApiRequest` to check `supportsNativeFunctionCalling()` and pass schemas or ensure XML instructions are in the system prompt. [X] (Implemented in api-handler.ts)
- Step: *Previous:* Prepare the list of available tools according to the defined specification format. [X]
- Step: *Previous:* Include the tool specifications in the options passed to the direct API call (`model.generateContentStream`). (Corrected API call method). [X]
- Step: *Previous:* Resolved Gemini API error by removing invalid `default` field from tool schema. [X]

## Task 3.3: Handle Tool Call Requests from LLM [Completed]
- Step: Modify stream processing logic in `ApiHandlerModule.recursivelyMakeApexRequests` to handle both native `function_calls` chunks and accumulate text for XML parsing based on provider capability. [X] (Implemented in api-handler.ts)
- Step: Implement post-stream logic to trigger tool execution based on either accumulated native calls *or* parsed XML from accumulated text. [X] (Implemented two paths for tool handling in api-handler.ts)
- Step: *Previous:* Within the response stream processing loop or after in `handleCodeGenesisRequest`:
    - Detect fragments/responses indicating a tool call request (Implemented detection for Gemini `functionCalls()`). [X]
    - Parse the requested tool name and arguments (Implemented loop and extraction). [X]
- Step: *Previous:* Implement logic to validate the requested tool and its arguments against the defined specifications (Implemented check for tool existence and required args). [X]
 
 ## Task 3.4: Execute Tools [Completed]
 - Step: Refactor `presentAssistantMessage` (`StreamProcessor`) to primarily handle UI streaming and approval flow. [X]
 - Step: Extract core tool execution logic (current `switch` statement) into a new reusable class `ToolExecutor` with modular functions per tool category. [X]
 - Step: Ensure `ToolExecutor` and modular functions can handle parameters from both native calls (`args` object) and XML parsing (`params` object). [X] (Implemented in `ToolExecutor` and modular functions)
 - Step: *Previous:* Create a mechanism or service to execute the requested tool based on its name.
     - *Initial Implementation:* Implemented simple hardcoded dispatcher (`switch` statement) in `agent.ts`. [X] (Superseded by `ToolExecutor`)
     - *Future Enhancement:* Develop a more dynamic tool registration and execution system. [ ]
- Step: *Previous:* Execute the corresponding tool logic with the provided arguments (Created `tools.ts` with `readFileTool`, `listFilesTool`; called from dispatcher). [X]
- Step: *Previous:* Handle potential errors during tool execution (Added `try...catch` around dispatcher). [X]

## Task 3.5: Return Tool Results to LLM [Completed]
- Step: Ensure the post-stream logic in `ApiHandlerModule.recursivelyMakeApexRequests` correctly formats tool results (from ToolExecutor) for the follow-up LLM call, regardless of whether native or XML tools were used. [X] (Implemented separate format paths for native and XML tools in api-handler.ts)
- Step: *Previous:* Format the result (or error) from the tool execution into the expected format for the LLM (Implemented `createFunctionResponsePart` and added `{role: 'function', parts: ...}` to history). [X]
- Step: *Previous:* Make a subsequent call to the LLM including the tool result message/fragment (Implemented via loop structure sending updated `currentContents` back to `generateContentStream`). [X]
- Step: *Previous:* Update the main response stream (`response.markdown`) to indicate tool execution status if necessary (Added placeholder message). [X]

## Task 3.6: Update Knowledge Graph & Checklist [Completed]
- Step: Add entities/observations related to the **hybrid** tool handling strategy, refactoring steps, and updated status. [X] (Added entities/relations/observations for `ToolExecutor`, `StreamProcessor`, `ApiHandlerModule`, modular tool files, and `replace_in_file` issues)
- Step: Mark completed steps in this checklist as the refactoring progresses. [X] (Marked Tasks 3.2, 3.3, 3.4, and 3.5 as complete)

## Task 3.7: Tool Implementation Review [Completed (Static Analysis)]
- Step: Conduct a comprehensive review of all current tool implementations for accuracy and performance issues. [X] (Static analysis complete)
- Step: Evaluate error handling robustness in each tool module. [X] (Static analysis complete)
- Step: Identify any edge cases not properly handled by current implementations. [X] (Static analysis complete)
- Step: Benchmark performance of file system tools on large files/directories. [ ] (Deferred - Requires interactive execution)
- Step: Assess browser tools for stability across different websites and interaction patterns. [ ] (Deferred - Requires interactive execution)
- Step: Document improvement recommendations for each tool category:
  * Command execution tools (safety, timeout handling, output parsing) [X]
  * File system tools (error resilience, large file handling, path normalization) [X]
  * Code analysis tools (performance on large codebases, language support) [X]
  * Browser tools (reliability, error recovery, interaction sophistication) [X]
  * MCP tools (service discovery, error propagation, resource efficiency) [X]
  * Interaction tools (UX consistency, feedback mechanisms) [X]
- Step: Prioritize identified improvements based on impact and implementation difficulty. [X]
