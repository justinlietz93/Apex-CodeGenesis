# Phase 2: Provider Wrapper Implementation (Refactored Plan)

**Goal:** Refactor the CodeGenesis agent to use a provider-agnostic wrapper architecture, enabling flexible integration with different LLMs (starting with Gemini) using custom keys, prompts, and tools. This replaces the previous direct SDK implementation in `agent.ts`.

**Status:** Blocked. Attempting to implement the `GeminiWrapper` by copying and adapting code from `apex` resulted in persistent TypeScript errors related to dependencies and type mismatches (e.g., `withRetry` decorator, `ApiHandler` interface signature, tool definition format).

---

## Task 2.1: API Key Management Strategy [Defined]
- Step: Define strategy for handling provider API keys (Env vars -> Settings/Secrets). [X]

## Task 2.2: Install Provider SDKs [Completed]
- Step: Identify required SDKs (`@google/generative-ai`). [X]
- Step: Install SDKs using npm in the `CodeGenesis` directory. [X]
- Step: Identify and plan to install other dependencies needed by copied code (e.g., `@anthropic-ai/sdk` - decided against). [X]

## Task 2.3: Copy & Adapt Wrapper Dependencies [Blocked]
- Step: Create directory structure (`providers`, `shared`, `api`, `api/transform`). [X]
- Step: Copy `shared/api.ts` (types). [X]
- Step: Copy `api/transform/stream.ts` (types). [X]
- Step: Copy `api/retry.ts` (decorator). [X]
- Step: Copy `api/index.ts` (ApiHandler interface). [X]
- Step: Correct imports and types in copied files. [X] - Resolved TS errors in shared/api, api/index, api/retry, api/transform/stream.

## Task 2.4: Implement GeminiWrapper [Completed]
- Step: Create `providers/gemini_wrapper.ts`. [X]
- Step: Implement `ApiHandler` interface using copied types/helpers. [X]
- Step: Adapt `createMessage` to take VS Code messages and call Gemini SDK. [X]
- Step: Adapt `getModel` using copied types. [X]
- Step: Implement `generateResponseWithToolResults`. [X] - Added to interface and implemented in wrapper.
- Step: Resolve TS errors related to copied dependencies and type mismatches (e.g., decorator signature, tool format). [X] - Resolved via tsconfig update and signature alignment.

## Task 2.5: Refactor agent.ts [Completed]
- Step: Remove direct SDK logic and helpers from `agent.ts`. [X]
- Step: Import and instantiate `GeminiWrapper`. [X]
- Step: Call wrapper methods (`createMessage`, `generateResponseWithToolResults`). [X]
- Step: Adapt stream/tool handling logic to use wrapper's output. [X]

## Task 2.6: Update Knowledge Graph & Checklist [Completed]
- Step: Add entities/observations related to wrapper architecture. [X] - Done via memory tool.
- Step: Mark completed steps in this checklist. [X] - This step.
