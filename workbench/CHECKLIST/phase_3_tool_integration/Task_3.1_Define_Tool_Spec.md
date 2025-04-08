# Task 3.1: Define Tool Specification Format

**Status:** Completed

## Decision Rationale

Direct research into VS Code's proposed API for tool definitions within `ChatParticipant` is not feasible due to potential instability and lack of direct browsing capabilities. Therefore, a custom JSON schema is defined, drawing inspiration from established practices like OpenAI Functions and MCP tool schemas. This ensures a robust starting point that can be adapted if a standard VS Code API becomes available and stable.

## Custom Tool Specification JSON Schema

Each tool available to the CodeGenesis agent will be defined by a JSON object adhering to the following schema:

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "The unique identifier for the tool. Should be descriptive and follow a consistent naming convention (e.g., snake_case)."
    },
    "description": {
      "type": "string",
      "description": "A clear, concise description of what the tool does, intended to be understandable by the language model."
    },
    "inputSchema": {
      "type": "object",
      "description": "A JSON Schema object defining the structure, types, and constraints of the arguments the tool accepts.",
      "properties": {
        "type": {
          "type": "string",
          "const": "object",
          "description": "Must be 'object'."
        },
        "properties": {
          "type": "object",
          "description": "Defines the individual parameters the tool accepts.",
          "additionalProperties": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string",
                "description": "The JSON data type of the parameter (e.g., 'string', 'number', 'boolean', 'array', 'object')."
              },
              "description": {
                "type": "string",
                "description": "A description of the parameter, intended for the language model."
              },
              "enum": {
                "type": "array",
                "description": "Optional: An array of allowed values for the parameter."
              }
            },
            "required": ["type", "description"]
          }
        },
        "required": {
          "type": "array",
          "description": "An array listing the names of the required parameters.",
          "items": {
            "type": "string"
          }
        }
      },
      "required": ["type", "properties"]
    }
  },
  "required": ["name", "description", "inputSchema"]
}
```

**Example Tool Definition:**

```json
{
  "name": "read_file",
  "description": "Reads the content of a file at the specified path relative to the workspace root.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "The relative path to the file within the workspace."
      }
    },
    "required": ["path"]
  }
}
```

## Next Steps

- Implement logic in `CodeGenesis/src/agent.ts` to prepare tool definitions in this format (Task 3.2).
- Pass these definitions to the language model via the `vscode.lm.sendChatRequest` options (Task 3.2).
