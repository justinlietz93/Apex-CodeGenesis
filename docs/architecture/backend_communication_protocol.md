# Backend Communication Protocol (TypeScript <-> Python Reasoning Engine)

This document defines the JSON-based protocol used for communication between the `codegenesis` TypeScript extension frontend and the `hierarchical_reasoning_generator` Python backend service via the `BackendCommunicator` module.

## General Structure

All messages exchanged follow a common structure containing a `requestId` for tracking and correlation.

### Request Structure (TS -> Py)

```json
{
  "requestId": "string (unique identifier, e.g., UUID)",
  "command": "string (the specific action requested)",
  "payload": "object (command-specific data)"
}
```

### Response Structure (Py -> TS)

```json
{
  "requestId": "string (matches the corresponding request ID)",
  "status": "'success' | 'error'",
  "data": "object | null (payload on success)",
  "error": {
    "code": "string (e.g., 'LLM_ERROR', 'INVALID_PAYLOAD', 'INTERNAL_ERROR')",
    "message": "string (human-readable error description)"
  } | null (null on success)
}
```

## Commands and Payloads

### 1. `generate_plan`

Initiates the generation of a full hierarchical checklist based on a goal.

**Request Payload:**

```json
{
  "goal": "string (The high-level goal)",
  "context": "object | null (Optional additional context for the planner)"
}
```

**Success Response Data:**

```json
{
  "checklist": {
    "goal": "string",
    "phases": [
      {
        "name": "string",
        "description": "string",
        "tasks": [
          {
            "name": "string",
            "description": "string",
            "steps": [
              {
                "step_id": "string (unique ID for the step)",
                "prompt": "string (The detailed instruction/prompt for the step)"
              }
              // ... more steps
            ]
          }
          // ... more tasks
        ]
      }
      // ... more phases
    ],
    "metadata": { // Optional reasoning metadata if provided by backend
      "context": "object",
      "reasoning": "object"
    }
  }
}
```

**Error Response Codes:** `INVALID_PAYLOAD`, `LLM_ERROR`, `GENERATION_FAILED`, `INTERNAL_ERROR`.

### 2. `scrutinize_steps`

Requests the "Council of Philosophers" critique and refinement for a specific set of generated steps within a task.

**Request Payload:**

```json
{
  "goal": "string",
  "phase": {
    "name": "string",
    "description": "string"
  },
  "task": {
    "name": "string",
    "description": "string"
  },
  "original_steps": [
    {
      "step_id": "string",
      "prompt": "string"
    }
    // ... more original steps
  ]
}
```

**Success Response Data:**

```json
{
  "revised_steps": [
    {
      "step_id": "string", // Should ideally match original IDs or indicate changes
      "prompt": "string (The revised step prompt)"
    }
    // ... potentially reordered or modified steps
  ]
}
```

**Error Response Codes:** `INVALID_PAYLOAD`, `LLM_ERROR`, `SCRUTINY_FAILED`, `INTERNAL_ERROR`.

### 3. `get_status` (Optional)

Checks the health and status of the Python backend service.

**Request Payload:**

```json
{}
```

**Success Response Data:**

```json
{
  "status": "'ready' | 'initializing' | 'error'",
  "version": "string (Version of the reasoning engine)"
  // Potentially other status indicators
}
```

**Error Response Codes:** `INTERNAL_ERROR`.

## Error Handling

- The TypeScript frontend should handle potential network errors or timeouts when communicating with the backend.
- The `error` object in the response provides details from the backend if a command fails during processing. The frontend should surface these errors appropriately to the user or logs.
