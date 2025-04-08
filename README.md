<div align="center">
  <img src="./assets/icons/icon-black.png" alt="Apex IDE Logo" width="250"/>
</div>

<div align="center">

# Apex: CodeGenesis

*Completely autonomous engineering agent with biologically inspired persistent memory*

</div>

<div align="center">
<table>
<tbody>
<td align="center">
<a href="https://github.com/justinlietz93/Apex-CodeGenesis" target="_blank"><strong>GitHub Repository</strong></a>
</td>
<td align="center">
<a href="https://github.com/justinlietz93/Apex-CodeGenesis/issues" target="_blank"><strong>Report Issue</strong></a>
</td>
<td align="center">
<a href="https://github.com/justinlietz93/Apex-CodeGenesis/discussions" target="_blank"><strong>Discussions</strong></a>
</td>
</tbody>
</table>
</div>

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
<!-- Add Build Status badge here once workflow is set up -->
<!-- Add Marketplace badges here once published -->

> [!NOTE]
> **Status:** First release is ~95% ready to launch! Actively seeking feedback and testers.

---

**Table of Contents**

- [Overview](#overview)
- [Installation](#installation)
- [Key Features](#key-features)
- [What to Expect (User Interaction)](#what-to-expect-user-interaction)
- [Workflow](#workflow)
- [Use any API and Model](#use-any-api-and-model)
- [Dynamic Persona Switching & Autonomy](#dynamic-persona-switching--autonomy)
- [Run Commands in Terminal](#run-commands-in-terminal)
- [Create and Edit Files](#create-and-edit-files)
- [Use the Browser](#use-the-browser)
- ["add a tool that..."](#add-a-tool-that)
- [Add Context](#add-context)
- [Checkpoints: Compare and Restore](#checkpoints-compare-and-restore)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Apex is an advanced **autonomous software engineering agent** designed to adapt to your exact needs, empowering your VS Code environment. It integrates powerful AI reasoning with practical development tools to assist with complex coding tasks, aiming for **high reliability**, **resilience**, and adherence to **rigorous software engineering standards**. This project originated as a fork of the [Cline agent](https://github.com/cline/cline) and incorporates concepts and tools from several other experimental AI projects focused on robust agentic workflows and high-quality, verifiable outputs according to the defined [Apex Software Compliance Standards](./workbench/STANDARDS_REPOSITORY/apex/STANDARDS.md).

## Installation

*(Coming Soon to Marketplaces!)*

Currently, installation requires building from source (see [Local Development Instructions](#local-development-instructions)). Marketplace availability is planned for the first official release.

## Key Features

Apex offers a powerful combination of advanced AI techniques and practical development tools:

*   **Sophisticated Reasoning:**
    *   Employs **[recursive chain-of-thought](https://github.com/justinlietz93/RCoT)** for complex problem-solving.
    *   Uses **[hierarchical planning](https://github.com/justinlietz93/hierarchical_reasoning_generator)** to break down large tasks into manageable steps.
    *   Integrates a **[council-of-critics](https://github.com/justinlietz93/critique_council)** mechanism for self-critique and plan refinement.
*   **True Autonomy & Resilience:**
    *   Offers **`turnBased`**, **`stepLimited`**, and **`full`** autonomy modes.
    *   The **`full`** autonomy mode provides true end-to-end task completion capability.
    *   Features **automated failure recovery** and **resilience against loops** (via hierarchical planning).
    *   Can **autonomously browse the web** and **look up documentation** to overcome obstacles.
*   **Persistent Memory ([Neuroca](https://github.com/Modern-Prometheus-AI/Neuroca)):**
    *   Utilizes a biologically inspired **Neuro-Cognitive Agentic** architecture.
    *   Builds context understanding, retains information across sessions, and simulates learning.
*   **[Dynamic Personas](https://github.com/justinlietz93/hierarchical_reasoning_generator/tree/main/hierarchical_planner/persona_builder):**
    *   Automatically selects the best **expert persona** (e.g., "Senior Dev", "UI/UX Expert") for the task.
    *   Can **dynamically switch personas** mid-task if needed (configurable).
*   **End-to-End Project Workflow:**
    *   Capable of managing **full software cycles**: planning, architecture, implementation, testing, debugging.
*   **Extensive Tool Suite:**
    *   **File System:** Create, read, edit, explore; proactive lint/compile error fixing.
    *   **Terminal:** Execute commands, monitor output, manage long-running processes.
    *   **Web Browser:** Navigate, interact (click, type, scroll), analyze content autonomously for research or testing.
    *   **Context:** Fetch URL content (`@url`), use workspace problems (`@problems`), include files (`@file`) / folders (`@folder`).
    *   **Math:** Perform advanced calculations.
*   **Extensibility ([MCP](https://github.com/modelcontextprotocol)):** Supports the Model Context Protocol for adding custom tools via local servers.
*   **Safety & Control:** Provides a **human-in-the-loop GUI** for oversight, alongside full autonomous operation.
*   **Standards-Driven:** Operates according to the rigorous **[Apex Software Compliance Standards](./workbench/STANDARDS_REPOSITORY/apex/STANDARDS.md)**.

## What to Expect (User Interaction)

Interacting with Apex involves a dynamic workflow that adapts based on your chosen autonomy settings:

1.  **Task Initiation:** Provide Apex with a goal (text prompt, optionally with images) via the chat interface. Add context using **`@file`**, **`@folder`**, **`@url`**, **`@problems`**, or context menu actions ("Add to Apex", "Fix with Apex").
2.  **Agent Processing:** Apex analyzes the task and context, leveraging its reasoning (**RCoT**, **council-of-critics**, **hierarchical planning**) and selected **Dynamic Persona** to formulate a detailed, sequential plan adhering to internal standards.
3.  **Execution Loop & Interaction:**
    *   **Transparency:** Apex streams its thoughts, step-by-step plans, and generated code/text directly to the chat interface.
    *   **Tool Use:** When Apex needs to interact with your system (e.g., edit files, run commands, use the browser), it requests permission via a **Tool Use** card.
        *   **Approval:** Based on your **Auto-Approval Settings**, you may be prompted to "Allow" or "Deny". Denying prompts Apex to reconsider. Auto-approved actions execute immediately.
        *   **File Edits:** Changes are presented in a **diff view** for review, editing, or acceptance.
        *   **Terminal Commands:** Commands run in the integrated terminal, with output streamed back to Apex. Long-running commands can proceed in the background.
    *   **Autonomy Modes & Pausing:**
        *   **`turnBased`:** Pauses after *every* significant step (LLM response or tool execution), presenting an **Ask prompt** requiring your input.
        *   **`stepLimited`:** Runs autonomously for N steps, then pauses with an **Ask prompt**.
        *   **`full`:** Runs continuously, attempting **automated error recovery**. Pauses only if recovery fails repeatedly or requires user clarification via an **Ask prompt**.
    *   **Neuroca Memory:** Throughout the process, the **Neuroca** architecture helps Apex maintain context, recalling previous steps and information to inform decisions and prevent repetitive errors.
4.  **Completion & Verification:** Once the task goal is achieved (often signaled by a completion tool), Apex presents the final result. Internally, it relies on verification steps tied to its plan execution.

This interactive model, combined with configurable autonomy and a focus on **resilient execution**, allows you to tailor Apex's operation from a closely supervised assistant to a highly **autonomous software engineering agent**.

## Workflow

1.  Enter your task, optionally adding images for UI generation or bug fixing.
2.  Apex analyzes your project structure, source code, and relevant files to gain context.
3.  It performs actions using its tools (file edits, commands, browser interaction).
4.  Upon completion, Apex presents the results, often with a command to view or run the outcome.

> [!TIP]
> Use `CMD/CTRL + Shift + P` and search for "Apex: Open In New Tab" to open the agent in an editor tab for a side-by-side view of its work.

---

### Use any API and Model

Apex supports API providers like OpenRouter, Anthropic, OpenAI, Google Gemini, AWS Bedrock, Azure, and GCP Vertex. You can also configure any OpenAI compatible API, or use a local model through LM Studio/Ollama. If you're using OpenRouter, the extension fetches their latest model list, allowing you to use the newest models as soon as they're available.

Apex has been thoughtfully crafted to support the best of any model, focusing on the strengths of each provider and allowing them to have full utility of their own native tools and structured output when possible. Models without native tool calling are still fully supported thanks to the Apex universal agent system.

The extension also keeps track of total tokens and API usage cost for the entire task loop and individual requests, keeping you informed of spend every step of the way.

### Dynamic Persona Switching & Autonomy

Leveraging its **Neuroca** persistent memory to maintain task context, Apex offers fine-grained control over its operational style and autonomy level:

-   **`apex.agent.dynamicPersonaMode`**:
    -   `off`: No dynamic persona is used. Relies solely on static custom instructions.
    -   `initial` (Default): Selects the most appropriate persona based on the initial task prompt and uses it for the entire task duration.
    -   `threshold`: Selects an initial persona and periodically re-evaluates the conversation context. If the context suggests a different persona is more suitable (based on a similarity threshold), Apex will switch personas mid-task.
-   **`apex.agent.dynamicPersonaThreshold`** (Optional, used with `threshold` mode): A number between 0 and 1 (default 0.7) representing the similarity score required to trigger a persona switch. Higher values mean the suggested persona must be a very strong match to the current context. *(Note: Similarity scoring is planned for future implementation)*.
-   **`apex.agent.dynamicPersonaCheckFrequency`** (Optional, used with `threshold` mode): A number (default 5) indicating how many agent turns should pass before checking if a persona switch is needed.
-   **`apex.agent.autonomyMode`**: Choose between `turnBased` (user confirms each step), `stepLimited` (runs N steps autonomously before pausing), or `full` (runs until completion or error, attempting self-recovery). These modes directly influence the interaction flow described in the ["What to Expect"](#what-to-expect-user-interaction) section.

### Run Commands in Terminal

Apex can execute commands directly in your terminal and receive the output. This allows it to perform a wide range of tasks, from installing packages and running build scripts to deploying applications, managing databases, and executing tests, all while adapting to your dev environment & toolchain.

For long running processes like dev servers, use the "Proceed While Running" button to let the agent continue the task while the command runs in the background. Apex will be notified of any new terminal output along the way, letting it react to issues like compile-time errors.

### Create and Edit Files

Apex can create and edit files directly in your editor, presenting you a diff view of the changes. You can edit or revert its changes directly in the diff view editor, or provide feedback in chat until you're satisfied. It also monitors linter/compiler errors (missing imports, syntax errors, etc.) to fix issues proactively.

All changes are recorded in your file's Timeline, providing an easy way to track and revert modifications.

### Use the Browser

Apex can launch a browser, click elements, type text, and scroll, capturing screenshots and console logs at each step. This allows for interactive debugging, end-to-end testing, and even general web use, enabling it to fix visual bugs and runtime issues autonomously.

Try asking Apex to "test the app", and watch as it runs commands like `npm run dev`, launches your locally running dev server in a browser, and performs tests.

### "add a tool that..."

Thanks to the [Model Context Protocol](https://github.com/modelcontextprotocol), Apex can extend its capabilities through custom tools. While you can use [community-made servers](https://github.com/modelcontextprotocol/servers), Apex can also create and install tools tailored to your specific workflow. Just ask it to "add a tool" and it will handle the process, making the new tool available for future tasks.

-   "add a tool that fetches Jira tickets"
-   "add a tool that manages AWS EC2 instances"
-   "add a tool that pulls the latest PagerDuty incidents"

### Add Context

**`@url`:** Paste in a URL for the extension to fetch and convert to markdown.
**`@problems`:** Add workspace errors and warnings ('Problems' panel) for the agent to fix.
**`@file`:** Adds a file's contents directly.
**`@folder`:** Adds files from a folder.

### Checkpoints: Compare and Restore

As Apex works, the extension takes snapshots of your workspace. Use 'Compare' to see diffs and 'Restore' to roll back. This allows safe exploration of different approaches without losing progress.

## Contributing

To contribute to this fork, please refer to the [GitHub repository](https://github.com/justinlietz93/Apex-CodeGenesis) and its contribution guidelines (if available).

<details>
<summary>Local Development Instructions</summary>

1. Clone the repository:
    ```bash
    git clone https://github.com/justinlietz93/Apex-CodeGenesis.git
    ```
2. Open the project in VSCode:
    ```bash
    code Apex-CodeGenesis
    ```
3. Install the necessary dependencies for the extension and webview UI:
    ```bash
    npm run install:all
    ```
4. Launch by pressing `F5` (or `Run`->`Start Debugging`) to open a new VSCode window with the extension loaded. (You may need to install the [esbuild problem matchers extension](https://marketplace.visualstudio.com/items?itemName=connor4312.esbuild-problem-matchers) if you run into issues building the project.)

</details>

<details>
<summary>Creating a Pull Request</summary>

1. Before creating a PR, generate a changeset entry:
    ```bash
    npm run changeset
    ```
   This will prompt you for:
   - Type of change (major, minor, patch)
     - `major` → breaking changes (1.0.0 → 2.0.0)
     - `minor` → new features (1.0.0 → 1.1.0)
     - `patch` → bug fixes (1.0.0 → 1.0.1)
   - Description of your changes

2. Commit your changes and the generated `.changeset` file

3. Push your branch and create a PR on GitHub. Our CI will:
   - Run tests and checks
   - Changesetbot will create a comment showing the version impact
   - When merged to main, changesetbot will create a Version Packages PR
   - When the Version Packages PR is merged, a new release will be published

</details>


## License

[Apache 2.0 © 2025 Justin Lietz](./LICENSE)
