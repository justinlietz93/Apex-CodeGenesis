# Task 2.4: Model ID Mapping and Configuration

**Status:** Pending

## Goal

Define a mechanism to map the model ID received from the VS Code request (`request.model.id`) to the specific model name required by the provider's SDK (e.g., Gemini) and potentially other provider-specific configurations.

## Initial Approach

1.  **Helper Function:** Create a helper function within `agent.ts` (or a separate utility file) named `mapModelIdToProviderDetails`.
2.  **Input:** Takes `request.model.id` (string) as input.
3.  **Output:** Returns an object containing:
    *   `provider`: An enum or string identifying the provider (e.g., 'gemini', 'openai').
    *   `modelName`: The specific model name expected by the provider's SDK (e.g., 'gemini-1.5-flash-latest', 'gpt-4o').
    *   (Optional) Other details if needed later.
4.  **Mapping Logic:** Use a `switch` statement or `if/else if` chain based on `request.model.id.toLowerCase()` or specific known IDs:
    *   If ID contains 'gemini' or matches known Gemini IDs (like 'gemini-2.0-flash-001'), return `{ provider: 'gemini', modelName: 'gemini-1.5-flash-latest' }` (or the appropriate Gemini SDK model name).
    *   If ID contains 'gpt', return `{ provider: 'openai', modelName: 'gpt-4o' }` (or similar).
    *   Add cases for other providers as needed.
    *   Include a default case to handle unknown/unsupported models, perhaps returning `null` or throwing an error.
5.  **Usage:** Call this function in `handleCodeGenesisRequest` after getting `request.model.id` to determine which provider logic to execute and which model name to pass to the SDK.

## Example Mapping (Implemented & Refined)

```typescript
// Inside agent.ts
interface ProviderDetails { /* ... */ }

function mapModelIdToProviderDetails(vscodeModelId: string): ProviderDetails {
  console.log(`[CodeGenesisAgent Mapping] Received VS Code Model ID: '${vscodeModelId}'`);
  const lowerId = vscodeModelId.toLowerCase();

  // Check for specific known VS Code IDs first (including potential 'models/' prefix)
  if (vscodeModelId === 'models/gemini-2.5-pro-exp-03-25' || vscodeModelId === 'gemini-2.5-pro-exp-03-25') {
    // TODO: Update modelName when SDK supports the specific experimental model
    return { provider: 'gemini', modelName: 'gemini-1.5-pro-latest' }; // Using 1.5 Pro as placeholder
  } else if (vscodeModelId === 'models/gemini-1.5-flash-latest' || vscodeModelId === 'gemini-1.5-flash-latest' || lowerId.includes('flash')) { // Updated Flash ID check
     return { provider: 'gemini', modelName: 'gemini-1.5-flash-latest' };
  } else if (vscodeModelId === 'models/gemini-1.5-pro-latest' || vscodeModelId === 'gemini-1.5-pro-latest') { // Added explicit Pro check
     return { provider: 'gemini', modelName: 'gemini-1.5-pro-latest' };
  }
  // General Gemini Check (Fallback) - Less likely needed now
  else if (lowerId.includes('gemini')) {
     return { provider: 'gemini', modelName: 'gemini-1.5-pro-latest' };
  }
  // OpenAI Checks (Example)
  else if (lowerId.includes('gpt-4')) {
    return { provider: 'openai', modelName: 'gpt-4o' }; // Example
  } else if (lowerId.includes('gpt-3.5')) {
     return { provider: 'openai', modelName: 'gpt-3.5-turbo' }; // Example
  } else if (lowerId.includes('claude')) {
     return { provider: 'anthropic', modelName: 'claude-3-5-sonnet-20240620' }; // Example
  }

  console.warn(`[CodeGenesisAgent] Unknown model ID encountered: ${vscodeModelId}`);
  return { provider: 'unknown', modelName: null };
}
```

## Next Steps

-   Implement this helper function as part of Task 2.3 (Refactor Handler).
-   Refine the mapping logic as more models are tested/supported.
