# Apex Software Compliance Standards Guide

**Version:** 1.5
**Date:** 2025-04-06

## 1. Introduction

This document defines the mandatory compliance standards for all software development projects undertaken or analyzed by the Apex Software Synthesis Engine (SE-Apex). Adherence to these standards ensures the development of robust, secure, maintainable, and high-quality software systems. Each standard includes a unique Rule #, a mnemonic Code, the Standard itself, its Rationale, typical Verification methods, and source references where applicable. Concepts inspired by NASA standards ([PoT], [SA], [FI]) are integrated for enhanced rigor.

**Source Key:**
*   [PoT]: Power of Ten Rules (Holzmann)
*   [SA]: NASA-STD-8739.8B (Software Assurance & Safety)
*   [FI]: NASA-STD-8739.9 (Formal Inspections)

## 2. Core Principles

*   **Rigor & Discipline:** Adherence to defined processes, standards, and requirements.
*   **Safety & Reliability:** Prioritize hazard prevention, fault tolerance, and dependable operation.
*   **Correctness:** Software must demonstrably meet all explicit and inferred functional requirements.
*   **Security:** Protect data confidentiality, integrity, and availability.
*   **Maintainability:** Ensure software is understandable, modifiable, and testable.
*   **Verifiability:** Compliance must be objectively verifiable via analysis, testing, inspection, and review.
*   **Simplicity & Clarity:** Favor simple constructs; ensure code/docs are understandable.
*   **Proactive Defect Removal:** Emphasize early defect detection via analysis and inspection.
*   **Traceability:** Maintain clear links between requirements, design, code, tests, and hazards.
*   **Risk Management:** Proactively identify, analyze, and mitigate risks.
*   **Process Improvement:** Collect data and analyze processes to enable continuous improvement.

## 3. Project Planning & Process Management (PLAN)

*   **Rule #:** 1
*   **Code:** `PLAN-CHK`
*   **Standard:** All projects MUST commence with a comprehensive, hierarchical Master Plan Checklist (`PROMPT_TEMPLATE.md` format: Phase->Task->Step, with `- [ ]` items) before development. Plan must cover the full lifecycle. Execution MUST follow the plan sequentially, marking items complete (`- [x]`) only after verification.
*   **Rationale:** Ensures clear scope, requirements, steps; provides verifiable roadmap; reduces ambiguity and risk.
*   **Verification:** Review of Master Plan Checklist pre-development; ongoing checks of plan state vs. progress.

*   **Rule #:** 2
*   **Code:** `PLAN-LIFE-CYCLE` [SA: 3.1.3]
*   **Standard:** Software plans MUST cover the entire software life-cycle (concept, requirements, design, implementation, test, deployment, operations, maintenance, retirement).
*   **Rationale:** Ensures all lifecycle phases are considered and managed.
*   **Verification:** Review of project plans for lifecycle coverage.

*   **Rule #:** 3
*   **Code:** `PLAN-TRACK-EXEC` [SA: 3.1.4]
*   **Standard:** Track actual results and performance against plans. Manage corrective actions and changes to commitments to closure.
*   **Rationale:** Provides visibility; ensures deviations are managed.
*   **Verification:** Review of tracking data, corrective action logs, change records.

*   **Rule #:** 4
*   **Code:** `PLAN-RISK-MGMT` [SA: 5.2.1, 3.11.3]
*   **Standard:** Identify, record, analyze, plan mitigation for, track, control, and communicate all software risks (including safety, security) throughout the lifecycle.
*   **Rationale:** Proactive management of potential issues impacting success, safety, or security.
*   **Verification:** Review of risk management plan/register; process audits.

*   **Rule #:** 5
*   **Code:** `PLAN-PROC-MATURITY` [SA: 3.9.3]
*   **Standard:** For high-criticality software, acquire, develop, and maintain software from organizations demonstrating appropriate process maturity (e.g., CMMI-DEV Level 2 or 3).
*   **Rationale:** Increases confidence in the provider's ability to deliver quality software through established processes.
*   **Verification:** Confirmation of provider's process maturity rating/assessment.

