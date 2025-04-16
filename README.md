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
> **Status:** First release is ~97% ready to launch! Actively seeking feedback and testers.

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

Apex is an advanced **autonomous software engineering agent** designed to adapt to your exact needs, empowering your VS Code environment. It integrates powerful AI reasoning with practical development tools to assist with complex coding tasks, aiming for **high reliability**, **resilience**, and adherence to **rigorous software engineering standards**. This project builds upon the foundation of the [Cline agent](https://github.com/cline/cline), integrating several sophisticated experimental AI systems developed by the author (including those linked in the Key Features section) focused on robust agentic workflows and high-quality, verifiable outputs according to the defined [Apex Software Compliance Standards](./workbench/STANDARDS_REPOSITORY/apex/STANDARDS.md).

## Installation

*(Coming Soon to Marketplaces!)*

Currently, installation requires building from source (see [Local Development Instructions](#local-development-instructions)). Marketplace availability is planned for the first official release.

## Key Features

Apex offers a powerful combination of advanced AI techniques and practical development tools:

(a few may not be implemented yet, but the modules and components themselves are fully completed and awaiting implementation)

*   **Sophisticated Reasoning:**
    *   Integrates **[hierarchical objective reasoning](https://github.com/justinlietz93/hierarchical_reasoning_generator)**, combining **[recursive chain-of-thought](https://github.com/justinlietz93/RCoT)**, detailed **hierarchical planning**, and a **[council-of-critics](https://github.com/justinlietz93/critique_council)** self-critique mechanism. This structured approach enables robust decomposition and execution of complex tasks, enhancing resilience against errors and loops.
*   **True Autonomy & Resilience:**
    *   Offers **`turnBased`**, **`stepLimited`**, and **`full`** autonomy modes.
    *   The **`full`** autonomy mode provides true end-to-end task completion capability, leveraging the reasoning framework for **automated failure recovery**.
    *   Can **autonomously browse the web** and **look up documentation** to overcome obstacles.
*   **Persistent Memory ([Neuroca](https://github.com/Modern-Prometheus-AI/Neuroca)):**
    *   Utilizes a biologically inspired **Neuro-Cognitive Agentic** architecture to build deep contextual understanding.
    *   Retains information across interactions and sessions, simulating learning and informing the reasoning process for more effective, context-aware actions, especially crucial for long-running autonomous tasks.
*   **[Dynamic Personas](https://github.com/justinlietz93/hierarchical_reasoning_generator/tree/main/hierarchical_planner/persona_builder):**
    *   Synergizes with Neuroca's context and the reasoning framework by automatically selecting the best **expert persona** for the current task or sub-task.
    *   Can **dynamically switch personas** mid-task (configurable), ensuring the most relevant expertise guides the agent's sophisticated reasoning and actions.
*   **End-to-End Project Workflow:**
    *   Capable of managing **full software cycles**: planning, architecture, implementation, testing, debugging.
*   **Unparalleled Tooling & Computer Control:** Goes far beyond typical agent capabilities:
    *   **Full File System Access:** Create, read, edit, delete, and explore files/directories anywhere on the system (respecting permissions). Includes proactive lint/compile error fixing during edits.
    *   **Complete Terminal Control:** Execute arbitrary shell commands, monitor output streams (stdout/stderr), manage long-running processes, and react to results.
    *   **Autonomous Web Browsing & Interaction:** Navigate websites, fill forms, click buttons, scroll, analyze DOM content, and extract information for research, testing, or automation.
    *   **Advanced Mathematics & AI Research Tools:** Includes capabilities extending into complex domains like quantum mechanics, topological data analysis, and neuromorphic computing simulation.
    *   **Script Deployment:** Possesses a library of powerful scripts deployable as tool calls for complex, reusable operations.
    *   **Rich Context Gathering:** Fetch and process content from URLs (`@url`), incorporate workspace diagnostics (`@problems`), and directly include file (`@file`) or folder (`@folder`) contents.
*   **Extensibility ([MCP](https://github.com/modelcontextprotocol)):** Supports the Model Context Protocol for adding even more custom tools and capabilities via local servers.
*   **Safety & Control:** Provides a **human-in-the-loop GUI** for oversight, alongside full autonomous operation.
*   **Standards-Driven:** Operates according to the rigorous **[Apex Software Compliance Standards](./workbench/STANDARDS_REPOSITORY/apex/STANDARDS.md)**.
*   **Local-First Operation:** No mandatory online account or sign-up required to use core features with local models or self-hosted APIs.
*   **Profile Management:** Create and switch between local profiles to manage different configurations, API keys, and custom instructions for various projects or tasks.
*   **Custom Prompt Library:** Save, manage, and easily apply your own custom system prompts and instructions.

## What to Expect (User Interaction)

Interacting with Apex involves a dynamic workflow that adapts based on your chosen autonomy settings:

1.  **Task Initiation:** Provide Apex with a goal (text prompt, optionally with images) via the chat interface. Add context using **`@file`**, **`@folder`**, **`@url`**, **`@problems`**, or context menu actions ("Add to Apex", "Fix with Apex").
2.  **Agent Processing:** Apex analyzes the task and context, leveraging its reasoning (**[RCoT](https://github.com/justinlietz93/RCoT)**, **[council-of-critics](https://github.com/justinlietz93/critique_council)**, **[hierarchical planning](https://github.com/justinlietz93/hierarchical_reasoning_generator)**) and selected **[Dynamic Persona](https://github.com/justinlietz93/hierarchical_reasoning_generator/tree/main/hierarchical_planner/persona_builder)** to formulate a detailed, sequential plan adhering to internal standards.
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
    *   **[Neuroca](https://github.com/Modern-Prometheus-AI/Neuroca) Memory:** Throughout the process, the **Neuroca** architecture helps Apex maintain context, recalling previous steps and information to inform decisions and prevent repetitive errors.
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

Apex offers unparalleled flexibility, supporting a wide array of the latest AI models through numerous providers and local setups:

*   **Cloud Providers:** OpenRouter, Anthropic (Claude), OpenAI (GPT models, including latest releases), Google (Gemini models), AWS Bedrock, Azure OpenAI, GCP Vertex AI, Mistral AI, DeepSeek, Qwen (Alibaba). *(Provider list based on current dependencies/configuration options)*.
*   **Local Models:** Ollama, LM Studio.
*   **OpenAI-Compatible APIs:** Connect to any API endpoint adhering to the OpenAI standard (e.g., LiteLLM, custom endpoints).
*   **VS Code Language Model API:** Integrates with models provided directly by VS Code itself (e.g., Copilot).

Apex stays current: If you're using OpenRouter, the extension automatically fetches their dynamic model list, giving you immediate access to the newest models as they become available.

Apex has been thoughtfully crafted to bring out the best of each provider model, leveraging native features like **structured output** and **tool calling** when available. For models lacking native tool support, Apex provides a **high-quality universal tool system**, ensuring broad compatibility and powerful capabilities across all supported models.

The extension also keeps track of total tokens and API usage cost for the entire task loop and individual requests, keeping you informed of spend every step of the way.

### Dynamic Persona Switching & Autonomy

Leveraging its **[Neuroca](https://github.com/Modern-Prometheus-AI/Neuroca)** persistent memory to maintain task context, Apex offers fine-grained control over its operational style and autonomy level:

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

<iframe src="https://github.com/sponsors/justinlietz93/card" title="Sponsor justinlietz93" height="225" width="600" style="border: 0;"></iframe>

## License

[Apache 2.0 © 2025 Justin Lietz](./LICENSE)
