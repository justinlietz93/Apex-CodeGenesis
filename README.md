# Apex: CodeGenesis

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

Apex is an advanced autonomous coding agent designed to adapt to your exact needs, empowering your VS Code environment.

Apex leverages sophisticated reasoning techniques like recursive chain-of-thought and a council-of-critics self-critique mechanism. It offers various autonomy modes, persistent memory across sessions with biologically inspired Neuro-Cognitive Agentic (Neuroca) architecture, and dynamic persona switching. With a wide library of sophisticated tools enabling file creation/editing, project exploration, browser interaction, advanced mathematics, access to the latest documentation, and terminal command execution (with your approval), it assists with complex software development tasks. It can also utilize the Model Context Protocol (MCP) to dynamically extend its capabilities, although you likely won't need it thanks to Apex's expansive capabilities. This extension provides a human-in-the-loop GUI for safety and control over agent actions. However, you can let Apex go totally autonomous and the agent will run tests, fix bugs, plan deeply with its dynamic persona switching, hierarchical reasoning, Neuroca, and council of critics mental framework.

1.  Enter your task, optionally adding images for UI generation or bug fixing.
2.  Apex analyzes your project structure, source code, and relevant files to gain context.
3.  It can then:
    *   Create and edit files, monitoring and fixing linter/compiler errors proactively.
    *   Execute terminal commands, observing output to react to build or runtime issues.
    *   Interact with web applications via a headless browser for testing and debugging.
4.  Upon completion, Apex presents the results, often with a command to view or run the outcome.

> [!TIP]
> Use `CMD/CTRL + Shift + P` and search for "Apex: Open In New Tab" to open the agent in an editor tab for a side-by-side view of its work.

---

### Use any API and Model

Apex supports API providers like OpenRouter, Anthropic, OpenAI, Google Gemini, AWS Bedrock, Azure, and GCP Vertex. You can also configure any OpenAI compatible API, or use a local model through LM Studio/Ollama. If you're using OpenRouter, the extension fetches their latest model list, allowing you to use the newest models as soon as they're available.

Apex has been thoughtfully crafted to support the best of any model, focusing on the strengths of each provider and allowing them to have full utility of their own native tools and structured output when possible. Models without native tool calling are still fully supported thanks to the Apex universal agent system.

The extension also keeps track of total tokens and API usage cost for the entire task loop and individual requests, keeping you informed of spend every step of the way.

### Dynamic Persona Switching & Autonomy

Control how Apex operates:

-   **`apex.agent.dynamicPersonaMode`**:
    -   `off`: No dynamic persona is used. Relies solely on static custom instructions.
    -   `initial` (Default): Selects the most appropriate persona based on the initial task prompt and uses it for the entire task duration.
    -   `threshold`: Selects an initial persona and periodically re-evaluates the conversation context. If the context suggests a different persona is more suitable (based on a similarity threshold), Apex will switch personas mid-task.
-   **`apex.agent.dynamicPersonaThreshold`** (Optional, used with `threshold` mode): A number between 0 and 1 (default 0.7) representing the similarity score required to trigger a persona switch. Higher values mean the suggested persona must be a very strong match to the current context. *(Note: Similarity scoring is planned for future implementation)*.
-   **`apex.agent.dynamicPersonaCheckFrequency`** (Optional, used with `threshold` mode): A number (default 5) indicating how many agent turns should pass before checking if a persona switch is needed.
-   **`apex.agent.autonomyMode`**: Choose between `turnBased` (user confirms each step), `stepLimited` (runs N steps autonomously), or `full` (runs until completion or error).

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
