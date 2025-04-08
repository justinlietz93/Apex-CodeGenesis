# Meta-Structure Definition for Autonomous LLM Execution Prompts

## 1. Overall Purpose
This document defines a standardized template structure for prompts intended to guide an Large Language Model (LLM) agent in executing complex, multi-step projects autonomously. The structure emphasizes absolute explicitness, sequential task execution, integrated quality checks, and minimizes ambiguity to ensure reliable completion according to predefined rules and requirements.

## 2. Core Execution Principles & Global Rules
The agent executing a prompt based on this template MUST adhere to the following core principles, assumed to be part of its operational "Global Rules":

* **Strict Sequential Execution:**
    * The prompt defines work hierarchically: **Phase -> Task -> Step**. Each of these items MUST be represented with an unchecked Markdown checkbox (`- [ ]`) at the start of its definition line.
    * Execution MUST proceed in the specified order: complete all Steps within a Task before starting the next Task; complete all Tasks within a Phase before starting the next Phase.
    * Do NOT proceed to the next item (Step, Task, Phase) until the current item is fully completed, its internal success criteria are met, and its corresponding checkbox is marked as completed (`- [x]`).
* **Internal Success Criteria & Verification:**
    * Each Task (and potentially Phase) defines `Internal Success Criteria` (measurable conditions for completion) and `Internal Verification Method` (how the agent checks if criteria are met).
    * The agent MUST perform the internal verification upon completing the steps for a Task/Phase.
* **Recursive Error Handling / Retry Logic:**
    * If the `Internal Verification Method` for a Step, Task, or Phase indicates that the `Internal Success Criteria` have **NOT** been met (e.g., tests fail, quality checks fail), the agent MUST NOT proceed.
    * Instead, the agent MUST **re-execute the failed Step(s) or Task(s)**, identify the cause of the failure, implement necessary corrections, and then **re-run the Internal Verification Method**.
    * This cycle of execute-verify-correct-reverify MUST be repeated recursively until the `Internal Success Criteria` for the current Step/Task/Phase are successfully met. Only then can the agent mark the item's checkbox and proceed to the next sequential item.
* **Autonomous Operation & Reporting:**
    * Prompts using this template typically require fully autonomous execution.
    * Intermediate reporting or requests for approval are generally **DISABLED** unless explicitly stated otherwise in the `Directive Section`.
    * Progress and test results are logged internally as specified (see `Test Reporting Protocol`). Progress is also visually tracked by the state of the checkboxes.
    * External reporting occurs **only** upon completion of the entire sequence, usually via submission of the final deliverable package.
* **Adherence to Referenced Global Rules:** Steps may reference conceptual `(Rule X)` items. The agent MUST interpret these as pointers to mandatory, overarching project standards (e.g., Quality, Security, Modularity) defined elsewhere or assumed as part of its core programming, and ensure the action complies with that rule.

## 3. Mandatory Quality & Finalization Rules (To Be Enforced by Agent)
Regardless of specific Step instructions, the agent MUST continuously enforce and finally verify adherence to these project-wide standards:

* **Code Quality Standards:** All generated code must adhere to best software design patterns, security best practices, and ACID standards where applicable (e.g., for data operations).
* **Line Limit & Modularization:**
    * No functional code file may exceed **500 lines**.
    * If implementing a Step causes a file to exceed this limit, the agent MUST **immediately** pause that Step's primary action, create a new subfolder at the file's location, intelligently refactor the oversized file into smaller, cohesive modules within that subfolder, and update the original file to act primarily as an interface/router to the new modules. Only then should the Step's primary action resume/complete. This refactoring is part of fulfilling the Step.
* **Final Sweep (Before Final Submission):** After completing all defined Phases and Tasks, but before preparing the final deliverable package (Step 10 in the example), the agent MUST perform a meticulous final sweep of the *entire* codebase and project structure (excluding specified `.gitignore` contents):
    * Verify absolute absence of hardcoded values (credentials, paths, URLs, magic numbers/strings).
    * Verify absence of placeholders, `TODO`/`FIXME` comments, or other remaining development artifacts.
    * Ensure consistent and clean code formatting according to project standards (e.g., using a formatter like Prettier if defined).
    * Perform a security review for potentially left-out sensitive information or credentials.
* **Documentation Check:** Perform a final validation that all documentation (`README.md`, `UserGuide.md`, code comments) is up-to-date and accurately reflects the final state of the project.
* **Codebase Analysis:** Perform a final, meticulous file-by-file analysis/review of the entire codebase for any potential issues missed by other checks.
* **Definition of Completion:** Project completion is achieved ONLY after all Phases/Tasks/Steps are successfully executed *AND* all Mandatory Quality & Finalization Rules are met, indicated by all checkboxes being marked complete.

## 4. Prompt Template Structure (Section by Section)