*   **Rule #:** 6
*   **Code:** `PLAN-PROMPT-SIZE`
*   **Standard:** Individual prompt files containing execution plans (Master Plan Checklists) SHALL NOT exceed 250 lines (excluding introductory sections, comments, and closing matter). Prompts exceeding this limit MUST be broken down into smaller, logically linked files (e.g., a main prompt linking to phase-specific prompts).
*   **Rationale:** Improves prompt readability, maintainability, and reduces cognitive load for both human review and agent processing. Facilitates focused execution and management of large plans.
*   **Verification:** Automated or manual line count check of prompt files. Review of linked prompt structure if breakdown occurs.

## 4. Requirements Engineering (REQ)

*   **Rule #:** 7
*   **Code:** `REQ-DEFINE-VVT` [SA: 4.1.2, 4.1.3, FI: 7.4.1]
*   **Standard:** Establish, capture, record, approve, and maintain software requirements derived from system requirements, safety/reliability analyses, and hardware specifications. Requirements MUST be correct, consistent, complete, accurate, readable, traceable, and testable.
*   **Rationale:** Forms the basis for design, implementation, verification; ensures the right system is built correctly.
*   **Verification:** Requirements inspections/reviews; traceability analysis; validation against user needs.

*   **Rule #:** 8
*   **Code:** `REQ-SAFETY-CRITICAL` [SA: 4.1.4, 3.7.1, FI: 7.4.1]
*   **Standard:** Include software-related safety constraints, controls, mitigations, and assumptions in requirements. Identify safety-critical requirements explicitly, traceable to hazard analysis.
*   **Rationale:** Ensures safety considerations are formally captured, analyzed, implemented, and verified.
*   **Verification:** Review of requirements against hazard analyses; traceability analysis; safety reviews.

*   **Rule #:** 9
*   **Code:** `REQ-TRACE-BIDIR` [SA: 3.12.1]
*   **Standard:** Perform, record, and maintain bi-directional traceability between requirements and higher-level sources, design, code, tests, hazards, and non-conformances, appropriate to the software criticality.
*   **Rationale:** Ensures all requirements are implemented/tested, and code/tests map back to requirements/hazards. Facilitates impact analysis.
*   **Verification:** Traceability matrix review; automated traceability tools.

## 5. Design & Architecture (DES)

*   **Rule #:** 10
*   **Code:** `DES-ARCH-DEFINE` [SA: 4.2.3, FI: 7.5.1]
*   **Standard:** Transform requirements into a recorded software architecture describing structure, qualities (safety, security, reliability), interfaces, and components. Ensure architecture meets critical needs.
*   **Rationale:** Provides high-level blueprint; guides detailed design; ensures key qualities addressed structurally.
*   **Verification:** Architecture reviews; analysis against requirements and quality attributes.

*   **Rule #:** 11
*   **Code:** `DES-DETAIL-IMPL` [SA: 4.3.2, FI: 7.6.1]
*   **Standard:** Develop, record, and maintain a detailed software design based on architecture, describing lower-level units sufficiently for coding/testing. Ensure design implements requirements (incl. safety controls) without unintended behaviors/complexity.
*   **Rationale:** Provides specific implementation plan; ensures correct translation of requirements.
*   **Verification:** Detailed design inspections/reviews; traceability to architecture/requirements.

*   **Rule #:** 12
*   **Code:** `DES-MODULARITY`
*   **Standard:** Design MUST emphasize modularity, separation of concerns, high cohesion, and low coupling.
*   **Rationale:** Fundamental principle for maintainable, testable, reusable software.
*   **Verification:** Design reviews, architectural analysis, dependency analysis tools.

## 6. Control Flow (CTL)

*   **Rule #:** 13
*   **Code:** `CTL-SIMPLE` [PoT Rule 1]
*   **Standard:** Restrict code to simple control flow constructs (no goto, setjmp/longjmp, recursion unless justified).
*   **Rationale:** Enhances verifiability, clarity, analyzability. Guarantees acyclic call graph.
*   **Verification:** Static analysis, code review.

