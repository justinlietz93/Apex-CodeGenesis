# NASA Software Engineering Standards Synthesis

**Sources:**
*   The Power of Ten – Rules for Developing Safety Critical Code (Gerard J. Holzmann, NASA/JPL) [PoT]
*   NASA-STD-8739.8B - Software Assurance and Software Safety Standard [SA]
*   NASA-STD-8739.9 - Software Formal Inspections Standard [FI]
**Version:** 2.0
**Date:** 2025-04-06

## 1. Introduction

This document synthesizes critical software engineering, assurance, safety, and inspection standards derived from key NASA documents (`nasa-10-rules.pdf`, `NASA-STD-8739.8B`, `NASA-STD-8739.9`). It aims to provide a consolidated set of actionable guidelines applicable to high-quality, reliable software development, particularly in critical contexts. Each standard includes a unique Rule #, a mnemonic Code, the Standard itself, its Rationale, Verification methods, and the source document(s).

## 2. Core Principles (Synthesized)

*   **Rigor & Discipline:** Adherence to defined processes, standards, and requirements.
*   **Safety & Reliability:** Prioritize hazard prevention, fault tolerance, and dependable operation.
*   **Verifiability:** Ensure requirements, design, code, and processes can be objectively verified and validated.
*   **Simplicity & Clarity:** Favor simple constructs; ensure code and documentation are understandable.
*   **Proactive Defect Removal:** Emphasize early defect detection and removal through analysis and inspection.
*   **Process Improvement:** Collect data and analyze processes to enable continuous improvement.
*   **Traceability:** Maintain clear links between requirements, design, code, tests, and hazards.
*   **Risk Management:** Proactively identify, analyze, and mitigate risks throughout the lifecycle.

## 3. Synthesized NASA Standards

### Section 3.1: Planning & Process (PROC)

*   **Rule #:** 1
*   **Code:** `PROC-PLAN-LC`
*   **Standard:** Develop, maintain, and execute software plans covering the entire life-cycle (development, assurance, safety, configuration management, maintenance, retirement, security), addressing applicable requirements with approved tailoring. [SA: 3.1.3]
*   **Rationale:** Ensures all aspects of the software lifecycle are considered and managed systematically.
*   **Verification:** Review and approval of plans; audits against plan execution.

*   **Rule #:** 2
*   **Code:** `PROC-TRACK-EXEC`
*   **Standard:** Track actual results and performance of software activities against plans. Take, record, and manage corrective actions and changes to commitments to closure. [SA: 3.1.4]
*   **Rationale:** Provides visibility into project progress and ensures deviations are managed.
*   **Verification:** Review of project tracking data, corrective action logs, change records.

*   **Rule #:** 3
*   **Code:** `PROC-RISK-MGMT`
*   **Standard:** Record, analyze, plan, track, control, and communicate all software risks (including safety and cybersecurity) and mitigation plans throughout the lifecycle. [SA: 5.2.1, 3.11.3]
*   **Rationale:** Proactively identifies and manages potential problems that could impact project success, safety, or security.
*   **Verification:** Review of risk management plan and risk register; audits of risk management process.

*   **Rule #:** 4
*   **Code:** `PROC-MATURITY`
*   **Standard:** For high-criticality software, acquire, develop, and maintain software from organizations demonstrating appropriate process maturity (e.g., CMMI-DEV Level 2 or 3). [SA: 3.9.3]
*   **Rationale:** Increases confidence in the provider's ability to deliver quality software through established processes.
*   **Verification:** Confirmation of provider's process maturity rating/assessment.

### Section 3.2: Requirements Engineering (REQ)

*   **Rule #:** 5
*   **Code:** `REQ-DEFINE-VVT`
*   **Standard:** Establish, capture, record, approve, and maintain software requirements derived from system requirements, safety/reliability analyses, and hardware specifications. Requirements must be correct, consistent, complete, accurate, readable, traceable, and testable. [SA: 4.1.2, 4.1.3, FI: 7.4.1]
*   **Rationale:** Forms the basis for design, implementation, and verification; ensures the right system is built correctly.
*   **Verification:** Requirements inspections/reviews; traceability analysis; validation against user needs.

