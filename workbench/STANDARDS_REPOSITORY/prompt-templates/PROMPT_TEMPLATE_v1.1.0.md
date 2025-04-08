# Meta-Structure Definition for Autonomous LLM Execution Prompts v1.1.0

## 1. Overall Purpose
This document defines a standardized template structure for prompts intended to guide an Large Language Model (LLM) agent (e.g., SE-Apex) in executing complex, multi-step projects autonomously. The structure emphasizes absolute explicitness, sequential task execution, integrated quality checks referencing the **Apex Software Compliance Standards Guide**, and minimizes ambiguity to ensure reliable completion according to predefined rules and requirements.

## 2. Core Execution Principles & Global Rules
The agent executing a prompt based on this template MUST adhere to the following core principles:

*   **Apex Standards Adherence:** Compliance with the **Apex Software Compliance Standards Guide** (located at `../apex/STANDARDS.md` relative to this template's directory) is **MANDATORY** for all steps and deliverables. Specific rules referenced as `(Rule #X: CODE)` directly correspond to the numbered rules in that guide. The Standards Guide takes precedence over potentially conflicting prompt details unless a deviation is explicitly stated and justified within the prompt itself.
*   **Strict Sequential Execution:**
    *   The prompt defines work hierarchically: **Phase -> Task -> Step**. Each item MUST begin with an unchecked Markdown checkbox (`- [ ]`).
    *   Execution MUST proceed sequentially: complete all Steps within a Task before the next Task; complete all Tasks within a Phase before the next Phase.
    *   Do NOT proceed to the next item until the current item is fully completed, its `Internal Success Criteria` are met (verified via `Internal Verification Method`), and its checkbox is marked complete (`- [x]`).
*   **Internal Success Criteria & Verification:**
    *   Each Task defines `Internal Success Criteria` and `Internal Verification Method`.
    *   The agent MUST perform the internal verification upon completing the steps for a Task/Phase. Verification MUST include confirming compliance with all `(Rule #X: CODE)` references within the completed Task/Steps.
*   **Recursive Error Handling / Retry Logic:**
    *   If `Internal Verification` fails (criteria unmet, tests fail, rule violations detected), the agent MUST NOT proceed.
    *   It MUST re-execute the failed Step(s)/Task(s), identify and implement corrections, and re-run the `Internal Verification Method` (including rule compliance checks).
    *   This cycle repeats until verification succeeds.
*   **Autonomous Operation & Reporting:**
    *   Execution is fully autonomous unless specified otherwise.
    *   Intermediate reporting is DISABLED unless explicitly required.
    *   Progress/test results are logged internally per `Test Reporting Protocol`. Checkbox state visually tracks progress.
    *   External reporting occurs ONLY upon completion of the entire sequence.

## 3. Mandatory Quality & Finalization Rules (Reference `../apex/STANDARDS.md`)
Regardless of specific Step instructions, the agent MUST continuously enforce and finally verify adherence to **all** applicable rules within the **Apex Software Compliance Standards Guide** (`../apex/STANDARDS.md`), particularly including but not limited to:
*   **Code Quality & Structure:** See Section 8 (`QUAL-*` rules).
*   **Configuration Management:** See Section 12 (`CONF-*` rules).
*   **Security:** See Section 13 (`SEC-*` rules).
*   **Testing & Verification:** See Section 14 (`TEST-*` rules).
*   **Documentation:** See Section 18 (`DOC-*` rules).
*   **Implementation Correctness:** See Section 19 (`IMPL-*` rules).
*   **Final Validation:** See Section 21 (`FINAL-*` rules), especially `FINAL-SWEEP`.

## 4. Prompt Template Structure (Section by Section)

*   **A. Overall Formatting:**
    *   Enclose entire prompt in ```markdown ... ```.
    *   All Phase, Task, Step items MUST begin with `- [ ]`.

*   **B. Subject Line:**
    *   Format: `Subject: [CONCISE, ACTION-ORIENTED TITLE]`

*   **C. Directive Section:**
    *   Establishes context, execution mode, sequential rule, **explicit reference to mandatory adherence to `../apex/STANDARDS.md`**, reporting constraints, internal logging instructions.

*   **D. Test Reporting Protocol (Internal):**
    *   Defines standard for internal test log (e.g., `docs/Test_Result_Analysis.md`).
    *   Specifies location, data points (Date, Scope, Pass %, Coverage %, Findings), update frequency.

*   **E. Hierarchical Execution Blocks:**
    *   Core of the prompt, sequential. Uses Markdown headings/lists. Separated by `---`.
    *   **Every Phase, Task, Step MUST start with `- [ ]`.**

    *   **E.1. Phase Block (`- [ ] **Phase X: Name**`)**
        *   Content: High-level `* **Objective:**`. Contains Task Blocks.

    *   **E.2. Task Block (`- [ ] **Task X.Y: Name**`)**
        *   Content: Optional `* **Task Objective:**`, Step list items, `Internal Success Criteria`, `Internal Verification Method`, `Task Completion Testing (Internal)`.

    *   **E.3. Step (`- [ ] * **Step X.Y.Z [(Rule #N: CODE), ...]:** Action`)**
        *   Content: Begins with explicit **action verb**. Describes single action. **MUST** reference all applicable rules from `../apex/STANDARDS.md` using `(Rule #N: CODE)` format.

    *   **E.4. Internal Success Criteria (within Task Block)**
        *   Defines measurable conditions for Task completion. MUST implicitly include "Compliance with all referenced Apex Standards Rules".

    *   **E.5. Internal Verification Method (within Task Block)**
        *   Defines agent actions to check Success Criteria. MUST include "Verify compliance with all referenced Apex Standards Rules for this Task and its Steps."

    *   **E.6. Task Completion Testing (Internal - within Task Block)**
        *   Instructs agent to run relevant tests and update internal test log.

    *   **E.7. Phase Completion Testing (Internal - end of Phase Block)**
        *   Instructs agent to run cumulative Phase tests, check metrics, update internal test log.

*   **F. Final Instruction:**
    *   Explicitly commands start of execution, emphasizing sequential processing, checkbox marking, **adherence to `../apex/STANDARDS.md`**, and final reporting constraint.

*   **G. Contextual Footer:**
    *   Metadata: Timestamp, location. `*(Instructions based on requirements established as of [Date/Time]. Location context: [Location])*`

## 5. Summary
This enhanced template mandates strict adherence to the **Apex Software Compliance Standards Guide** (`../apex/STANDARDS.md`) by requiring explicit rule references in steps and verification checks. It enforces sequential, verifiable, and high-quality autonomous execution.

*(Meta-structure v1.1.0 explanation established 2025-04-06)*
