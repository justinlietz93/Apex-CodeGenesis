Subject: ACTION REQUIRED: Develop Personal AI Assistant with Voice Chat (Project "Aether") v1.0

Directive: Execute the following hierarchical plan precisely and autonomously to develop the "Aether" Personal AI Assistant application (Electron-based desktop app). Adherence to the **Apex Software Compliance Standards Guide v1.4** (located at `../apex/STANDARDS.md`) is **MANDATORY** for all steps and deliverables. The Standards Guide takes precedence over potentially conflicting prompt details unless explicitly waived herein. Initialize and maintain internal logs (`docs/Aether_Dev_Log.md`, `docs/Aether_Test_Log.md`) as specified. Report **only** upon successful completion of **all** phases and the final validation task.

Test Reporting Protocol (Internal): Maintain `docs/Aether_Test_Log.md`. Update after each Task involving test execution or coverage analysis. Record: Date/Time, Phase/Task ID, Scope Tested/Analyzed, Unit Test Pass %, Integration Test Pass %, Code Coverage %, Summary of Findings/Failures for that task. Development log (`docs/Aether_Dev_Log.md`) should track task/step completion timestamps and brief notes.

---
- [ ] **Phase 1: Project Setup & Requirements Definition**
    * **Objective:** Establish the project structure and define detailed, verifiable requirements.

    - [ ] **Task 1.1: Initialize Project Structure & Configuration**
        * **Task Objective:** Create the basic project scaffolding and configuration files.
        - [ ] * **Step 1.1.1 (Rule #1: PLAN-CHK):** Initialize project directory `Aether_Assistant/` with standard subdirectories (`src`, `docs`, `config`, `tests`).
        - [ ] * **Step 1.1.2 (Rule #25: CONF-EXT):** Create initial configuration files (`config/app.json`, `config/llm.json`, `config/audio.json`) sourcing defaults from `../apex/default.config.json` where applicable.
        - [ ] * **Step 1.1.3 (Rule #1: PLAN-CHK):** Initialize `docs/Aether_Dev_Log.md` and `docs/Aether_Test_Log.md`.
        * **Internal Success Criteria:** Project directory and initial config/log files created.
        * **Internal Verification Method:** Verify directory structure and file existence. Verify compliance with Rule #1, #25.
        * **Task Completion Testing (Internal):** N/A. Update `docs/Aether_Dev_Log.md`.

    - [ ] **Task 1.2: Define Functional & Non-Functional Requirements**
        * **Task Objective:** Document the specific capabilities and constraints of the assistant.
        - [ ] * **Step 1.2.1 (Rule #6: REQ-DEFINE-VVT):** Define core functional requirements: Continuous audio input stream processing, activation word detection (optional, configurable), Speech-to-Text (STT) via selected API, text processing/forwarding to LLM, Text-to-Speech (TTS) synthesis via selected API, audio output playback, basic status UI (listening, processing, speaking).
        - [ ] * **Step 1.2.2 (Rule #6: REQ-DEFINE-VVT):** Define non-functional requirements: Target platform (Electron Desktop), response latency target (<3s P90), resource usage limits (CPU/RAM TBD), secure API key storage.
        - [ ] * **Step 1.2.3 (Rule #7: REQ-SAFETY-CRITICAL):** Define safety/security requirements: Prevent execution of harmful commands derived from LLM response, ensure privacy of captured audio/text, secure API key handling.
        - [ ] * **Step 1.2.4 (Rule #8: REQ-TRACE-BIDIR):** Document all requirements in `docs/Aether_Requirements.md` with unique IDs. Establish initial traceability links.
        * **Internal Success Criteria:** `docs/Aether_Requirements.md` created and populated with clear, testable requirements covering all specified areas.
        * **Internal Verification Method:** Analyze `docs/Aether_Requirements.md` for clarity, testability, completeness. Verify compliance with Rule #6, #7, #8.
        * **Task Completion Testing (Internal):** N/A. Update `docs/Aether_Dev_Log.md`.

---
- [ ] **Phase 2: Design & Technology Selection**
    * **Objective:** Design the system architecture and select core technologies.

    - [ ] **Task 2.1: Design System Architecture**
        * **Task Objective:** Create a modular high-level design.
        - [ ] * **Step 2.1.1 (Rule #9: DES-ARCH-DEFINE, Rule #11: DES-MODULARITY):** Design architecture with key services (`AudioInput`, `ActivationWord`, `STT`, `CoreLogic`, `LLM`, `TTS`, `AudioOutput`, `UIController`). Define responsibilities and primary interfaces. Document in `docs/Aether_Architecture.md`.
        - [ ] * **Step 2.1.2 (Rule #9: DES-ARCH-DEFINE):** Select specific libraries/APIs for STT (e.g., Vosk, Deepgram), LLM (e.g., OpenAI API, Groq API), TTS (e.g., ElevenLabs API, Web Speech API). Document choices, rationale, and integration points.
        - [ ] * **Step 2.1.3 (Rule #8: REQ-TRACE-BIDIR):** Update traceability links between requirements and architectural components.
        * **Internal Success Criteria:** `docs/Aether_Architecture.md` created, detailing modular design, technology choices, and interfaces. Traceability updated.
        * **Internal Verification Method:** Review architecture document for clarity, modularity, completeness against requirements. Verify compliance with Rule #8, #9, #11.
        * **Task Completion Testing (Internal):** N/A. Update `docs/Aether_Dev_Log.md`.

    - [ ] **Task 2.2: Design Core Logic Flow**
        * **Task Objective:** Detail the primary interaction sequence.
        - [ ] * **Step 2.2.1 (Rule #10: DES-DETAIL-IMPL):** Design the detailed data/control flow: Audio Input -> (Activation Word Detection) -> STT -> Core Logic (Context Management, LLM Request Formatting) -> LLM Service -> Core Logic (Response Processing, Safety Checks) -> TTS Service -> Audio Output. Document sequence diagrams or flowcharts in `docs/Aether_Core_Flow.md`.
        - [ ] * **Step 2.2.2 (Rule #10: DES-DETAIL-IMPL):** Define data structures for intermediate representations (e.g., transcribed text, LLM request/response objects, audio buffers).
        * **Internal Success Criteria:** `docs/Aether_Core_Flow.md` created, detailing interaction sequence and data structures.
        * **Internal Verification Method:** Review flow document for logical consistency and coverage of functional requirements. Verify compliance with Rule #10.
        * **Task Completion Testing (Internal):** N/A. Update `docs/Aether_Dev_Log.md`.

---
- [ ] **Phase 3: Implementation - Core Services**
    * **Objective:** Implement the foundational audio, STT, TTS, and LLM services.

    - [ ] **Task 3.1: Implement Audio Input/Output Services**
        * **Task Objective:** Create services to handle audio capture and playback.
        - [ ] * **Step 3.1.1 (Rule #5: QUAL-MOD, Rule #15: QUAL-SIZE):** Implement `src/services/AudioInputService.ts` to capture audio stream from default microphone using appropriate Node.js libraries (e.g., `node-record-lpcm16`). Ensure proper error handling (Rule #60: ERR-HDL).
        - [ ] * **Step 3.1.2 (Rule #5: QUAL-MOD, Rule #15: QUAL-SIZE):** Implement `src/services/AudioOutputService.ts` to play back audio buffers/streams using appropriate libraries (e.g., `speaker`). Ensure proper error handling (Rule #60: ERR-HDL).
        - [ ] * **Step 3.1.3 (Rule #31: TEST-PLAN-PROC, Rule #34: TEST-CODE-COVERAGE):** Create unit tests (`tests/services/AudioInputService.test.ts`, `tests/services/AudioOutputService.test.ts`) mocking hardware interaction, achieving >=90% coverage.
        * **Internal Success Criteria:** Audio services implemented and unit tested with >=90% coverage. Code adheres to size limits. Errors handled.
        * **Internal Verification Method:** Review code for functionality, error handling, modularity. Execute unit tests and check coverage report. Verify compliance with Rule #5, #15, #31, #34, #60.
        * **Task Completion Testing (Internal):** Execute tests. Update `docs/Aether_Test_Log.md`. Update `docs/Aether_Dev_Log.md`.

    - [ ] **Task 3.2: Implement STT Service**
        * **Task Objective:** Create service to convert speech to text using the selected API/library.
        - [ ] * **Step 3.2.1 (Rule #5: QUAL-MOD, Rule #15: QUAL-SIZE, Rule #26: SEC-KEY-STORAGE):** Implement `src/services/STTService.ts` to interact with the chosen STT API/library. Handle API key securely via `ConfigManager`. Implement error handling (Rule #60: ERR-HDL).
        - [ ] * **Step 3.2.2 (Rule #31: TEST-PLAN-PROC, Rule #34: TEST-CODE-COVERAGE):** Create unit tests (`tests/services/STTService.test.ts`) mocking the external API/library, achieving >=90% coverage.
        * **Internal Success Criteria:** STT service implemented, handling keys securely, and unit tested with >=90% coverage. Code adheres to size limits. Errors handled.
        * **Internal Verification Method:** Review code for functionality, security, error handling. Execute unit tests and check coverage report. Verify compliance with Rule #5, #15, #26, #31, #34, #60.
        * **Task Completion Testing (Internal):** Execute tests. Update `docs/Aether_Test_Log.md`. Update `docs/Aether_Dev_Log.md`.

    - [ ] **Task 3.3: Implement TTS Service**
        * **Task Objective:** Create service to synthesize speech from text using the selected API/library.
        - [ ] * **Step 3.3.1 (Rule #5: QUAL-MOD, Rule #15: QUAL-SIZE, Rule #26: SEC-KEY-STORAGE):** Implement `src/services/TTSService.ts` to interact with the chosen TTS API/library. Handle API key securely via `ConfigManager`. Implement error handling (Rule #60: ERR-HDL).
        - [ ] * **Step 3.3.2 (Rule #31: TEST-PLAN-PROC, Rule #34: TEST-CODE-COVERAGE):** Create unit tests (`tests/services/TTSService.test.ts`) mocking the external API/library, achieving >=90% coverage.
        * **Internal Success Criteria:** TTS service implemented, handling keys securely, and unit tested with >=90% coverage. Code adheres to size limits. Errors handled.
        * **Internal Verification Method:** Review code for functionality, security, error handling. Execute unit tests and check coverage report. Verify compliance with Rule #5, #15, #26, #31, #34, #60.
        * **Task Completion Testing (Internal):** Execute tests. Update `docs/Aether_Test_Log.md`. Update `docs/Aether_Dev_Log.md`.

    - [ ] **Task 3.4: Implement LLM Service**
        * **Task Objective:** Create service to interact with the selected LLM API.
        - [ ] * **Step 3.4.1 (Rule #5: QUAL-MOD, Rule #15: QUAL-SIZE, Rule #26: SEC-KEY-STORAGE):** Implement `src/services/LLMService.ts` to send requests and receive responses from the chosen LLM API. Handle API key securely via `ConfigManager`. Implement error handling (Rule #60: ERR-HDL).
        - [ ] * **Step 3.4.2 (Rule #31: TEST-PLAN-PROC, Rule #34: TEST-CODE-COVERAGE):** Create unit tests (`tests/services/LLMService.test.ts`) mocking the external API, achieving >=90% coverage.
        * **Internal Success Criteria:** LLM service implemented, handling keys securely, and unit tested with >=90% coverage. Code adheres to size limits. Errors handled.
        * **Internal Verification Method:** Review code for functionality, security, error handling. Execute unit tests and check coverage report. Verify compliance with Rule #5, #15, #26, #31, #34, #60.
        * **Task Completion Testing (Internal):** Execute tests. Update `docs/Aether_Test_Log.md`. Update `docs/Aether_Dev_Log.md`.

---
- [ ] **Phase 4: Implementation - Core Logic & UI**
    * **Objective:** Implement the central assistant logic and user interface.

    - [ ] **Task 4.1: Implement Core Assistant Logic**
        * **Task Objective:** Orchestrate the interaction between services.
        - [ ] * **Step 4.1.1 (Rule #5: QUAL-MOD, Rule #11: DES-MODULARITY):** Implement `src/core/AssistantCoreLogic.ts` to manage the state machine (e.g., Idle, Listening, Processing, Speaking).
        - [ ] * **Step 4.1.2 (Rule #5: QUAL-MOD, Rule #15: QUAL-SIZE):** Implement logic to receive audio stream, trigger STT, receive text, format LLM request (potentially adding context/history), call LLMService, receive LLM response.
        - [ ] * **Step 4.1.3 (Rule #7: REQ-SAFETY-CRITICAL, Rule #28: SEC-INPUT-VAL):** Implement safety checks on LLM response (e.g., filter harmful content/commands) before proceeding.
        - [ ] * **Step 4.1.4 (Rule #5: QUAL-MOD, Rule #15: QUAL-SIZE):** Implement logic to send processed text to TTSService and trigger AudioOutputService. Handle errors from services (Rule #60: ERR-HDL).
        - [ ] * **Step 4.1.5 (Rule #31: TEST-PLAN-PROC, Rule #34: TEST-CODE-COVERAGE):** Create unit/integration tests (`tests/core/AssistantCoreLogic.test.ts`) mocking service dependencies, achieving >=90% coverage.
        * **Internal Success Criteria:** Core logic implemented, orchestrating services, performing safety checks, handling errors, and unit/integration tested with >=90% coverage. Code adheres to size limits.
        * **Internal Verification Method:** Review code for logic correctness, state management, error handling, safety checks. Execute tests and check coverage. Verify compliance with Rule #5, #7, #11, #15, #28, #31, #34, #60.
        * **Task Completion Testing (Internal):** Execute tests. Update `docs/Aether_Test_Log.md`. Update `docs/Aether_Dev_Log.md`.

    - [ ] **Task 4.2: Implement Basic UI**
        * **Task Objective:** Create a minimal Electron UI to display status and provide basic controls.
        - [ ] * **Step 4.2.1 (Rule #5: QUAL-MOD, Rule #15: QUAL-SIZE):** Create basic Electron main process setup (`src/main.js`, `src/preload.js`) following secure practices (Rule #30: SEC-LEAST-PRIV).
        - [ ] * **Step 4.2.2 (Rule #5: QUAL-MOD, Rule #15: QUAL-SIZE):** Create a simple React UI component (`src/ui/App.tsx`) to display status (e.g., "Idle", "Listening", "Thinking", "Speaking") based on events from `AssistantCoreLogic` (via IPC). Include Start/Stop button.
        - [ ] * **Step 4.2.3 (Rule #31: TEST-PLAN-PROC, Rule #34: TEST-CODE-COVERAGE):** Create basic UI tests (`tests/ui/App.test.tsx`) using React Testing Library, mocking IPC, achieving >=90% coverage for the component.
        * **Internal Success Criteria:** Basic Electron app structure created. UI component displays status and has controls. UI tested with >=90% coverage.
        * **Internal Verification Method:** Review code structure and UI component logic. Execute UI tests and check coverage. Verify compliance with Rule #5, #15, #30, #31, #34.
        * **Task Completion Testing (Internal):** Execute tests. Update `docs/Aether_Test_Log.md`. Update `docs/Aether_Dev_Log.md`.

---
- [ ] **Phase 5: Integration, Testing & Refinement**
    * **Objective:** Integrate all components, perform integration testing, and refine based on results.

    - [ ] **Task 5.1: Integrate Services and UI**
        * **Task Objective:** Connect all implemented services and the UI via the Core Logic.
        - [ ] * **Step 5.1.1 (Rule #11: DES-MODULARITY):** Integrate `AudioInputService`, `STTService`, `LLMService`, `TTSService`, `AudioOutputService` with `AssistantCoreLogic`.
        - [ ] * **Step 5.1.2 (Rule #11: DES-MODULARITY):** Implement IPC communication between `AssistantCoreLogic` (main process likely) and `UIService` (renderer process) for status updates and controls.
        * **Internal Success Criteria:** All services are connected and communicate via `AssistantCoreLogic` and IPC as designed.
        * **Internal Verification Method:** Code review of integration points and IPC handlers. Manual execution trace through the core flow.
        * **Task Completion Testing (Internal):** N/A (Integration setup). Update `docs/Aether_Dev_Log.md`.

    - [ ] **Task 5.2: Perform Integration Testing**
        * **Task Objective:** Verify the end-to-end flow and interactions between components.
        - [ ] * **Step 5.2.1 (Rule #31: TEST-PLAN-PROC, Rule #22: TEST-TYPES):** Develop integration test cases covering the main voice chat flow (activation -> STT -> LLM -> TTS -> Output) and error conditions (API failures, invalid audio).
        - [ ] * **Step 5.2.2 (Rule #31: TEST-PLAN-PROC, Rule #34: TEST-CODE-COVERAGE):** Execute integration tests, potentially using mocked external APIs but testing the internal service interactions. Aim for high coverage of interaction points. Fix defects found (recursive error handling).
        * **Internal Success Criteria:** Integration tests executed, covering core flows and error conditions. All integration tests pass. Coverage target met for integration points.
        * **Internal Verification Method:** Execute integration test suite. Analyze results and coverage reports. Verify compliance with Rule #22, #31, #34.
        * **Task Completion Testing (Internal):** Execute integration tests. Update `docs/Aether_Test_Log.md`. Update `docs/Aether_Dev_Log.md`.

---
- [ ] **Phase 6: Finalization & Documentation**
    * **Objective:** Ensure all standards are met, documentation is complete, and prepare for delivery.

    - [ ] **Task 6.1: Code Quality & Standards Finalization**
        * **Task Objective:** Enforce final code quality standards.
        - [ ] * **Step 6.1.1 (Rule #7: QUAL-FMT):** Run automated formatter (`prettier --write .`) across the entire codebase.
        - [ ] * **Step 6.1.2 (Rule #54: TOOL-ZERO-WARN):** Compile and run static analysis (ESLint with strict rules, security scanner) ensuring zero warnings/errors. Refactor code to fix warnings.
        - [ ] * **Step 6.1.3 (Rule #23: DATA-ASSERT):** Review assertion density and effectiveness, adding assertions where necessary, especially around critical logic and service boundaries.
        * **Internal Success Criteria:** Codebase is consistently formatted. Static analysis and compilation produce zero warnings. Assertion density meets project standard.
        * **Internal Verification Method:** Run formatter check (`prettier --check .`). Run compiler and static analysis tools. Review assertion usage. Verify compliance with Rule #7, #23, #54.
        * **Task Completion Testing (Internal):** N/A. Update `docs/Aether_Dev_Log.md`.

    - [ ] **Task 6.2: Documentation Finalization**
        * **Task Objective:** Complete and verify all project documentation.
        - [ ] * **Step 6.2.1 (Rule #55: DOC-API, Rule #56: DOC-INT):** Ensure all public APIs and complex internal logic are fully documented with JSDoc/TSDoc comments.
        - [ ] * **Step 6.2.2 (Rule #57: DOC-EXT):** Create/update `README.md`, `docs/Aether_User_Guide.md`, and ensure `docs/Aether_Requirements.md` and `docs/Aether_Architecture.md` accurately reflect the final implementation.
        - [ ] * **Step 6.2.3 (Rule #23: TEST-REP):** Ensure `docs/Aether_Test_Log.md` is complete and accurate with final test results.
        * **Internal Success Criteria:** All code is adequately commented. External documentation is complete, accurate, and up-to-date. Test log finalized.
        * **Internal Verification Method:** Review code comments. Review all documentation files against the final codebase and test results. Verify compliance with Rule #23, #55, #56, #57.
        * **Task Completion Testing (Internal):** N/A. Update `docs/Aether_Dev_Log.md`.

    - [ ] **Task 6.3: Final Validation & Submission**
        * **Task Objective:** Perform final checks and submit the completed project.
        - [ ] * **Step 6.3.1 (Rule #61: FINAL-SWEEP):** Perform the mandatory Final Sweep protocol: Verify absence of hardcoded values (esp. secrets, encryption key), placeholders, TODOs; ensure consistent formatting; perform security remnant review; validate documentation accuracy; perform final codebase analysis. Recursively fix any issues found.
        - [ ] * **Step 6.3.2 (Rule #62: FINAL-DELIV):** Prepare the final deliverable package (source code archive, documentation).
        - [ ] * **Step 6.3.3:** Submit the final deliverable package.
        * **Internal Success Criteria:** All Final Sweep checks pass. Deliverable package prepared and submitted.
        * **Internal Verification Method:** Execute Final Sweep checklist. Verify deliverable package contents. Verify compliance with Rule #61, #62.
        * **Task Completion Testing (Internal):** Final submission.

---
Execute STEP 1.1.1 now by addressing the first unchecked checkbox `- [ ]`. Proceed through all STEPS, TASKS, and PHASES sequentially and autonomously, adhering strictly to the **Apex Software Compliance Standards Guide v1.4** (`../apex/STANDARDS.md`) and marking each checkbox `- [x]` upon successful completion and verification. Report **only** upon successful completion of STEP 6.3.3 by submitting the final deliverable package.

*(Instructions based on requirements established as of 2025-04-06 23:27:06 PM (America/Chicago). Location context: Menasha, Wisconsin, United States)*
