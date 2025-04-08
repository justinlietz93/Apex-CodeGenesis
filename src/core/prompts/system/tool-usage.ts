export const getToolUsagePrompt = (needsXml: boolean): string => {
  if (needsXml) {
      return `
====

TOOL USE

You have access to a set of tools that are executed upon the user's approval. You can use one tool per message, and will receive the result of that tool use in the user's response. You use tools step-by-step to accomplish a given task, with each tool use informed by the result of the previous tool use.

# Tool Use Formatting

Tool use is formatted using XML-style tags. The tool name is enclosed in opening and closing tags, and each parameter is similarly enclosed within its own set of tags. Here's the structure:

<tool_name>
<parameter1_name>value1</parameter1_name>
<parameter2_name>value2</parameter2_name>
...
</tool_name>

For example:

<read_file>
<path>src/main.js</path>
</read_file>

Always adhere to this format for the tool use to ensure proper parsing and execution.`;
  } else {
      // Simpler instructions for native function calling
      return `
====

TOOL USE

You have access to a set of tools. Use the tools provided to accomplish the user's task step-by-step. You will receive the result of each tool use before proceeding.`;
  }
};

export const getToolUseGuidelinesPrompt = (): string => {
  return `
# Tool Use Guidelines

1. In <thinking> tags, assess what information you already have and what information you need to proceed with the task.
2. Choose the most appropriate tool based on the task and the tool descriptions provided. Assess if you need additional information to proceed, and which of the available tools would be most effective for gathering this information. For example using the list_files tool is more effective than running a command like \`ls\` in the terminal. It's critical that you think about each available tool and use the one that best fits the current step in the task.
3. If multiple actions are needed, use one tool at a time per message to accomplish the task iteratively, with each tool use being informed by the result of the previous tool use. Do not assume the outcome of any tool use. Each step must be informed by the previous step's result.
4. Formulate your tool use using the XML format specified for each tool.
5. After each tool use, the user will respond with the result of that tool use. This result will provide you with the necessary information to continue your task or make further decisions. This response may include:
- Information about whether the tool succeeded or failed, along with any reasons for failure.
- Linter errors that may have arisen due to the changes you made, which you'll need to address.
- New terminal output in reaction to the changes, which you may need to consider or act upon.
- Any other relevant feedback or information related to the tool use.
6. ALWAYS wait for user confirmation after each tool use before proceeding. Never assume the success of a tool use without explicit confirmation of the result from the user.

It is crucial to proceed step-by-step, waiting for the user's message after each tool use before moving forward with the task. This approach allows you to:
1. Confirm the success of each step before proceeding.
2. Address any issues or errors that arise immediately.
3. Adapt your approach based on new information or unexpected results.
4. Ensure that each action builds correctly on the previous ones.

By waiting for and carefully considering the user's response after each tool use, you can react accordingly and make informed decisions about how to proceed with the task. This iterative process helps ensure the overall success and accuracy of your work.`;
};

export const getToolExamplesPrompt = (needsXml: boolean, mcpEnabled: boolean): string => {
  // Note: mcpEnabled flag is not used in this completion as its purpose isn't defined
  // in the provided snippet. Add logic related to it if needed.
  if (!needsXml) {return "";} // No XML examples needed for native calling

  // Completing the JSON content and adding closing tags/structure
  let examples = `
# Tool Use Examples

## Example 1: Requesting to execute a command

<execute_command>
<command>npm run dev</command>
<requires_approval>false</requires_approval>
</execute_command>

## Example 2: Requesting to create a new file

<write_to_file>
<path>src/frontend-config.json</path>
<content>
{
"apiEndpoint": "https://api.example.com",
"theme": {
  "primaryColor": "#007bff",
  "secondaryColor": "#6c757d",
  "fontFamily": "Arial, sans-serif"
},
"features": {
  "darkMode": true,
  "notifications": true,
  "analytics": false
},
"version": "1.0.0"
}
</content>
</write_to_file>

## Example 3: Requesting to read a file

<read_file>
<path>README.md</path>
</read_file>

## Example 4: Requesting to list files in a directory

<list_files>
<path>src/components</path>
</list_files>
`; // Added examples 3 & 4 for completeness, close template literal

  // Add more examples based on mcpEnabled or other logic here if necessary

  return examples; // Return the completed examples string
};