*   **Rule #:** 14
*   **Code:** `CTL-BOUNDLOOP` [PoT Rule 2]
*   **Standard:** All loops must have statically verifiable fixed upper bounds or be provably non-terminating. Use runtime checks for variable-bound loops.
*   **Rationale:** Prevents runaway code, ensures termination.
*   **Verification:** Static analysis, code review for runtime checks.

## 7. Memory Management (MEM)

*   **Rule #:** 15
*   **Code:** `MEM-STATIC` [PoT Rule 3]
*   **Standard:** Prohibit dynamic memory allocation after initialization in critical systems. Manage carefully otherwise.
*   **Rationale:** Avoids allocator unpredictability and common memory errors. Enables static memory bounding.
*   **Verification:** Static analysis, memory analysis tools, code review.

## 8. Code Quality & Structure (QUAL)

*   **Rule #:** 16
*   **Code:** `QUAL-SIZE` [PoT Rule 4]
*   **Standard:** Individual functional code files SHALL NOT exceed 500 LLOC (excluding comments, etc.). Refactor larger files. *Recommendation:* Stricter limit (~60 lines) for safety-critical functions.
*   **Rationale:** Enhances readability, comprehension, testability. Limits complexity. Promotes modularity.
*   **Verification:** Automated line counting, code review.

*   **Rule #:** 17
*   **Code:** `QUAL-FMT`
*   **Standard:** Code formatting MUST be consistent, adhering to a predefined standard enforced by automated tools integrated into the workflow.
*   **Rationale:** Improves readability, reduces cognitive load, facilitates collaboration.
*   **Verification:** Automated formatter checks, CI enforcement.

*   **Rule #:** 18
*   **Code:** `QUAL-NAME`
*   **Standard:** Identifiers MUST use clear, descriptive, consistent naming conventions. Avoid ambiguity and excessive abbreviation.
*   **Rationale:** Enhances readability and understandability. Reduces errors.
*   **Verification:** Code review, linters.

*   **Rule #:** 19
*   **Code:** `QUAL-DRY`
*   **Standard:** Minimize code duplication (DRY). Encapsulate reusable logic.
*   **Rationale:** Improves maintainability, reduces errors, decreases codebase size.
*   **Verification:** Code review, duplication detection tools.

## 9. Preprocessor & Metaprogramming (PRE)

*   **Rule #:** 20
*   **Code:** `PRE-LIMIT` [PoT Rule 8]
*   **Standard:** Limit use of preprocessors/complex metaprogramming. For C/C++, restrict to includes and simple, side-effect-free macros. Avoid token pasting, varargs, recursion. Minimize conditional compilation.
*   **Rationale:** Avoids obfuscation, aids analysis, reduces testing complexity.
*   **Verification:** Static analysis, code review for justification.

## 10. Pointer Usage (PTR)

*   **Rule #:** 21
*   **Code:** `PTR-LIMIT` [PoT Rule 9]
*   **Standard:** Restrict pointer use. Allow no more than one level of dereferencing (e.g., in C/C++). Do not hide dereferences in macros/typedefs. Prohibit function pointers unless strongly justified and analyzed for impact on verification.
*   **Rationale:** Reduces pointer errors, simplifies data flow analysis. Function pointers hinder static analysis.
*   **Verification:** Static analysis, code review.

## 11. Data Handling & Robustness (DATA)

*   **Rule #:** 22
*   **Code:** `DATA-SCOPE-MIN` [PoT Rule 6]
*   **Standard:** Declare data objects at the smallest possible scope. Prohibit global variables unless justified and access-controlled.
*   **Rationale:** Supports data hiding, limits corruption potential, simplifies diagnosis.
*   **Verification:** Static analysis, code review.

