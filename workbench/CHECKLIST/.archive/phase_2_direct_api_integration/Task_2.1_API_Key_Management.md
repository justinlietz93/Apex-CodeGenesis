# Task 2.1: API Key Management Strategy

**Status:** Implemented (Initial Strategy)

## Goal

Define and implement a strategy for managing API keys required for direct LLM API calls within the CodeGenesis extension.

## Initial Strategy (Development)

1.  **Environment Variables:**
    *   Store API keys (e.g., `GEMINI_API_KEY`, `OPENAI_API_KEY`) in environment variables on the development machine.
    *   The extension will read these variables at runtime using `process.env.YOUR_API_KEY_NAME`.
    *   **Pros:** Simple for local development, keeps keys out of source control.
    *   **Cons:** Requires manual setup on each dev machine, not suitable for distribution.
2.  **`.env` File (Optional Dev Convenience):**
    *   Optionally use a `.env` file in the `CodeGenesis` project root (added to `.gitignore`) to load environment variables easily during development using a library like `dotenv`.
    *   Command: `npm install dotenv --save-dev` executed. [X]
    *   Code: Added `dotenv.config({ path: ... })` logic to `CodeGenesis/src/extension.ts` to load `.env` from workspace root. [X]

## Future Strategy (Distribution/User Configuration)

1.  **VS Code Settings:**
    *   Contribute configuration settings in `package.json` (e.g., `codegenesis.apiKeys.gemini`, `codegenesis.apiKeys.openai`).
    *   Users can enter their keys via the VS Code Settings UI.
    *   Read keys using `vscode.workspace.getConfiguration('codegenesis').get('apiKeys.gemini')`.
    *   **Pros:** Standard VS Code way, allows user configuration.
    *   **Cons:** Keys stored in plain text in settings files (though user settings can be synced securely).
2.  **VS Code `SecretStorage`:**
    *   Use `context.secrets.store('codegenesis.geminiApiKey', key)` and `context.secrets.get('codegenesis.geminiApiKey')`.
    *   **Pros:** More secure storage managed by VS Code, suitable for sensitive data.
    *   **Cons:** Requires slightly more complex setup, user might need to be prompted to enter keys initially.

## Decision

Started with **Environment Variables** loaded via `.env` file for initial development and testing. Plan to migrate to **VS Code Settings** or **`SecretStorage`** before any potential distribution.

## Next Steps

-   Verify API key loading during runtime testing.
-   Implement reading keys from `process.env` in `agent.ts` (Completed as part of Task 2.3).