*   **Rule #:** 6
*   **Code:** `REQ-SAFETY-CRITICAL`
*   **Standard:** Include software-related safety constraints, controls, mitigations, and assumptions in requirements. Identify safety-critical requirements explicitly, traceable to hazard analysis. [SA: 4.1.4, 3.7.1, FI: 7.4.1]
*   **Rationale:** Ensures safety considerations are formally captured, analyzed, implemented, and verified.
*   **Verification:** Review of requirements against hazard analyses; traceability analysis; safety reviews.

*   **Rule #:** 7
*   **Code:** `REQ-TRACE-BIDIR`
*   **Standard:** Perform, record, and maintain bi-directional traceability between requirements and higher-level sources, design, code, tests, hazards, and non-conformances, appropriate to the software criticality. [SA: 3.12.1]
*   **Rationale:** Ensures all requirements are implemented and tested, and that all code/tests map back to requirements. Facilitates impact analysis and verification of hazard controls.
*   **Verification:** Traceability matrix review; automated traceability tools.

### Section 3.3: Design & Architecture (DES)

*   **Rule #:** 8
*   **Code:** `DES-ARCH-DEFINE`
*   **Standard:** Transform requirements into a recorded software architecture describing structure, qualities (including safety, security, reliability), interfaces, and components. Ensure architecture meets safety and mission-critical needs. [SA: 4.2.3, FI: 7.5.1]
*   **Rationale:** Provides a high-level blueprint, guiding detailed design and ensuring key qualities are addressed structurally.
*   **Verification:** Architecture reviews; analysis against requirements and quality attributes.

*   **Rule #:** 9
*   **Code:** `DES-DETAIL-IMPL`
*   **Standard:** Develop, record, and maintain a detailed software design based on the architecture, describing lower-level units sufficiently for coding and testing. Ensure design implements requirements (including safety controls) and does not introduce unintended behaviors or unnecessary complexity. [SA: 4.3.2, FI: 7.6.1]
*   **Rationale:** Provides the specific implementation plan. Ensures requirements are correctly translated into code structure.
*   **Verification:** Detailed design inspections/reviews; traceability to architecture and requirements.

*   **Rule #:** 10
*   **Code:** `DES-MODULARITY`
*   **Standard:** Design MUST emphasize modularity, separation of concerns, high cohesion, and low coupling.
*   **Rationale:** Fundamental principle for maintainable, testable, and reusable software.
*   **Verification:** Design reviews, architectural analysis, dependency analysis tools.

### Section 3.4: Implementation & Coding (CODE)

*   **Rule #:** 11
*   **Code:** `CODE-CTL-SIMPLE` (PoT Rule 1)
*   **Standard:** Restrict code to simple control flow constructs (no goto, setjmp/longjmp, recursion unless justified).
*   **Rationale:** Enhances verifiability, clarity, analyzability. Guarantees acyclic call graph.
*   **Verification:** Static analysis, code review.

*   **Rule #:** 12
*   **Code:** `CODE-CTL-BOUNDLOOP` (PoT Rule 2)
*   **Standard:** All loops must have statically verifiable fixed upper bounds or be provably non-terminating. Use runtime checks for variable-bound loops.
*   **Rationale:** Prevents runaway code, ensures termination.
*   **Verification:** Static analysis, code review for runtime checks.

*   **Rule #:** 13
*   **Code:** `CODE-MEM-STATIC` (PoT Rule 3)
*   **Standard:** Prohibit dynamic memory allocation after initialization in critical systems. Manage carefully otherwise.
*   **Rationale:** Avoids allocator unpredictability and common memory errors. Enables static memory bounding.
*   **Verification:** Static analysis, memory analysis tools, code review.

*   **Rule #:** 14
*   **Code:** `CODE-FUNC-SIZE` (PoT Rule 4)
*   **Standard:** Limit function size (e.g., ~60 lines for critical code) to maintain understandability and verifiability.
*   **Rationale:** Ensures functions are understandable logical units. Discourages poor structure.
*   **Verification:** Line counting tools, code review.

*   **Rule #:** 15
*   **Code:** `CODE-ASSERT-DENSITY` (PoT Rule 5)
*   **Standard:** Use assertions liberally (e.g., >= 2 per function average for critical code) to check anomalous conditions. Assertions must be side-effect free. Failures must trigger recovery. Avoid trivial assertions.
*   **Rationale:** Increases defect detection, supports defensive coding, verifies assumptions.
*   **Verification:** Static analysis (count, trivial checks), code review (placement, meaningfulness, side-effects, recovery).