*   **Rule #:** 23
*   **Code:** `DATA-CHECKALL` [PoT Rule 7]
*   **Standard:** Validate parameters/inputs at function boundaries. Check return values/status of non-trivial functions unless explicitly justified. Propagate/handle errors appropriately.
*   **Rationale:** Prevents errors from invalid inputs or ignored failures. Ensures robust error propagation.
*   **Verification:** Static analysis, code review.

*   **Rule #:** 24
*   **Code:** `DATA-ASSERT` [PoT Rule 5]
*   **Standard:** Use assertions liberally (target density >= 2/function for critical code) to check anomalous conditions/invariants. Assertions MUST be side-effect free. Failures MUST trigger recovery/safe-state. Prohibit trivial assertions.
*   **Rationale:** Increases defect detection, supports defensive coding, verifies assumptions.
*   **Verification:** Static analysis (density, trivial checks), code review (placement, meaningfulness, side-effects, recovery).

## 12. Configuration Management (CONF)

*   **Rule #:** 25
*   **Code:** `CONF-HARD`
*   **Standard:** Hardcoding of configuration values (endpoints, paths, ports, flags, thresholds, credentials, configurable UI elements) is STRICTLY PROHIBITED.
*   **Rationale:** Hardcoding hinders deployment, maintenance, adaptation; risks exposing sensitive data.
*   **Verification:** Code review, static analysis search for literals.

*   **Rule #:** 26
*   **Code:** `CONF-EXT`
*   **Standard:** Externalize all configuration values to a central source (files, env vars, service). Source defaults externally or separate them clearly from runtime logic.
*   **Rationale:** Enables easy modification without code changes; facilitates deployment.
*   **Verification:** Code review, analysis of configuration loading mechanisms.

## 13. Security (SEC)

*   **Rule #:** 27
*   **Code:** `SEC-KEY-STORAGE` [SA: Rule 8]
*   **Standard:** Sensitive data (keys, passwords, tokens, certs) MUST NEVER be stored in source code, version control, or plain text config. Use secure storage (keychain, encrypted store). Encryption keys MUST NOT be hardcoded.
*   **Rationale:** Prevents critical credential exposure.
*   **Verification:** Code review, SAST, config review, secure storage verification.

*   **Rule #:** 28
*   **Code:** `SEC-SANDBOX-EXEC` [SA: Rule 9]
*   **Standard:** Execute untrusted code (e.g., plugins) in a secure sandbox restricting resource access based on a permission model.
*   **Rationale:** Prevents compromise by third-party code.
*   **Verification:** Code review of sandbox implementation, security testing with malicious plugins.

*   **Rule #:** 29
*   **Code:** `SEC-INPUT-VAL` [SA: Rule 10]
*   **Standard:** Validate, sanitize, and properly encode/escape ALL external inputs before use, especially in security-sensitive contexts.
*   **Rationale:** Prevents injection attacks, path traversal, etc.
*   **Verification:** Code review, SAST, DAST, penetration testing.

*   **Rule #:** 30
*   **Code:** `SEC-DEPS-MGMT` [SA: Rule 11]
*   **Standard:** Actively manage external dependencies: use fixed versions, scan regularly for vulnerabilities, update promptly.
*   **Rationale:** Protects against inherited vulnerabilities.
*   **Verification:** Dependency scan reports, manifest review.

*   **Rule #:** 31
*   **Code:** `SEC-LEAST-PRIV` [SA: Rule 12]
*   **Standard:** Adhere to the principle of least privilege. Follow secure coding practices specific to the language/framework.
*   **Rationale:** Minimizes impact of potential breaches.
*   **Verification:** Code review, architectural review, security testing.

## 14. Testing & Verification (TEST)

*   **Rule #:** 32
*   **Code:** `TEST-PLAN-PROC` [SA: 4.5.2, FI: 7.8.1, 7.9.1]
*   **Standard:** Establish and maintain test plan(s), procedure(s), cases/scripts, and report(s) covering requirements verification (incl. safety-critical, off-nominal) with objective acceptance criteria.
*   **Rationale:** Ensures systematic, documented, objective testing.
*   **Verification:** Review/inspection of test artifacts; traceability.

