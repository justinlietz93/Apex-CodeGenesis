import { McpHub } from "../../../services/mcp/McpHub";
import { BrowserSettings } from "../../../shared/BrowserSettings";

// Note: We need to pass cwd, supportsComputerUse, mcpHub, browserSettings, and needsXmlToolInstructions
// down to this function from the main SYSTEM_PROMPT assembler.
export const getToolsPrompt = (
    cwd: string,
    supportsComputerUse: boolean,
    mcpHub: McpHub,
    browserSettings: BrowserSettings,
    needsXmlToolInstructions: boolean // Controls standard XML vs native hint
): string => {

    // Note: No XML escaping needed here as we are generating the prompt string itself.
    // Escaping would be needed if embedding this *within* another XML structure.

    let baseToolsPrompt = `
# Tools

## execute_command
Description: Request to execute a CLI command on the system. Use this when you need to perform system operations or run specific commands to accomplish any step in the user's task. You must tailor your command to the user's system and provide a clear explanation of what the command does. For command chaining, use the appropriate chaining syntax for the user's shell. Prefer to execute complex CLI commands over creating executable scripts, as they are more flexible and easier to run. Commands will be executed in the current working directory: ${cwd}
Parameters:
- command: (required) The CLI command to execute. This should be valid for the current operating system. Ensure the command is properly formatted and does not contain any harmful instructions.
- requires_approval: (required) A boolean indicating whether this command requires explicit user approval before execution in case the user has auto-approve mode enabled. Set to 'true' for potentially impactful operations like installing/uninstalling packages, deleting/overwriting files, system configuration changes, network operations, or any commands that could have unintended side effects. Set to 'false' for safe operations like reading files/directories, running development servers, building projects, and other non-destructive operations.${needsXmlToolInstructions ? `
Usage (Use this exact XML structure):
<execute_command>
<command>Your command here</command>
<requires_approval>true or false</requires_approval>
</execute_command>` : ''}

## read_file
Description: Request to read the contents of a file at the specified path. Use this when you need to examine the contents of an existing file you do not know the contents of, for example to analyze code, review text files, or extract information from configuration files. Automatically extracts raw text from PDF and DOCX files. May not be suitable for other types of binary files, as it returns the raw content as a string.
Parameters:
- path: (required) The path of the file to read (relative to the current working directory ${cwd})${needsXmlToolInstructions ? `
Usage (Use this exact XML structure):
<read_file>
<path>File path here</path>
</read_file>` : ''}

## write_to_file
Description: Request to write content to a file at the specified path. If the file exists, it will be overwritten with the provided content. If the file doesn't exist, it will be created. This tool will automatically create any directories needed to write the file.
Parameters:
- path: (required) The path of the file to write to (relative to the current working directory ${cwd})
- content: (required) The content to write to the file. ALWAYS provide the COMPLETE intended content of the file, without any truncation or omissions. YOU MUST include ALL parts of the file, even if they haven't been modified.${needsXmlToolInstructions ? `
Usage (Use this exact XML structure):
<write_to_file>
<path>File path here</path>
<content>
Your file content here
</content>
</write_to_file>` : ''}

## replace_in_file
Description: Request to replace sections of content in an existing file using SEARCH/REPLACE blocks that define exact changes to specific parts of the file. This tool should be used when you need to make targeted changes to specific parts of a file.
Parameters:
- path: (required) The path of the file to modify (relative to the current working directory ${cwd})
- diff: (required) One or more SEARCH/REPLACE blocks following this exact format:
  \`\`\`
  <<<<<<< SEARCH
  [exact content to find]
  =======
  [new content to replace with]
  >>>>>>> REPLACE
  \`\`\`
  Critical rules:
  1. SEARCH content must match the associated file section to find EXACTLY:
     * Match character-for-character including whitespace, indentation, line endings
     * Include all comments, docstrings, etc.
  2. SEARCH/REPLACE blocks will ONLY replace the first match occurrence.
     * Including multiple unique SEARCH/REPLACE blocks if you need to make multiple changes.
     * Include *just* enough lines in each SEARCH section to uniquely match each set of lines that need to change.
     * When using multiple SEARCH/REPLACE blocks, list them in the order they appear in the file.
  3. Keep SEARCH/REPLACE blocks concise:
     * Break large SEARCH/REPLACE blocks into a series of smaller blocks that each change a small portion of the file.
     * Include just the changing lines, and a few surrounding lines if needed for uniqueness.
     * Do not include long runs of unchanging lines in SEARCH/REPLACE blocks.
     * Each line must be complete. Never truncate lines mid-way through as this can cause matching failures.
  4. Special operations:
     * To move code: Use two SEARCH/REPLACE blocks (one to delete from original + one to insert at new location)
     * To delete code: Use empty REPLACE section${needsXmlToolInstructions ? `
Usage (Use this exact XML structure):
<replace_in_file>
<path>File path here</path>
<diff>
<<<<<<< SEARCH
[exact content to find]
=======
[new content to replace with]
>>>>>>> REPLACE
</diff>
</replace_in_file>` : ''}

## search_files
Description: Request to perform a regex search across files in a specified directory, providing context-rich results. This tool searches for patterns or specific content across multiple files, displaying each match with encapsulating context.
Parameters:
- path: (required) The path of the directory to search in (relative to the current working directory ${cwd}). This directory will be recursively searched.
- regex: (required) The regular expression pattern to search for. Uses Rust regex syntax.
- file_pattern: (optional) Glob pattern to filter files (e.g., '*.ts' for TypeScript files). If not provided, it will search all files (*).${needsXmlToolInstructions ? `
Usage (Use this exact XML structure):
<search_files>
<path>Directory path here</path>
<regex>Your regex pattern here</regex>
<file_pattern>file pattern here (optional)</file_pattern>
</search_files>` : ''}

## list_files
Description: Request to list files and directories within the specified directory. If recursive is true, it will list all files and directories recursively. If recursive is false or not provided, it will only list the top-level contents. Do not use this tool to confirm the existence of files you may have created, as the user will let you know if the files were created successfully or not.
Parameters:
- path: (required) The path of the directory to list contents for (relative to the current working directory ${cwd})
- recursive: (optional) Whether to list files recursively. Use true for recursive listing, false or omit for top-level only.${needsXmlToolInstructions ? `
Usage (Use this exact XML structure):
<list_files>
<path>Directory path here</path>
<recursive>true or false (optional)</recursive>
</list_files>` : ''}

## list_code_definition_names
Description: Request to list definition names (classes, functions, methods, etc.) used in source code files at the top level of the specified directory. This tool provides insights into the codebase structure and important constructs, encapsulating high-level concepts and relationships that are crucial for understanding the overall architecture.
Parameters:
- path: (required) The path of the directory (relative to the current working directory ${cwd}) to list top level source code definitions for.${needsXmlToolInstructions ? `
Usage (Use this exact XML structure):
<list_code_definition_names>
<path>Directory path here</path>
</list_code_definition_names>` : ''}`; // End of baseToolsPrompt section

    let browserToolsPrompt = '';
    if (supportsComputerUse) {
        browserToolsPrompt = `

## browser_action
Description: Request to interact with a Puppeteer-controlled browser. Every action, except \`close\`, will be responded to with a screenshot of the browser's current state, along with any new console logs. You may only perform one browser action per message, and wait for the user's response including a screenshot and logs to determine the next action.
- The sequence of actions **must always start with** launching the browser at a URL, and **must always end with** closing the browser. If you need to visit a new URL that is not possible to navigate to from the current webpage, you must first close the browser, then launch again at the new URL.
- While the browser is active, only the \`browser_action\` tool can be used. No other tools should be called during this time. You may proceed to use other tools only after closing the browser. For example if you run into an error and need to fix a file, you must close the browser, then use other tools to make the necessary changes, then re-launch the browser to verify the result.
- The browser window has a resolution of **${browserSettings.viewport.width}x${browserSettings.viewport.height}** pixels. When performing any click actions, ensure the coordinates are within this resolution range.
- Before clicking on any elements such as icons, links, or buttons, you must consult the provided screenshot of the page to determine the coordinates of the element. The click should be targeted at the **center of the element**, not on its edges.
Parameters:
- action: (required) The action to perform. The available actions are:
    * launch: Launch a new Puppeteer-controlled browser instance at the specified URL. This **must always be the first action**.
        - Use with the \`url\` parameter to provide the URL.
        - Ensure the URL is valid and includes the appropriate protocol (e.g. http://localhost:3000/page, file:///path/to/file.html, etc.)
    * click: Click at a specific x,y coordinate.
        - Use with the \`coordinate\` parameter to specify the location.
        - Always click in the center of an element (icon, button, link, etc.) based on coordinates derived from a screenshot.
    * type: Type a string of text on the keyboard. You might use this after clicking on a text field to input text.
        - Use with the \`text\` parameter to provide the string to type.
    * scroll_down: Scroll down the page by one page height.
    * scroll_up: Scroll up the page by one page height.
    * close: Close the Puppeteer-controlled browser instance. This **must always be the final browser action**.
        - Example: \`action: close\`
- url: (optional) Use this for providing the URL for the \`launch\` action.
    * Example: url: https://example.com
- coordinate: (optional) The X and Y coordinates for the \`click\` action. Coordinates should be within the **${browserSettings.viewport.width}x${browserSettings.viewport.height}** resolution.
    * Example: coordinate: 450,300
- text: (optional) Use this for providing the text for the \`type\` action.
    * Example: text: Hello, world!${needsXmlToolInstructions ? `
Usage (Use this exact XML structure):
<browser_action>
<action>Action to perform (e.g., launch, click, type, scroll_down, scroll_up, close)</action>
<url>URL to launch the browser at (optional)</url>
<coordinate>x,y coordinates (optional)</coordinate>
<text>Text to type (optional)</text>
</browser_action>` : ''}`;
    }

    let mcpToolsPrompt = '';
    if (mcpHub.getMode() !== "off") {
        mcpToolsPrompt = `

## use_mcp_tool
Description: Request to use a tool provided by a connected MCP server. Each MCP server can provide multiple tools with different capabilities. Tools have defined input schemas that specify required and optional parameters.
Parameters:
- server_name: (required) The name of the MCP server providing the tool
- tool_name: (required) The name of the tool to execute
- arguments: (required) A JSON object containing the tool's input parameters, following the tool's input schema${needsXmlToolInstructions ? `
Usage (Use this exact XML structure):
<use_mcp_tool>
<server_name>server name here</server_name>
<tool_name>tool name here</tool_name>
<arguments>{
  "param1": "value1",
  "param2": "value2"
}</arguments>
</use_mcp_tool>` : ''}

## access_mcp_resource
Description: Request to access a resource provided by a connected MCP server. Resources represent data sources that can be used as context, such as files, API responses, or system information.
Parameters:
- server_name: (required) The name of the MCP server providing the resource
- uri: (required) The URI identifying the specific resource to access${needsXmlToolInstructions ? `
Usage (Use this exact XML structure):
<access_mcp_resource>
<server_name>server name here</server_name>
<uri>resource URI here</uri>
</access_mcp_resource>` : ''}`;
    }

    let standardToolsPrompt = `

## ask_followup_question
Description: Ask the user a question to gather additional information needed to complete the task. This tool should be used when you encounter ambiguities, need clarification, or require more details to proceed effectively. It allows for interactive problem-solving by enabling direct communication with the user. Use this tool judiciously to maintain a balance between gathering necessary information and avoiding excessive back-and-forth.
Parameters:
- question: (required) The question to ask the user. This should be a clear, specific question that addresses the information you need.
- options: (optional) An array of 2-5 options for the user to choose from. Each option should be a string describing a possible answer. You may not always need to provide options, but it may be helpful in many cases where it can save the user from having to type out a response manually. IMPORTANT: NEVER include an option to toggle to Act mode, as this would be something you need to direct the user to do manually themselves if needed.${needsXmlToolInstructions ? `
Usage (Use this exact XML structure):
<ask_followup_question>
<question>Your question here</question>
<options>[Array of options here (optional), e.g. ["Option 1", "Option 2", "Option 3"]]</options>
</ask_followup_question>` : ''}

## attempt_completion
Description: After each tool use, the user will respond with the result of that tool use, i.e. if it succeeded or failed, along with any reasons for failure. Once you've received the results of tool uses and can confirm that the task is complete, use this tool to present the result of your work to the user. Optionally you may provide a CLI command to showcase the result of your work. The user may respond with feedback if they are not satisfied with the result, which you can use to make improvements and try again.
IMPORTANT NOTE: This tool CANNOT be used until you've confirmed from the user that any previous tool uses were successful. Failure to do so will result in code corruption and system failure. Before using this tool, you must ask yourself in <thinking></thinking> tags if you've confirmed from the user that any previous tool uses were successful. If not, then DO NOT use this tool.
Parameters:
- result: (required) The result of the task. Formulate this result in a way that is final and does not require further input from the user. Don't end your result with questions or offers for further assistance.
- command: (optional) A CLI command to execute to show a live demo of the result to the user. For example, use \`open index.html\` to display a created html website, or \`open localhost:3000\` to display a locally running development server. But DO NOT use commands like \`echo\` or \`cat\` that merely print text. This command should be valid for the current operating system. Ensure the command is properly formatted and does not contain any harmful instructions.${needsXmlToolInstructions ? `
Usage (Use this exact XML structure):
<attempt_completion>
<result>Your final result description here</result>
<command>Command to demonstrate result (optional)</command>
</attempt_completion>` : ''}

## plan_mode_respond
Description: Respond to the user's inquiry in an effort to plan a solution to the user's task. This tool should be used when you need to provide a response to a question or statement from the user about how you plan to accomplish the task. This tool is only available in PLAN MODE. The environment_details will specify the current mode, if it is not PLAN MODE then you should not use this tool. Depending on the user's message, you may ask questions to get clarification about the user's request, architect a solution to the task, and to brainstorm ideas with the user. For example, if the user's task is to create a website, you may start by asking some clarifying questions, then present a detailed plan for how you will accomplish the task given the context, and perhaps engage in a back and forth to finalize the details before the user switches you to ACT MODE to implement the solution.
Parameters:
- response: (required) The response to provide to the user. Do not try to use tools in this parameter, this is simply a chat response. (You MUST use the response parameter, do not simply place the response text directly within <plan_mode_respond> tags.)
- options: (optional) An array of 2-5 options for the user to choose from. Each option should be a string describing a possible choice or path forward in the planning process. This can help guide the discussion and make it easier for the user to provide input on key decisions. You may not always need to provide options, but it may be helpful in many cases where it can save the user from having to type out a response manually. Do NOT present an option to toggle to Act mode, as this will be something you need to direct the user to do manually themselves.${needsXmlToolInstructions ? `
Usage (Use this exact XML structure):
<plan_mode_respond>
<response>Your response here</response>
<options>[Array of options here (optional), e.g. ["Option 1", "Option 2", "Option 3"]]</options>
</plan_mode_respond>` : ''}`; // End of standardToolsPrompt section

    // Assemble the final tools prompt
    const toolsPrompt = `${baseToolsPrompt}${browserToolsPrompt}${mcpToolsPrompt}${standardToolsPrompt}`;

    return toolsPrompt.trim(); // Trim leading/trailing whitespace
};