* **A. Overall Formatting:**
    * The entire prompt MUST be enclosed in a Markdown code block (```markdown ... ```).
    * All hierarchical execution items (Phases, Tasks, Steps) MUST begin with an unchecked Markdown checkbox (`- [ ]`).

* **B. Subject Line:**
    * Format: `Subject: [CONCISE, ACTION-ORIENTED TITLE]`
    * Purpose: Clear title indicating the prompt's goal.

* **C. Directive Section:**
    * Purpose: Establishes the top-level execution context, rules, and constraints.
    * Content: Includes execution mode (autonomous), sequential execution rule (with checkbox emphasis), global rules reference, reporting constraints (e.g., "Report only upon completion..."), and instruction for internal logging.

* **D. Test Reporting Protocol (Internal):**
    * Purpose: Defines the standard for the internal test log file (e.g., `docs/Test_Result_Analysis.md`).
    * Content: Specifies file location, required data points (Date, Scope, Pass %, Coverage %), and update frequency (after Task/Phase testing).

* **E. Hierarchical Execution Blocks:**
    * The core of the prompt, organized sequentially. Uses Markdown headings and lists for structure. Separated by `---`.
    * **Every Phase, Task, and Step listed MUST start with an unchecked Markdown checkbox (`- [ ]`).**

    * **E.1. Phase Block (`- [ ] **Phase X: Name**`)**
        * Structure: Top-level grouping for major project stages. Starts with `- [ ] **Phase X: Name**`.
        * Content: Contains a high-level `* **Objective:**` for the phase. Consists of one or more Task Blocks.

    * **E.2. Task Block (`- [ ] **Task X.Y: Name**`)**
        * Structure: Represents a distinct work package within a Phase. Starts with `- [ ] **Task X.Y: Name**`. Typically indented under a Phase.
        * Content: Contains an optional `* **Task Objective:**`, one or more Step list items, `Internal Success Criteria`, `Internal Verification Method`, and `Task Completion Testing (Internal)` instructions.

    * **E.3. Step (`- [ ] * **Step X.Y.Z (Rule Ref):** Action`)**
        * Structure: The most granular instruction. A list item starting with `- [ ] * **Step X.Y.Z ...`. Typically indented under a Task.
        * Content: Begins with an explicit **action verb** (Create, Implement, Refactor, Execute, Verify, Update, Generate, Submit, etc.). Clearly describes the single action to perform. May reference conceptual `(Rule X)`. A Task typically contains 1-3 Steps.

    * **E.4. Internal Success Criteria (within Task Block)**
        * Structure: Starts with `* **Internal Success Criteria:**`. Does NOT require a checkbox itself.
        * Content: Defines specific, measurable conditions defining the successful completion of the Task. Uses objective language.

    * **E.5. Internal Verification Method (within Task Block)**
        * Structure: Starts with `* **Internal Verification Method:**`. Does NOT require a checkbox itself.
        * Content: Defines the *actions the agent must perform internally* to check if the Success Criteria are met (e.g., "Execute specific unit tests," "Analyze code file content," "Run static analysis tool").

    * **E.6. Task Completion Testing (Internal - within Task Block)**
        * Structure: Standard sub-section, typically comprising 1-2 Steps (each starting with `- [ ]`).
        * Content: Instructs the agent to run relevant tests for the completed Task and update the internal log file (`docs/Test_Result_Analysis.md`) with results.

    * **E.7. Phase Completion Testing (Internal - end of Phase Block)**
        * Structure: Standard block at the end of major implementation/integration phases, typically comprising Steps (each starting with `- [ ]`).
        * Content: Instructs the agent to run cumulative tests for the entire Phase, check overall metrics (e.g., coverage), and update the internal log file with a Phase summary.

* **F. Final Instruction:**
    * Purpose: Explicitly commands the agent to begin execution.
    * Content: Example: `Execute STEP 1 now by addressing the first unchecked checkbox `- [ ]`. Proceed through all STEPS, TASKS, and PHASES sequentially and autonomously, marking each checkbox `- [x]` upon successful completion. Report only upon completion...`

* **G. Contextual Footer:**
    * Purpose: Provides metadata for the prompt generation context.
    * Content: Includes timestamp and location information. `*(Instructions based on requirements established as of [Date/Time]. Location context: [Location])*`

## 5. Summary
This template provides a highly structured format for defining complex, autonomous tasks for LLM agents. By adhering to this structure, prompts can achieve greater clarity, enforce sequential execution with internal verification and error handling (tracked via mandatory checkboxes `- [ ]` for each Phase, Task, and Step), mandate quality standards, and ensure comprehensive completion before final reporting. Remember to replace bracketed placeholders `[...]` and conceptual `(Rule X)` references with project-specific details when creating a prompt using this template.

*(Meta-structure explanation based on requirements established as of Sunday, April 6, 2025 at 7:04:41 PM CDT. Location context: Menasha, Wisconsin, United States)*