*   **Rule #:** 33
*   **Code:** `TEST-REQ-COVERAGE` [SA: 4.5.3, 4.5.5]
*   **Standard:** Test software against ALL requirements. Evaluate and record results.
*   **Rationale:** Verifies implemented software meets specifications.
*   **Verification:** Test results, requirements traceability matrix, result evaluation records.

*   **Rule #:** 34
*   **Code:** `TEST-SAFETY-CRITICAL` [SA: 4.5.12, 3.7.4]
*   **Standard:** Verify through test (incl. independent testing) all requirements traceable to hazards, causes, or mitigations.
*   **Rationale:** Ensures safety controls function correctly.
*   **Verification:** Test results, review of safety-critical/off-nominal tests, traceability to hazard analysis.

*   **Rule #:** 35
*   **Code:** `TEST-CODE-COVERAGE` [SA: 4.5.9, 4.5.10, 3.7.4]
*   **Standard:** Track and report code coverage from tests. Achieve minimum threshold (e.g., >=90%). For safety-critical code, 100% MC/DC coverage is required (justify deviations).
*   **Rationale:** Measures test execution extent. MC/DC provides high assurance for critical code.
*   **Verification:** Coverage reports, analysis of uncovered code, review of justifications.

*   **Rule #:** 36
*   **Code:** `TEST-REGRESSION` [SA: 4.5.11]
*   **Standard:** Plan and conduct regression testing after changes to ensure no new defects or security vulnerabilities were introduced.
*   **Rationale:** Prevents unintended consequences of modifications.
*   **Verification:** Review of regression test plan and results.

*   **Rule #:** 37
*   **Code:** `TEST-CM-REPEAT` [SA: 4.5.4, 4.4.6]
*   **Standard:** Place items under Configuration Management before testing. Maintain test artifacts for repeatability.
*   **Rationale:** Ensures tests are run on known versions and are repeatable.
*   **Verification:** CM records, audit of test environment/artifacts.

*   **Rule #:** 38
*   **Code:** `TEST-DATA-EXTERNAL` [SA: 4.5.13]
*   **Standard:** Develop and execute acceptance tests for loaded/uplinked data, rules, or code affecting behavior, especially for safety-critical operations.
*   **Rationale:** Verifies integrity/correctness of external configurations/commands.
*   **Verification:** Review/execution of acceptance tests for external data/code.

## 15. Software Assurance & Inspection (SA)

*   **Rule #:** 39
*   **Code:** `SA-FORMAL-INSPECT` [FI: 4.1, 4.2, 5.2, 6.2, 6.3, 8.1]
*   **Standard:** Perform formal inspections or rigorous peer reviews on critical software products (requirements, plans, design, code, tests) following a defined process (roles, stages, criteria, data collection).
*   **Rationale:** Effective early defect detection/removal; improves quality; reduces cost; fosters understanding.
*   **Verification:** Inspection records, defect logs, process audits, data review.