*   **Rule #:** 16
*   **Code:** `CODE-DATA-SCOPE` (PoT Rule 6)
*   **Standard:** Declare data objects at the smallest possible scope. Avoid unnecessary global variables.
*   **Rationale:** Supports data hiding, limits corruption potential, simplifies diagnosis.
*   **Verification:** Static analysis, code review.

*   **Rule #:** 17
*   **Code:** `CODE-CHECK-RETURN` (PoT Rule 7)
*   **Standard:** Check return values of non-void functions and validate parameters within functions. Explicitly ignore trivial returns with justification.
*   **Rationale:** Prevents errors from ignored failures or invalid inputs. Ensures error propagation.
*   **Verification:** Static analysis, code review.

*   **Rule #:** 18
*   **Code:** `CODE-PRE-LIMIT` (PoT Rule 8)
*   **Standard:** Limit preprocessor use (especially in C/C++) to includes and simple macros. Avoid complex features (token pasting, recursion, varargs). Minimize conditional compilation.
*   **Rationale:** Avoids obfuscation, aids analysis, reduces testing complexity.
*   **Verification:** Static analysis, code review for justification.

*   **Rule #:** 19
*   **Code:** `CODE-PTR-LIMIT` (PoT Rule 9)
*   **Standard:** Restrict pointer use (e.g., max one level of dereferencing in C). Do not hide dereferences. Prohibit function pointers unless strongly justified.
*   **Rationale:** Reduces pointer errors, simplifies data flow analysis. Function pointers hinder static analysis.
*   **Verification:** Static analysis, code review.

*   **Rule #:** 20
*   **Code:** `CODE-SECURE-PRAC`
*   **Standard:** Implement and adhere to secure coding practices relevant to the language and platform. Use static analysis to verify adherence. [SA: 3.11.6, 3.11.7]
*   **Rationale:** Proactively prevents common security vulnerabilities during implementation.
*   **Verification:** Static analysis (SAST) tool results, code review against secure coding standards.

*   **Rule #:** 21
*   **Code:** `CODE-PROJECT-STD`
*   **Standard:** Select, define, and adhere to project-specific software coding methods, standards (including formatting), and criteria. [SA: 4.4.3]
*   **Rationale:** Ensures consistency, readability, and maintainability according to project conventions.
*   **Verification:** Code reviews, automated style/lint checks.

### Section 3.5: Testing & Verification (TEST)

*   **Rule #:** 22
*   **Code:** `TEST-PLAN-PROC`
*   **Standard:** Establish and maintain software test plan(s), procedure(s), test cases/scripts, and report(s). Plans must cover requirements verification, including safety-critical and off-nominal scenarios, with objective acceptance criteria. [SA: 4.5.2, FI: 7.8.1, 7.9.1]
*   **Rationale:** Ensures a systematic, documented, and objective approach to testing.
*   **Verification:** Review/inspection of test artifacts; traceability to requirements and hazards.

*   **Rule #:** 23
*   **Code:** `TEST-REQ-COVERAGE`
*   **Standard:** Test the software against all its requirements. Evaluate test results and record the evaluation. [SA: 4.5.3, 4.5.5]
*   **Rationale:** Verifies that the implemented software meets its specified functionality.
*   **Verification:** Test execution results, requirements traceability matrix, review of test result evaluation records.

*   **Rule #:** 24
*   **Code:** `TEST-SAFETY-CRITICAL`
*   **Standard:** Verify through test (including independent testing where appropriate) all software requirements that trace to a hazardous event, cause, or mitigation technique. [SA: 4.5.12, 3.7.4]
*   **Rationale:** Ensures safety controls implemented in software function correctly under nominal and off-nominal conditions.
*   **Verification:** Test execution results, review of safety-critical test cases and off-nominal scenarios, traceability to hazard analysis.

*   **Rule #:** 25
*   **Code:** `TEST-CODE-COVERAGE`
*   **Standard:** Select, implement, track, record, and report code coverage measurements from test execution. For safety-critical software, 100% MC/DC coverage is required; justify any deviations with risk assessment. [SA: 4.5.9, 4.5.10, 3.7.4]
*   **Rationale:** Measures the extent to which source code is executed during testing. MC/DC provides high assurance for critical code.
*   **Verification:** Code coverage reports, analysis of uncovered code, review of justifications for deviations.

