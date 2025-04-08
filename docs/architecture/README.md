# Apex Extension Architecture

This directory contains architectural documentation for the Apex VSCode extension.

## Extension Architecture Diagram

The [extension-architecture.mmd](./extension-architecture.mmd) file contains a Mermaid diagram showing the high-level architecture of the Apex extension. The diagram illustrates:

1. **Core Extension**
   - Extension entry point and main classes
   - State management through VSCode's global state and secrets storage
   - Core business logic in the Apex class

2. **Webview UI**
   - React-based user interface
   - State management through ExtensionStateContext
   - Component hierarchy

3. **Storage**
   - Task-specific storage for history and state
   - Git-based checkpoint system for file changes

4. **Data Flow**
   - Core extension data flow between components
   - Webview UI data flow
   - Bidirectional communication between core and webview

## Viewing the Diagram

To view the diagram:
1. Install a Mermaid diagram viewer extension in VSCode
2. Open extension-architecture.mmd
3. Use the extension's preview feature to render the diagram

You can also view the diagram on GitHub, which has built-in Mermaid rendering support.

## Color Scheme

The diagram uses a high-contrast color scheme for better visibility:
- Pink (#ff0066): Global state and secrets storage components
- Blue (#0066ff): Extension state context
- Green (#00cc66): Apex provider
- All components use white text for maximum readability

## Memory and State Management Review (Task 5.7.2)

A review of the current memory and state management components was conducted as part of enhancing long-running autonomy.

### Frontend (`codegenesis/src/core/task/modules/state-manager.ts`)

*   **Modularity:** Good. Encapsulates task-specific state (API history, UI messages, persona, etc.) and provides clear methods for interaction. Dependencies on storage and history updates are handled via imports.
*   **Coupling:** Moderate. Depends on the main `Task` instance for context (`getContext`) and access to other services/managers (`controllerRef`, `checkpointManager`). The `saveApexMessagesAndUpdateHistory` method has multiple responsibilities (saving, metrics, size calc, history update).
*   **Limitations:** The coupling to the `Task` instance could hinder replacing state management strategies easily. The multi-responsibility save method could be split.
*   **Future Integration:** Refactoring the `Task` class to use dependency injection could reduce coupling. Splitting the `saveApexMessagesAndUpdateHistory` method would improve clarity and maintainability. The current structure is generally suitable for integrating more advanced short-term memory techniques (e.g., summarization within `apiConversationHistory`).

### Backend RAG (`python_backend/src/knowledge_manager.py`)

*   **Modularity:** Good. Leverages the `agno` library to separate concerns (embedding, vector DB, chunking). Initialization uses external configuration. Provides clear `load` and `search` interfaces.
*   **Coupling:** Low. Primarily coupled to the `agno` library and the configuration structure. API key retrieval could be more integrated with a central config loader.
*   **Limitations:**
    *   Embedder/VectorDB types are currently hardcoded as defaults (OpenAI/LanceDB) rather than being fully dynamic based on config.
    *   Workspace loading logic hardcodes file patterns and ignore directories; these should be configurable.
    *   Direct use of `gitignore_parser` creates a specific dependency; a more abstract ignore mechanism would be preferable.
*   **Future Integration:**
    *   Refactor initialization to dynamically load component classes (embedders, vector DBs, readers) based on configuration strings.
    *   Externalize file patterns and ignore rules into the configuration file.
    *   Implement an abstract `IgnoreHandler` interface to support different ignore file types (.gitignore, .agentignore, etc.).
    *   The current structure is well-suited for integrating alternative vector databases or embedding models supported by `agno` or through custom adapters. It provides a solid foundation for more sophisticated RAG strategies.
