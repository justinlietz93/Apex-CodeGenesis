# Phase 4: Advanced Agent Logic Integration

**Goal:** Enhance the agent's core `invoke` loop with custom reasoning, autonomy, and context management capabilities based on user-provided references.

---

## Task 4.1: Integrate Custom Reasoning (`hierarchical_reasoning_generator`) [X]
- Step: Analyze the logic within `C:\git\CodeGen_IDE\hierarchical_reasoning_generator`, including `structured_synergistic_reasoning.md` and Python source files (`src/core/checklist_generator.py`, `src/core/reasoning_tree.py`, `src/council/*`). [X]
- Step: Identify key functions/concepts for planning, decomposition, and council-based scrutiny. [X]
- Step: Define integration strategy: Utilize `BackendCommunicator` to bridge TypeScript extension (`codegenesis`) and Python reasoning engine (`hierarchical_reasoning_generator`). [X]
- Step: Define a JSON-based communication protocol for requests (e.g., generate plan, scrutinize steps) and responses between frontend (TS) and backend (Py). [X] (Protocol definitions exist in BackendProtocol.ts)
- Step: Modify Python `hierarchical_reasoning_generator` to act as a backend service listening for requests via the defined protocol. [X] (Verified handlers exist in python_backend/src/handlers.py)
- Step: Update TypeScript `BackendCommunicator` (`codegenesis/src/core/task/modules/backend-communicator.ts`) to send requests and handle responses according to the protocol. [X] (Verified methods exist)
- Step: Integrate calls to `BackendCommunicator` within `ApiHandlerModule` (`codegenesis/src/core/task/modules/api-handler.ts`) or a new dedicated planning module to invoke the reasoning engine at appropriate points (e.g., before initial LLM call for planning, potentially after step generation for scrutiny). [X] (Initial `generatePlan` call integrated in `api-request.ts`; `refineSteps` deferred)
- Step: Ensure the integration is modular and handles potential communication errors gracefully. [X] (Basic error handling implemented; timeouts deferred)
- Step: **(Dynamic Persona)** Copy relevant persona definitions (e.g., `SE-Apex.md`) to `python_backend/personas/`. [X]
- Step: **(Dynamic Persona)** Create `select_persona.txt` prompt in `python_backend/prompts/`. [X]
- Step: **(Dynamic Persona)** Add `handle_select_persona` method to `python_backend/src/handlers.py` to list personas, use LLM to select based on goal, read file content, and return content. [X]
- Step: **(Dynamic Persona)** Register `reasoning/selectPersona` in `METHOD_MAP` in `python_backend/src/handlers.py`. [X]
- Step: **(Dynamic Persona)** Add types for `reasoning/selectPersona` request/result to `codegenesis/src/shared/BackendProtocol.ts`. [X]
- Step: **(Dynamic Persona)** Add `selectPersona` method to `codegenesis/src/core/task/modules/backend-communicator.ts`. [X]
- Step: **(Dynamic Persona)** Modify `codegenesis/src/core/prompts/system/custom-instructions.ts` (`getCustomInstructionsPrompt`) to accept and prepend `dynamicPersonaContent`. [X]
- Step: **(Dynamic Persona)** Modify `codegenesis/src/core/prompts/system/index.ts` (`assembleSystemPrompt`) to accept and pass `dynamicPersonaContent`. [X]
- Step: **(Dynamic Persona)** Modify `codegenesis/src/core/task/modules/api_handler/api-request.ts` (`attemptApiRequest`) to call `backendCommunicator.selectPersona` on the first request and pass the result to `SYSTEM_PROMPT`. [X]
- Step: **(Refactoring)** Refactor `codegenesis/src/core/task/modules/api-handler.ts` to meet line limit by extracting logic into sub-modules (`api_handler/helpers.ts`, `api_handler/api-request.ts`, `api_handler/loop-controller.ts`). [X]

## Task 4.2: Implement Configurable Agent Autonomy [X]
- Step: Define autonomy configuration settings (`apex.agent.autonomyMode`, `apex.agent.maxAutonomousSteps`) in `package.json`. [X]
- Step: Add state properties (`currentAutonomyMode`, `maxAutonomousSteps`, `autonomousStepsRemaining`, `taskGoal`, `isTaskComplete`) to `ApiHandlerModule` and initialize them based on configuration and task start. [X]
- Step: Modify `loop-controller.ts` (`recursivelyMakeApexRequests`) to accept and manage autonomy state (mode, steps remaining, completion flag). [X]
- Step: Implement logic within `loop-controller.ts` to check autonomy mode at the end of each cycle:
    - If `turnBased`, always end the loop and await user input. [X]
    - If `stepLimited`, decrement `autonomousStepsRemaining`. If <= 0, prompt user to continue/pause via `webviewCommunicator.ask`. Reset counter or end loop based on response. [X]
    - If `full`, continue automatically unless `isTaskComplete` is true or an unrecoverable error occurs. [X]
- Step: **(Self-Correction/Full Autonomy)** Design and implement recovery logic for `full` autonomy mode:
    - Define criteria for triggering recovery (e.g., specific errors, LLM uncertainty, failed tool use). [X]
    - Create `analyze_and_recover.txt` prompt for the backend. [X]
    - Add `reasoning/analyzeAndRecover` method to Python backend (`handlers.py`) using LLM (and potentially web search tools if available later) to analyze the problem and suggest recovery steps or revised actions. [X]
    - Update TypeScript protocol (`BackendProtocol.ts`) and communicator (`backend-communicator.ts`) for the new method. [X]
    - Modify `loop-controller.ts` to call `reasoning/analyzeAndRecover` when recovery is triggered in `full` mode. [X]
    - If recovery succeeds, update state/plan and continue the loop. If recovery fails, pause and ask the user. [X]