*   **Rule #:** 26
*   **Code:** `TEST-REGRESSION`
*   **Standard:** Plan and conduct software regression testing after changes to demonstrate that defects have not been introduced or uncovered, and security vulnerabilities have not been introduced. [SA: 4.5.11]
*   **Rationale:** Prevents unintended consequences of code modifications.
*   **Verification:** Review of regression test plan and results.

*   **Rule #:** 27
*   **Code:** `TEST-CM-REPEAT`
*   **Standard:** Place software items under configuration management prior to testing. Maintain test procedures, scripts, results, and data needed to repeat tests. [SA: 4.5.4, 4.4.6]
*   **Rationale:** Ensures tests are performed on known versions and can be reliably repeated.
*   **Verification:** Configuration management records, audit of test environment/artifacts.

*   **Rule #:** 28
*   **Code:** `TEST-DATA-UPLINK`
*   **Standard:** Develop and execute acceptance tests for loaded or uplinked data, rules, and code that affects software/system behavior, especially for safety-critical operations. [SA: 4.5.13]
*   **Rationale:** Verifies the integrity and correctness of externally loaded configurations or commands.
*   **Verification:** Review and execution of acceptance tests for loaded data/code.

### Section 3.6: Software Assurance & Inspection (SA)

*   **Rule #:** 29
*   **Code:** `SA-FORMAL-INSPECT` (Derived from FI)
*   **Standard:** Perform formal inspections or rigorous peer reviews on critical software products (requirements, plans, design, code, test procedures) following a defined process with specific roles (Moderator, Author, Reader, Recorder), stages (Planning, Overview, Preparation, Meeting, Rework, Follow-up), entry/exit criteria, and data collection (defects, effort). [FI: 4.1, 4.2, 5.2, 6.2, 6.3, 8.1]
*   **Rationale:** Proven, effective method for early defect detection and removal. Improves product quality and reduces downstream costs. Fosters shared understanding.
*   **Verification:** Inspection records, defect logs, process audits, review of collected data.

*   **Rule #:** 30
*   **Code:** `SA-STATIC-ANALYSIS` (Derived from PoT Rule 10)
*   **Standard:** Utilize state-of-the-art static analysis tools daily/continuously to check for defects, security vulnerabilities, code coverage, complexity, and adherence to coding standards. Address all tool warnings (rewrite code if necessary, do not suppress without strong justification). [PoT Rule 10, SA: 4.4.4]
*   **Rationale:** Leverages automated tools for early detection of a wide range of potential issues beyond compiler checks.
*   **Verification:** Static analysis tool reports, CI logs, code review for handling of warnings.

*   **Rule #:** 31
*   **Code:** `SA-OTS-EVAL`
*   **Standard:** Evaluate COTS, GOTS, MOTS, OSS, and reused software components rigorously: identify requirements met, address licensing/support/ownership, verify/validate to the same level as custom code for intended use, assess security risks, and perform periodic assessments of vendor defects/vulnerabilities. [SA: 3.1.14, 5.5.3, 4.5.14]
*   **Rationale:** Manages risks associated with using pre-existing software components of potentially unknown quality or security posture.
*   **Verification:** Review of component selection rationale, V&V results for OTS components, license documentation, vendor defect tracking process, security assessment reports.

*   **Rule #:** 32
*   **Code:** `SA-DEFECT-MGMT`
*   **Standard:** Track and maintain all software non-conformances/defects with defined severity levels. Perform root cause analysis for high-severity defects and implement process improvements based on findings. [SA: 5.5.1, 5.5.2, 5.5.4]
*   **Rationale:** Ensures defects are managed systematically and provides feedback for preventing recurrence and improving development processes.
*   **Verification:** Defect tracking system records, root cause analysis reports, process improvement documentation.

### Section 3.7: Safety-Critical Software Specifics (SCS)

*   **Rule #:** 33
*   **Code:** `SCS-SAFE-INIT`
*   **Standard:** Safety-critical software MUST initialize to a known safe state on first start and all restarts. [SA: 3.7.3.a]
*   **Rationale:** Prevents hazardous states resulting from improper initialization.
*   **Verification:** Design review, code inspection, testing of startup/restart sequences.

