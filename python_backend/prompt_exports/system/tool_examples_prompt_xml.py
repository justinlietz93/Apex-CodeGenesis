tool_examples_prompt_xml = """# Tool Use Examples

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
</list_files>"""