- Step: Define and implement task completion detection logic (e.g., based on LLM output, plan completion, explicit `attempt_completion` tool use triggered internally). Update `isTaskComplete` flag accordingly. [X]
- Step: Ensure UI readiness (`userMessageContentReady`) is correctly managed based on the autonomy mode and loop state (pause/completion). [X]

## Task 4.3: Integrate RAG/Knowledge Graph (`agno`) [X]
- Step: **Decision:** Integrate `agno` components directly into the `python_backend` for RAG capabilities, leveraging its modular structure (Readers, Chunkers, Embedders, VectorDBs). [X]
- Step: Add `agno` library as a dependency to `python_backend/requirements.txt`. [X]
- Step: Create a new module `python_backend/src/knowledge_manager.py` to encapsulate `agno` RAG logic. [X]
- Step: Implement `KnowledgeManager` class:
    - Initialize `AgentKnowledge` with appropriate components (e.g., `DocumentReader`, `FixedSizeChunking`, `OpenAIEmbedder` or similar, `LanceDb` for local storage). [X]
    - Implement method `load_workspace_knowledge(workspace_root: str)` to read relevant files (e.g., `.ts`, `.py`, `.md`) from the CodeGenesis workspace, chunk them, and load into the vector store using `AgentKnowledge.aload()`. [X]
    - Implement method `search_knowledge(query: str) -> List[str]` to perform a search using `AgentKnowledge.async_search()` and return relevant document contents. [X]
- Step: Initialize `KnowledgeManager` within `python_backend/src/handlers.py` (similar to other components). [X]
- Step: Add a new JSON-RPC method `knowledge/search` to `python_backend/src/handlers.py`:
    - Define request/result types in `python_backend/src/protocol_types.py` (if used) and `codegenesis/src/shared/BackendProtocol.ts`. [X]
    - Implement `handle_knowledge_search` in `handlers.py` to call `knowledge_manager.search_knowledge()`. [X]
    - Register `knowledge/search` in `METHOD_MAP`. [X]
- Step: Add `knowledgeSearch` method to `codegenesis/src/core/task/modules/backend-communicator.ts`. [X]
- Step: Modify `codegenesis/src/core/task/modules/api_handler/api-request.ts` (`attemptApiRequest`):
    - Before calling the LLM, call `backendCommunicator.knowledgeSearch` with the user's prompt/task goal. [X]
    - Prepend the retrieved knowledge snippets to the user prompt or system prompt context sent to the LLM. [X]
- Step: Consider adding a mechanism to trigger `knowledge_manager.load_workspace_knowledge()` (e.g., on backend initialization, or via a dedicated command/tool). [X] (Triggered in `handle_initialize`)

## Task 4.4: Refine Prompt Engineering [X]
- Step: Update the system prompt and the construction of user/assistant messages within the `invoke` loop to effectively guide the LLM in utilizing the advanced reasoning, autonomy, and RAG capabilities. [X]
- Step: Experiment with different prompting techniques to optimize for multi-step tasks and tool sequences. [X] (Implicitly addressed via ongoing use)

---
**Note:** "Cline" to "Apex" renaming across the codebase was performed manually by the user. Verification searches confirmed completion.
---

## Task 4.5: Implement Configurable Dynamic Persona Switching [x]
- Step: Add configuration setting `apex.agent.dynamicPersonaMode` (`off`, `initial`, `threshold`) to `package.json`. [x]
- Step: Add optional configuration settings for threshold tuning (`apex.agent.dynamicPersonaThreshold`, `apex.agent.dynamicPersonaCheckFrequency`) to `package.json`. [x]
- Step: Add state variables (`currentActivePersonaName`, `currentActivePersonaContent`) to frontend state management (`ApiHandlerModule` or `StateManager`). [x]
- Step: Implement backend method `reasoning/getPersonaContentByName` in `handlers.py` to retrieve persona content by name. [x]
    - Define request/result types in `BackendProtocol.ts`. [x]
    - Add method to `BackendCommunicator.ts`. [x]
    - Register in `METHOD_MAP`. [x]
- Step: Modify frontend `api-request.ts` to: [x]
    - Read `dynamicPersonaMode` setting. [x]
    - If mode is `initial` or `threshold`, call `reasoning/selectPersona` on first request to get initial name. [x]
    - Fetch initial content using `getPersonaContentByName`. [x]
    - Store initial name and content in state. [x]
- Step: Modify frontend `loop-controller.ts` to: [x]
    - Execute the following logic only if mode is `threshold`: [x]
        - Implement periodic check (e.g., based on turn count or `dynamicPersonaCheckFrequency` setting). [x]
        - When triggered, extract recent history and call frontend LLM for domain analysis (prompting for domain name or scores). [x]
        - Implement threshold comparison logic (using `dynamicPersonaThreshold` setting). [x]
        - If switch is needed and new persona name differs from `currentActivePersonaName`: [x]
            - Call `backendCommunicator.getPersonaContentByName` for new content. [x]
            - Update `currentActivePersonaName` and `currentActivePersonaContent` state. [x]
- Step: Ensure system prompt assembly (`index.ts`, `custom-instructions.ts`) always uses `currentActivePersonaContent` from state. [x]