*   **Rule #:** 34
*   **Code:** `SCS-SAFE-TRANSITION`
*   **Standard:** Safety-critical software MUST safely transition between all predefined known states. [SA: 3.7.3.b]
*   **Rationale:** Ensures predictable and safe behavior during operational mode changes.
*   **Verification:** Design review (state machines), code inspection, testing of state transitions.

*   **Rule #:** 35
*   **Code:** `SCS-SAFE-TERMINATE`
*   **Standard:** Termination of safety-critical functions performed by software MUST result in a known safe state. [SA: 3.7.3.c]
*   **Rationale:** Prevents leaving the system in a hazardous condition upon function termination.
*   **Verification:** Design review, code inspection, testing of termination scenarios.

*   **Rule #:** 36
*   **Code:** `SCS-SAFE-OVERRIDE`
*   **Standard:** Operator overrides of safety-critical software functions MUST require at least two independent actions by an operator. [SA: 3.7.3.d]
*   **Rationale:** Prevents inadvertent hazardous actions due to single operator error.
*   **Verification:** Requirements review, design review, testing of override procedures.

*   **Rule #:** 37
*   **Code:** `SCS-SAFE-CMD-SEQ`
*   **Standard:** Safety-critical software MUST reject commands received out of sequence when execution of those commands out of sequence can cause a hazard. [SA: 3.7.3.e]
*   **Rationale:** Protects against hazards caused by incorrect operational sequencing.
*   **Verification:** Design review, code inspection, testing with out-of-sequence commands.

*   **Rule #:** 38
*   **Code:** `SCS-SAFE-MEM-MOD`
*   **Standard:** Safety-critical software MUST detect inadvertent memory modification (e.g., via checksums, memory protection units) and recover to a known safe state. [SA: 3.7.3.f]
*   **Rationale:** Protects against corruption of critical data or code due to hardware or software faults.
*   **Verification:** Design review, code inspection, fault injection testing.

*   **Rule #:** 39
*   **Code:** `SCS-SAFE-IO-INTEGRITY`
*   **Standard:** Safety-critical software MUST perform integrity checks on inputs and outputs to/from the software system. [SA: 3.7.3.g]
*   **Rationale:** Detects corrupted data that could lead to incorrect and potentially hazardous behavior.
*   **Verification:** Design review, code inspection, testing with corrupted data.

*   **Rule #:** 40
*   **Code:** `SCS-SAFE-PRECHECK`
*   **Standard:** Safety-critical software MUST perform prerequisite checks prior to the execution of safety-critical software commands. [SA: 3.7.3.h]
*   **Rationale:** Ensures system conditions are appropriate before executing potentially hazardous commands.
*   **Verification:** Design review, code inspection, testing of command execution under various prerequisite states.

*   **Rule #:** 41
*   **Code:** `SCS-SAFE-NO-SINGLE-EVENT`
*   **Standard:** No single software event or action is allowed to initiate an identified hazard. [SA: 3.7.3.i]
*   **Rationale:** Implements fault tolerance principle for hazardous events triggered by software.
*   **Verification:** Hazard analysis review, design review, FMEA/FTA involving software.

*   **Rule #:** 42
*   **Code:** `SCS-SAFE-TIMELY-RESPONSE`
*   **Standard:** Safety-critical software MUST respond to an off-nominal condition within the time needed to prevent a hazardous event. [SA: 3.7.3.j]
*   **Rationale:** Ensures real-time constraints related to safety are met.
*   **Verification:** Timing analysis, design review, testing under worst-case load conditions.

*   **Rule #:** 43
*   **Code:** `SCS-SAFE-ERROR-HDL`
*   **Standard:** Safety-critical software MUST provide error handling and be able to place the system into a defined safe state. [SA: 3.7.3.k, 3.7.3.l]
*   **Rationale:** Ensures predictable behavior and recovery options in the presence of faults.
*   **Verification:** Code review, fault injection testing, testing of safe mode entry.

*   **Rule #:** 44
*   **Code:** `SCS-SAFE-COMPLEXITY`
*   **Standard:** All identified safety-critical software components MUST have a cyclomatic complexity value of 15 or lower. Justify and obtain approval for any necessary exceedance. [SA: 3.7.5]
*   **Rationale:** Limits complexity in critical code, improving understandability, testability, and reducing the likelihood of hidden defects.
*   **Verification:** Static analysis complexity measurement tools, code review for justifications.