*   **Rule #:** 40
*   **Code:** `SA-STATIC-ANALYSIS` [PoT Rule 10, SA: 4.4.4]
*   **Standard:** Utilize static analysis tools daily/continuously (max warnings/pedantic settings) checking defects, security, coverage, complexity, standards. Address ALL warnings (rewrite code, don't suppress without justification).
*   **Rationale:** Automated early detection of wide range of issues. Enforces quality/clarity.
*   **Verification:** Static analysis reports, CI logs, code review of warning handling.

*   **Rule #:** 41
*   **Code:** `SA-OTS-EVAL` [SA: 3.1.14, 5.5.3, 4.5.14]
*   **Standard:** Evaluate OTS/reused components rigorously: verify requirements met, address licensing/support, V&V to same level as custom code, assess security risks, track vendor defects.
*   **Rationale:** Manages risks of using pre-existing components.
*   **Verification:** Selection rationale, V&V results, licenses, vendor defect tracking, security reports.

*   **Rule #:** 42
*   **Code:** `SA-DEFECT-MGMT` [SA: 5.5.1, 5.5.2, 5.5.4]
*   **Standard:** Track all non-conformances/defects with defined severity levels. Perform root cause analysis for high-severity defects; implement process improvements.
*   **Rationale:** Systematic defect management; feedback for process improvement.
*   **Verification:** Defect tracking system, RCA reports, process improvement documentation.

## 16. Safety-Critical Software Specifics (SCS) [SA: 3.7.3]

*   **Rule #:** 43
*   **Code:** `SCS-INIT` [SA: 3.7.3.a]
*   **Standard:** MUST initialize to a known safe state on first start and all restarts.
*   **Rationale:** Prevents hazardous states from improper initialization.
*   **Verification:** Design/code review, startup/restart testing.

*   **Rule #:** 44
*   **Code:** `SCS-TRANSITION` [SA: 3.7.3.b]
*   **Standard:** MUST safely transition between all predefined known states.
*   **Rationale:** Ensures predictable, safe behavior during mode changes.
*   **Verification:** Design review (state machines), code inspection, transition testing.

*   **Rule #:** 45
*   **Code:** `SCS-TERMINATE` [SA: 3.7.3.c]
*   **Standard:** Termination of safety-critical functions MUST result in a known safe state.
*   **Rationale:** Prevents hazardous conditions on function termination.
*   **Verification:** Design/code review, termination scenario testing.

*   **Rule #:** 46
*   **Code:** `SCS-OVERRIDE` [SA: 3.7.3.d]
*   **Standard:** Operator overrides of safety-critical functions MUST require at least two independent operator actions.
*   **Rationale:** Prevents inadvertent hazardous actions from single operator error.
*   **Verification:** Requirements/design review, override procedure testing.

*   **Rule #:** 47
*   **Code:** `SCS-CMD-SEQ` [SA: 3.7.3.e]
*   **Standard:** MUST reject commands received out of sequence if execution can cause a hazard.
*   **Rationale:** Protects against hazards from incorrect operational sequencing.
*   **Verification:** Design/code review, out-of-sequence command testing.

*   **Rule #:** 48
*   **Code:** `SCS-MEM-MOD` [SA: 3.7.3.f]
*   **Standard:** MUST detect inadvertent memory modification and recover to a known safe state.
*   **Rationale:** Protects against critical data/code corruption.
*   **Verification:** Design/code review, fault injection testing.

*   **Rule #:** 49
*   **Code:** `SCS-IO-INTEGRITY` [SA: 3.7.3.g]
*   **Standard:** MUST perform integrity checks on inputs and outputs.
*   **Rationale:** Detects corrupted data that could lead to hazardous behavior.
*   **Verification:** Design/code review, testing with corrupted data.

*   **Rule #:** 50
*   **Code:** `SCS-PRECHECK` [SA: 3.7.3.h]
*   **Standard:** MUST perform prerequisite checks before executing safety-critical commands.
*   **Rationale:** Ensures system conditions are safe for command execution.
*   **Verification:** Design/code review, testing under various prerequisite states.

*   **Rule #:** 51
*   **Code:** `SCS-NO-SINGLE-EVENT` [SA: 3.7.3.i]
*   **Standard:** No single software event/action allowed to initiate an identified hazard.
*   **Rationale:** Implements fault tolerance for software-triggered hazards.
*   **Verification:** Hazard analysis, design review, FMEA/FTA.

*   **Rule #:** 52
*   **Code:** `SCS-TIMELY-RESPONSE` [SA: 3.7.3.j]
*   **Standard:** MUST respond to off-nominal conditions within the time needed to prevent a hazard.
*   **Rationale:** Ensures safety-related real-time constraints are met.
*   **Verification:** Timing analysis, design review, worst-case load testing.

*   **Rule #:** 53
*   **Code:** `SCS-ERROR-HDL-SAFE-STATE` [SA: 3.7.3.k, 3.7.3.l]
*   **Standard:** MUST provide error handling and be able to place the system into a defined safe state.
*   **Rationale:** Ensures predictable behavior and recovery for faults.
*   **Verification:** Code review, fault injection testing, safe mode entry testing.

*   **Rule #:** 54
*   **Code:** `SCS-COMPLEXITY` [SA: 3.7.5]
*   **Standard:** Cyclomatic complexity MUST be <= 15 for safety-critical components. Justify exceedances.
*   **Rationale:** Limits complexity in critical code, improving testability/understandability.
*   **Verification:** Static analysis complexity tools, code review for justifications.

## 17. Build & Static Analysis Tools (TOOL)

*   **Rule #:** 55
*   **Code:** `TOOL-ZERO-WARN` [PoT Rule 10]
*   **Standard:** Compile and analyze code from day one with all warnings enabled (most pedantic/strict). Build/analysis MUST pass with zero warnings. Rewrite code causing spurious warnings.
*   **Rationale:** Leverages tools for early error detection. Enforces quality/clarity. Avoids overlooking valid warnings.
*   **Verification:** CI logs showing flags/warnings. Static analyzer reports.

## 18. Documentation (DOC)

*   **Rule #:** 56
*   **Code:** `DOC-API`
*   **Standard:** Document all public APIs, classes, methods, complex functions using standard formats (JSDoc, TSDoc, etc.), accurately describing purpose, params, returns, exceptions.
*   **Rationale:** Facilitates understanding and usage.
*   **Verification:** Code review, documentation tool output.

*   **Rule #:** 57
*   **Code:** `DOC-INT`
*   **Standard:** Include explanatory comments for non-trivial internal logic, algorithms, workarounds.
*   **Rationale:** Improves maintainability by explaining the 'why'.
*   **Verification:** Code review.

*   **Rule #:** 58
*   **Code:** `DOC-EXT`
*   **Standard:** Keep external documentation (README, Guides, etc.) accurate, complete, and up-to-date. Claims MUST be verifiable.
*   **Rationale:** Ensures correct information for users/developers.
*   **Verification:** Review docs against implemented features/analysis findings.

## 19. Implementation Correctness (IMPL)

*   **Rule #:** 59
*   **Code:** `IMPL-PLACE`
*   **Standard:** Production code MUST NOT contain placeholders (TODO, FIXME), commented-out code, or incomplete/mocked implementations.
*   **Rationale:** Ensures delivered software is complete and functional.
*   **Verification:** Code review, static analysis search, functional testing.

*   **Rule #:** 60
*   **Code:** `IMPL-REQ`
*   **Standard:** All specified functional and non-functional requirements MUST be implemented correctly and verifiably.
*   **Rationale:** Ensures software meets its intended purpose.
*   **Verification:** Functional testing, requirements traceability review, code review.

## 20. Error Handling (ERR)

*   **Rule #:** 61
*   **Code:** `ERR-HDL`
*   **Standard:** Handle errors and exceptions gracefully. Avoid crashes. Use appropriate mechanisms (try/catch, error codes). Log errors appropriately.
*   **Rationale:** Improves robustness and diagnostics.
*   **Verification:** Code review, fault injection testing, log analysis.

## 21. Final Validation (FINAL)

*   **Rule #:** 62
*   **Code:** `FINAL-SWEEP`
*   **Standard:** Before final delivery, execute mandatory Final Sweep protocol: verify absence of hardcoded values (esp. secrets), placeholders/TODOs; ensure consistent formatting; check for security remnants; validate documentation accuracy. Rectify all issues found.
*   **Rationale:** Final quality gate.
*   **Verification:** Execution of Final Sweep checklist.

*   **Rule #:** 63
*   **Code:** `FINAL-DELIV`
*   **Standard:** Final deliverable package MUST be complete (source, builds, config, docs, verification results) per requirements.
*   **Rationale:** Ensures recipient has everything needed.
*   **Verification:** Review deliverable contents against requirements.

---
*(Apex Standards Guide V1.5 established 2025-04-06)*
