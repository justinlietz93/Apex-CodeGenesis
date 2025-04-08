# Placeholder for KnowledgeManager using agno library
import os
import logging
import glob
import asyncio
from typing import List, Optional, Dict, Any

# Import necessary agno components
from agno.knowledge.agent import AgentKnowledge
from agno.document.base import Document
from agno.document.reader.text_reader import TextReader # Use TextReader for individual files
from agno.document.chunking.fixed import FixedSizeChunking
from agno.embedder.openai import OpenAIEmbedder # Example embedder
from agno.vectordb.lancedb import LanceDb # Example vector DB
import gitignore_parser # Import the parser
# from agno.utils.log import logger # Use standard logging instead

# Configure logging for this module (use standard logging)
module_logger = logging.getLogger(__name__)
module_logger.setLevel(logging.INFO) # Or get level from config


# --- Helper to get API key ---
# This might be better placed in a shared utility or handled by ConfigLoader if extended
def _get_api_key(key_name: str) -> Optional[str]:
    """Retrieves API key from environment variables."""
    api_key = os.getenv(key_name)
    if not api_key:
        module_logger.warning(f"{key_name} not found in environment variables.")
    return api_key


class KnowledgeManager:
    def __init__(self, config: Dict[str, Any], workspace_root: Optional[str] = None):
        """
        Initializes the KnowledgeManager.

        Args:
            config: Configuration dictionary containing settings for embedder, vectordb, etc.
            workspace_root: The root path of the workspace to potentially load knowledge from.
        """
        self.config = config
        self.workspace_root = workspace_root
        self.agent_knowledge: Optional[AgentKnowledge] = None
        self._initialize_knowledge_base()

    def _initialize_knowledge_base(self):
        """Initializes the AgentKnowledge instance with configured components."""
        module_logger.info("Initializing KnowledgeManager components...")
        try:
            # --- Configure Embedder ---
            embedder_config = self.config.get("knowledge", {}).get("embedder", {})
            embedder_type = embedder_config.get("type", "openai").lower() # Default to openai
            embedder_id = embedder_config.get("id", "text-embedding-3-small") # Default model

            embedder = None
            if embedder_type == "openai":
                api_key = _get_api_key("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError("OpenAI API key not found for embedder.")
                embedder = OpenAIEmbedder(id=embedder_id, api_key=api_key)
                module_logger.info(f"Using OpenAIEmbedder: {embedder_id}")
            # TODO: Add other embedder types (e.g., Gemini, Ollama) based on config
            # elif embedder_type == "google":
            #     api_key = _get_api_key("GEMINI_API_KEY") # Assuming Gemini uses this key
            #     if not api_key:
            #         raise ValueError("Gemini API key not found for embedder.")
            #     # from agno.embedder.google import GoogleEmbedder # Import if needed
            #     # embedder = GoogleEmbedder(model=embedder_id, api_key=api_key)
            #     module_logger.warning("GoogleEmbedder not fully implemented yet.")
            else:
                raise ValueError(f"Unsupported embedder type: {embedder_type}")

            if not embedder:
                 raise RuntimeError("Failed to initialize embedder.")

            # --- Configure VectorDB ---
            vectordb_config = self.config.get("knowledge", {}).get("vectordb", {})
            vectordb_type = vectordb_config.get("type", "lancedb").lower() # Default to lancedb

            vector_db = None
            if vectordb_type == "lancedb":
                db_path = vectordb_config.get("path")
                # Ensure path is absolute or relative to workspace root
                if not db_path:
                     db_path = os.path.join(self.workspace_root or ".", ".agno_lancedb") # Default path in workspace
                elif not os.path.isabs(db_path) and self.workspace_root:
                     db_path = os.path.join(self.workspace_root, db_path)

                table_name = vectordb_config.get("table_name", "codegenesis_kb")
                vector_db = LanceDb(
                    uri=db_path,
                    table_name=table_name,
                    embedder=embedder # Pass the configured embedder
                )
                module_logger.info(f"Using LanceDB VectorDB: {db_path}/{table_name}")
            # TODO: Add other vector DB types if needed
            else:
                raise ValueError(f"Unsupported vector DB type: {vectordb_type}")

            if not vector_db:
                raise RuntimeError("Failed to initialize vector database.")

            # --- Configure Chunking ---
            chunking_config = self.config.get("knowledge", {}).get("chunking", {})
            chunking_type = chunking_config.get("type", "fixedsize").lower() # Default

            chunking_strategy = None
            if chunking_type == "fixedsize":
                chunk_size = chunking_config.get("size", 1000)
                chunking_strategy = FixedSizeChunking(chunk_size=chunk_size)
                module_logger.info(f"Using FixedSizeChunking: size={chunk_size}")
            # TODO: Add other chunking strategies if needed
            else:
                 raise ValueError(f"Unsupported chunking strategy type: {chunking_type}")

            if not chunking_strategy:
                 raise RuntimeError("Failed to initialize chunking strategy.")


            # --- Configure Reader (Placeholder - Specific reader needed for load_workspace_knowledge) ---
            # We need a reader that can scan directories and read specific file types.
            # This might require a custom reader or finding an appropriate one in agno.
            # reader = FileReader(...) # Example placeholder

            # --- Initialize AgentKnowledge ---
            # Note: The reader is often specific to the knowledge source type (like PDFUrlKnowledgeBase).
            # For loading workspace files, we might need a different approach or a dedicated KnowledgeBase subclass.
            # For now, initialize with VectorDB and Chunking strategy. Reader will be used in loading method.
            self.agent_knowledge = AgentKnowledge(
                vector_db=vector_db,
                chunking_strategy=chunking_strategy,
                # reader=reader # Reader is set dynamically or per-knowledge-source
            )
            module_logger.info(f"KnowledgeManager initialized with VectorDB: {db_path}/{table_name}")

        except Exception as e:
            module_logger.error(f"Failed to initialize KnowledgeManager: {e}", exc_info=True)
            self.agent_knowledge = None

    async def load_workspace_knowledge(self, workspace_root_override: Optional[str] = None):
        """
        Loads knowledge from relevant files within the workspace into the vector store.
        (Reads relevant files, chunks them, and loads into the vector store)
        """
        if not self.agent_knowledge or not self.agent_knowledge.vector_db:
            module_logger.error("AgentKnowledge not initialized. Cannot load workspace knowledge.")
            return

        root = workspace_root_override or self.workspace_root
        if not root or not os.path.isdir(root):
            module_logger.error(f"Invalid workspace root directory provided: {root}")
            return

        module_logger.info(f"Starting workspace knowledge load from: {root}")

        # --- Load .agentignore rules ---
        agentignore_path = os.path.join(root, ".agentignore")
        ignore_matches = None
        try:
            if os.path.exists(agentignore_path):
                with open(agentignore_path, 'r') as f:
                    ignore_matches = gitignore_parser.parse(f)
                module_logger.info(f"Loaded rules from {agentignore_path}")
            else:
                 module_logger.info(f".agentignore file not found at {agentignore_path}. Using default ignores.")
        except Exception as e:
            module_logger.error(f"Error reading or parsing {agentignore_path}: {e}")
            # Continue without .agentignore rules if parsing fails

        # --- Discover Files ---
        # TODO: Make patterns configurable
        patterns = ["**/*.ts", "**/*.py", "**/*.md", "**/*.js"] # Example patterns
        discovered_files = []
        for pattern in patterns:
            # Use recursive glob to find files relative to the root
            discovered_files.extend(glob.glob(os.path.join(root, pattern), recursive=True))

        # --- Filter Files ---
        # Combine hardcoded ignores with .agentignore rules
        hardcoded_ignore_dirs = {"node_modules", ".git", ".vscode", "dist", "build"} # Use a set for efficiency
        filtered_files = []
        for abs_path in discovered_files:
             if not os.path.isfile(abs_path):
                 continue

             # Check hardcoded directory ignores first (faster)
             if any(f"{os.sep}{ignore_dir}{os.sep}" in abs_path or abs_path.endswith(f"{os.sep}{ignore_dir}") for ignore_dir in hardcoded_ignore_dirs):
                 # module_logger.debug(f"Ignoring {abs_path} due to hardcoded dir pattern.")
                 continue

             # Check .agentignore rules if loaded
             if ignore_matches and ignore_matches(abs_path):
                 # module_logger.debug(f"Ignoring {abs_path} due to .agentignore rule.")
                 continue

             # Check for .env file specifically (often not in gitignore but shouldn't be indexed)
             if os.path.basename(abs_path) == ".env":
                 # module_logger.debug(f"Ignoring {abs_path} (dotenv file).")
                 continue

             filtered_files.append(abs_path)

        if not filtered_files:
            module_logger.info("No relevant files found to load.")
            return

        module_logger.info(f"Found {len(filtered_files)} files to process.")

        text_reader = TextReader(chunk=False) # Read whole file content first
        all_documents: List[Document] = []

        # Read files (consider doing this asynchronously for many files)
        for file_path in filtered_files:
            try:
                # TextReader expects the file path directly
                docs = text_reader.read(file_path) # Returns a list, usually with one doc
                if docs:
                    # Add file path to metadata
                    docs[0].meta_data["file_path"] = os.path.relpath(file_path, root)
                    all_documents.append(docs[0])
            except Exception as e:
                module_logger.warning(f"Failed to read file {file_path}: {e}")

        if not all_documents:
             module_logger.warning("No documents could be read successfully.")
             return

        module_logger.info(f"Read {len(all_documents)} documents. Now chunking...")

        # Chunk documents (can be done async)
        chunked_docs = await self.agent_knowledge.chunking_strategy.chunk_documents_async(all_documents)

        module_logger.info(f"Chunked into {len(chunked_docs)} documents. Loading into vector store...")

        try:
            # Load chunked documents into vector store (use async load)
            await self.agent_knowledge.async_load_documents(
                documents=chunked_docs,
                upsert=True, # Upsert to update existing chunks if content changed
                skip_existing=False # Don't skip if upserting
            )
            module_logger.info("Workspace knowledge loading complete.")
        except Exception as e:
            module_logger.error(f"Failed to load documents into vector store: {e}", exc_info=True)

    async def search_knowledge(self, query: str, num_docs: int = 5) -> List[str]:
        """
        Searches the knowledge base for relevant document contents.

        Args:
            query: The search query string.
            num_docs: The maximum number of documents to return.

        Returns:
            A list of relevant document content strings.
        """
        if not self.agent_knowledge:
            module_logger.error("AgentKnowledge not initialized. Cannot search.")
            return []

        try:
            module_logger.info(f"Searching knowledge for: '{query}'")
            results: List[Document] = await self.agent_knowledge.async_search(query=query, num_documents=num_docs)
            module_logger.info(f"Found {len(results)} relevant documents.")
            # Return only the content for now
            return [doc.content for doc in results if doc.content]
        except Exception as e:
            module_logger.error(f"Error during knowledge search: {e}", exc_info=True)
            return []

# Example usage (for testing purposes, if run directly)
if __name__ == '__main__':
    async def main():
        # Requires GEMINI_API_KEY or OPENAI_API_KEY in env for default embedder
        # Configure API keys before running
        # from dotenv import load_dotenv
        # load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

        test_config = {
            "embedder": {"id": "text-embedding-ada-002"}, # Example using OpenAI
            "vectordb": {"path": "./.test_agno_db"}
        }
        # Assuming script is run from python_backend/src
        workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'codegenesis'))
        print(f"Using workspace: {workspace}")

        manager = KnowledgeManager(config=test_config, workspace_root=workspace)

        if manager.agent_knowledge:
            # Example loading (needs implementation)
            # await manager.load_workspace_knowledge()

            # Example search
            search_query = "How is the API handler module structured?"
            results = await manager.search_knowledge(search_query)
            print(f"\nSearch Results for '{search_query}':")
            if results:
                for i, content in enumerate(results):
                    print(f"--- Result {i+1} ---")
                    print(content[:500] + "...") # Print snippet
            else:
                print("No results found.")
        else:
            print("KnowledgeManager initialization failed.")

    # asyncio.run(main()) # Uncomment to run test
    print("KnowledgeManager module loaded.")