### Section 3.8: Security (SEC) - *Consolidated from Apex Standards*

*   **Rule #:** 45
*   **Code:** `SEC-KEY-STORAGE`
*   **Standard:** Sensitive data (API keys, passwords, tokens, encryption keys, certificates) MUST NEVER be stored in source code, version control, or plain text configuration files. Secure storage mechanisms (e.g., OS keychain, encrypted configuration stores, secrets management services) MUST be used. Encryption keys used for storage MUST NOT be hardcoded.
*   **Rationale:** Prevents accidental exposure of credentials, which is a critical security vulnerability.
*   **Verification:** Code review, SAST tools, configuration file review, verification of secure storage implementation.

*   **Rule #:** 46
*   **Code:** `SEC-SANDBOX-EXEC`
*   **Standard:** Execution of untrusted or third-party code (e.g., plugins) MUST occur within a secure sandbox environment that restricts access to system resources (filesystem, network, processes) and application internals based on a defined permission model.
*   **Rationale:** Prevents malicious or poorly written third-party code from compromising the application or system.
*   **Verification:** Code review of sandboxing implementation, security testing with malicious test plugins.

*   **Rule #:** 47
*   **Code:** `SEC-INPUT-VAL`
*   **Standard:** All external inputs (user input, API responses, file contents, IPC messages, database results) MUST be validated, sanitized, and properly encoded/escaped before use, especially in security-sensitive contexts.
*   **Rationale:** Prevents injection attacks (SQLi, XSS, command injection), path traversal, and other vulnerabilities arising from untrusted input.
*   **Verification:** Code review, SAST, DAST, penetration testing.

*   **Rule #:** 48
*   **Code:** `SEC-DEPS-MGMT`
*   **Standard:** External dependencies MUST be actively managed. Use fixed, verified versions. Regularly scan for known vulnerabilities using automated tools. Update vulnerable dependencies promptly.
*   **Rationale:** Protects against vulnerabilities inherited from third-party code.
*   **Verification:** Dependency scanning tool reports, review of dependency manifests.

*   **Rule #:** 49
*   **Code:** `SEC-LEAST-PRIV`
*   **Standard:** Adhere to the principle of least privilege. Components and processes should only have the minimum permissions necessary. Follow secure coding practices specific to the language/framework.
*   **Rationale:** Minimizes the potential impact of a security breach.
*   **Verification:** Code review, architectural review, security testing.

### Section 3.9: Final Validation (FINAL) - *Consolidated from Apex Standards*

*   **Rule #:** 50
*   **Code:** `FINAL-SWEEP-CHECK`
*   **Standard:** Before final delivery, a mandatory Final Sweep protocol MUST be executed, verifying: absence of hardcoded values (esp. secrets, encryption keys), absence of placeholders/TODOs, consistent formatting, absence of security remnants, and documentation accuracy. All issues found MUST be rectified.
*   **Rationale:** Provides a final quality gate.
*   **Verification:** Execution of the Final Sweep checklist items.

*   **Rule #:** 51
*   **Code:** `FINAL-DELIVERABLE`
*   **Standard:** The final deliverable package MUST be complete, containing all necessary source code, build artifacts, configuration, documentation, and verification results as specified by project requirements.
*   **Rationale:** Ensures the recipient has everything needed.
*   **Verification:** Review of deliverable package contents against requirements.

---
*(NASA Standards Synthesis V2.0 established 2025-04-06)*
<environment_details>
# VSCode Visible Files
(No visible files)

# VSCode Open Tabs
STANDARDS_REPOSITORY/nasa/NASA_STANDARDS.md
STANDARDS_REPOSITORY/apex/STANDARDS_PRIORITY_INDEX.md
STANDARDS_REPOSITORY/templates/PROMPT_TEMPLATE.md
STANDARDS_REPOSITORY/README.md
STANDARDS_PRIORITY_INDEX.md
NASA/NASA_STANDARDS_PRIORITY_INDEX.md
other_rules.md
STANDARDS_REPOSITORY/apex/STANDARDS.md

# Current Time
4/6/2025, 11:17:28 PM (America/Chicago, UTC-5:00)

# Current Mode
ACT MODE
</environment_details>
