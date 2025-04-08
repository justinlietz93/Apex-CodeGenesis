import sys
import os
import asyncio
import logging # Uncommented
import json # Uncommented
from typing import Optional, Dict # Uncommented
import traceback # Uncommented
from jsonrpc.manager import JSONRPCResponseManager # Uncommented

# --- Redirect stderr to a log file IMMEDIATELY ---
# This ensures even early errors and logs go to the file.
log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'logs') # Log dir in python_backend root
os.makedirs(log_dir, exist_ok=True)
error_log_path = os.path.join(log_dir, 'backend_stderr.log')
try:
    # Clear previous log
    if os.path.exists(error_log_path):
        os.remove(error_log_path)
    # Redirect stderr
    sys.stderr = open(error_log_path, 'w')
    print("--- Python script started, stderr redirected ---", file=sys.stderr, flush=True)
except Exception as e:
    # If redirection fails, print to original stderr (might not be captured by VS Code easily)
    print(f"CRITICAL: Failed to redirect stderr to {error_log_path}: {e}", file=sys.__stderr__)
    # Fallback: Try logging to stdout as a last resort
    sys.stderr = sys.stdout
    print(f"WARNING: stderr redirection failed. Attempting to log to stdout. Error: {e}", file=sys.stderr, flush=True)
# --- End stderr redirection ---


# --- Logging Setup ---
# Configure logging to write to the redirected stderr (our log file)
logging.basicConfig(stream=sys.stderr, level=logging.INFO, # Use INFO level, can change to DEBUG for more detail
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("PythonBackend")
logger.info("--- Python logging configured ---")


# --- Set Windows Event Loop Policy ---
if sys.platform == "win32":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        logger.info("Set WindowsSelectorEventLoopPolicy")
    except Exception as e:
        logger.error(f"Failed to set event loop policy: {e}", exc_info=True)


# --- JSON-RPC Handling Imports ---
# Assuming 'json-rpc' library is installed. If not: pip install json-rpc
try:

    logger.info("Imported JSONRPCResponseManager")
except ImportError:
    logger.critical("Failed to import 'jsonrpc' library. Please install it (`pip install json-rpc`). Exiting.")
    sys.exit(1) # Cannot function without this


# --- Import Local Handlers ---
# Ensure handlers.py exists relative to this file (e.g., in the same directory)
# and defines METHOD_MAP (dict) and initialize_reasoning_components (function).
try:
    # Assuming handlers.py is in the same directory or correctly handled by sys.path
    logger.info("Imported METHOD_MAP and initialization functions from .handlers")
except ImportError as e:
     logger.critical(f"Failed to import from .handlers: {e}. Ensure handlers.py exists and sys.path is correct. Exiting.", exc_info=True)
     sys.exit(1)


# --- Stdio Communication Functions ---

async def read_message(reader: asyncio.StreamReader) -> Optional[bytes]:
    """Reads a JSON-RPC message based on Content-Length header."""
    try:
        line = await reader.readline()
        if not line:
            logger.info("Received EOF from stdin reader.")
            return None # End of stream
        header = line.decode('utf-8').strip()
        logger.debug(f"Received header line: {header}")

        if header.startswith("Content-Length:"):
            try:
                length = int(header.split(":")[1].strip())
                logger.debug(f"Expecting message body of length: {length}")
            except (ValueError, IndexError):
                logger.error(f"Invalid Content-Length header format: {header}")
                return None # Treat as error, maybe read until next valid header?

            # Read the blank line separating header and content
            separator_line = await reader.readline()
            if separator_line.strip(): # Should be empty
                 logger.warning(f"Expected blank line after header, got: {separator_line.decode('utf-8').strip()}")
                 # Continue anyway, maybe the client doesn't send it strictly

            # Read the message content
            logger.debug("Reading message body...")
            body = await reader.readexactly(length)
            logger.debug(f"Successfully read {len(body)} bytes for message body.")
            return body
        else:
            logger.warning(f"Received unexpected line (expecting Content-Length): {header}")
            # Keep reading until a valid header or EOF. Returning None might break the loop.
            # Let's assume for now that only valid headers will eventually come.
            # In a robust implementation, might need better recovery here.
            return await read_message(reader) # Recursively try reading the next line

    except asyncio.IncompleteReadError:
         logger.info("Stdin closed unexpectedly while reading message (IncompleteReadError).")
         return None
    except Exception as e:
        logger.error(f"Error reading message header/body: {e}", exc_info=True)
        return None


def write_message(writer: asyncio.StreamWriter, message: Dict):
    """Writes a JSON-RPC message with Content-Length header."""
    try:
        logger.debug(f"Preparing to write message: {str(message)[:200]}...") # Log truncated message
        body = json.dumps(message).encode('utf-8')
        header = f"Content-Length: {len(body)}\r\n\r\n".encode('utf-8')
        logger.debug(f"Writing header: Content-Length: {len(body)}")
        writer.write(header)
        logger.debug(f"Writing body ({len(body)} bytes)")
        writer.write(body)
        # Drain is handled in the main loop after this call
    except Exception as e:
         logger.error(f"Error encoding or writing message: {e}", exc_info=True)


async def main_loop():
    """Main asyncio loop to read stdio, handle requests, and write responses."""
    logger.info("Starting Python backend stdio main loop...")

    # --- Initialize Reasoning Components ---
    # This should load models, API keys, etc. required by handlers.
    try:
        logger.info("Initializing reasoning components...")
        initialize_reasoning_components()
        # Check if initialization reported failure
        if not REASONING_COMPONENTS.get("initialized", False): # Check key safely
            logger.critical("Reasoning components failed to initialize (reported by handlers.py). Backend cannot function.")
            sys.exit(1) # Exit if essential components failed
        logger.info("Reasoning components initialized successfully.")
    except Exception as e:
        logger.critical(f"Unhandled exception during reasoning component initialization: {e}", exc_info=True)
        sys.exit(1) # Exit if initialization crashes


    # --- Setup Stdio Streams ---
    logger.info("Setting up stdio reader and writer...")
    loop = asyncio.get_running_loop()
    reader = asyncio.StreamReader()
    protocol = asyncio.StreamReaderProtocol(reader)

    try:
        # Connect stdin
        await loop.connect_read_pipe(lambda: protocol, sys.stdin)
        logger.info("Connected read pipe (stdin)")

        # Connect stdout
        writer_transport, writer_protocol = await loop.connect_write_pipe(
            asyncio.streams.FlowControlMixin, sys.stdout
        )
        writer = asyncio.StreamWriter(writer_transport, writer_protocol, None, loop) # Pass None for reader
        logger.info("Connected write pipe (stdout). Backend ready and waiting for messages.")
    except Exception as e:
         logger.critical(f"Failed to connect stdio pipes: {e}", exc_info=True)
         sys.exit(1)


    # --- Main Message Processing Loop ---
    while True:
        request_id = None # Keep track for error reporting
        method_name = None # Keep track for error reporting
        try:
            logger.debug("Waiting for next message...")
            request_bytes = await read_message(reader)

            if request_bytes is None:
                logger.info("Received None from read_message, likely EOF or read error. Exiting main loop.")
                break # Exit loop if stdin closes or read fails critically

            request_str = request_bytes.decode('utf-8') # For logging and parsing
            logger.info(f"Received request: {request_str[:500]}{'...' if len(request_str) > 500 else ''}") # Log truncated request

            response_dict = None
            try:
                request_dict = json.loads(request_str)
                method_name = request_dict.get("method")
                params = request_dict.get("params")
                request_id = request_dict.get("id") # Can be None for notifications

                if not method_name:
                     raise ValueError("Request object missing 'method' field.")

                if method_name in METHOD_MAP:
                    handler = METHOD_MAP[method_name]

                    # --- Handle Sync/Async Dispatch ---
                    if asyncio.iscoroutinefunction(handler):
                        logger.debug(f"Dispatching ID:{request_id} to ASYNC handler: {method_name}")
                        # Await the async handler directly
                        result_data = await handler(params) # Pass params
                        logger.debug(f"Handler {method_name} (ID:{request_id}) returned.")

                        # Construct response if it's not a notification
                        if request_id is not None:
                            # Check if handler returned an error structure (simple check)
                            if isinstance(result_data, dict) and result_data.get("code") is not None and result_data.get("message") is not None:
                                logger.warning(f"Handler {method_name} (ID:{request_id}) returned an error structure: {result_data}")
                                response_dict = {"jsonrpc": "2.0", "id": request_id, "error": result_data}
                            else:
                                logger.debug(f"Handler {method_name} (ID:{request_id}) returned success result.")
                                response_dict = {"jsonrpc": "2.0", "id": request_id, "result": result_data}
                        else:
                             logger.debug(f"Request was a notification (method: {method_name}), no response sent.")

                    else: # Synchronous handler
                        logger.debug(f"Dispatching ID:{request_id} to SYNC handler: {method_name}")
                        # Use the synchronous manager for sync handlers (assumes it doesn't block excessively!)
                        # Filter METHOD_MAP just for this call to avoid unintended dispatches
                        sync_response = JSONRPCResponseManager.handle(request_bytes, {method_name: handler})
                        logger.debug(f"Sync handler {method_name} (ID:{request_id}) returned via manager.")
                        if sync_response:
                            response_dict = sync_response.data # Contains full response dict
                        # If it was a sync notification, sync_response is None, response_dict remains None
                else:
                    # Method not found
                    logger.warning(f"Method not found: {method_name} (ID:{request_id})")
                    if request_id is not None:
                        response_dict = {
                            "jsonrpc": "2.0",
                            "id": request_id,
                            "error": {"code": -32601, "message": f"Method not found: {method_name}"}
                        }

            except json.JSONDecodeError as e:
                logger.error(f"Failed to decode JSON request: {request_str[:500]}... Error: {e}", exc_info=True)
                # Try to respond with parse error, ID might be unknown
                response_dict = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": f"Parse error: {e}"}}
            except Exception as e:
                # Catch errors during handler lookup or dispatch
                logger.exception(f"Error processing request for method '{method_name}' (ID:{request_id}): {e}")
                if request_id is not None:
                    response_dict = {"jsonrpc": "2.0", "id": request_id, "error": {"code": -32603, "message": f"Internal server error: {e}"}}

            # --- Write Response ---
            if response_dict:
                logger.info(f"Sending response (ID: {response_dict.get('id')}): {str(response_dict)[:500]}{'...' if len(str(response_dict)) > 500 else ''}")
                write_message(writer, response_dict)
                try:
                    await writer.drain() # Ensure message is flushed
                    logger.debug(f"Writer drained for response ID: {response_dict.get('id')}")
                except ConnectionResetError:
                     logger.warning(f"Connection reset while draining writer for response ID: {response_dict.get('id')}. Client may have disconnected.")
                     break # Exit loop if connection is gone
                except Exception as e:
                     logger.error(f"Error draining writer for response ID: {response_dict.get('id')}: {e}", exc_info=True)
                     # Decide if this is fatal, maybe break the loop

        # --- Handle Loop-Level Exceptions ---
        except asyncio.IncompleteReadError:
            logger.info("Client closed connection (IncompleteReadError in main loop).")
            break
        except ConnectionResetError:
            logger.info("Client connection reset (ConnectionResetError in main loop).")
            break
        except Exception as e:
            logger.exception(f"Critical unexpected error in main loop: {e}")
            # Maybe try to send one last error message if possible? Risky.
            break # Exit loop on critical errors


    # --- Cleanup after Loop Exit ---
    logger.info("Python backend main loop finished.")
    if writer and not writer.is_closing():
        logger.info("Closing writer...")
        writer.close()
        try:
            await writer.wait_closed()
            logger.info("Writer closed.")
        except ConnectionResetError:
            logger.info("Connection reset occurred during writer close (ignoring).")
        except Exception as e:
            logger.error(f"Error during writer wait_closed: {e}", exc_info=True)

def run_backend():
    """Runs the main asyncio event loop with top-level error catching."""
    logger.info("Executing run_backend...")
    try:
        # Start the main asynchronous loop
        asyncio.run(main_loop())
        logger.info("asyncio.run(main_loop()) completed normally.")

    except KeyboardInterrupt:
        logger.info("Backend stopped by user (KeyboardInterrupt).")
    except Exception as e:
        # Log the critical exception to the redirected stderr before exiting
        logger.critical(f"Unhandled exception occurred in run_backend: {e}", exc_info=True)
        # Also print traceback directly to stderr file for good measure
        traceback.print_exc(file=sys.stderr)
    finally:
        logger.info("Python backend process `run_backend` function finished.")
        # --- Ensure stderr log is closed and restored ---
        if sys.stderr != sys.__stderr__:
            logger.info("Closing stderr log file and restoring original stderr.")
            try:
                sys.stderr.flush() # Ensure buffer is written
                sys.stderr.close()
            except Exception as close_err:
                 # Log closing error to original stderr if possible
                 print(f"ERROR: Exception closing log file '{error_log_path}': {close_err}", file=sys.__stderr__)
            finally:
                 sys.stderr = sys.__stderr__ # Restore original stderr


if __name__ == "__main__":
    # --- Path Setup ---
    # Ensure the script's directory and parent directory are in the path
    # for relative imports (`from .handlers import ...`)
    src_dir = os.path.dirname(os.path.abspath(__file__))
    if src_dir not in sys.path:
        sys.path.insert(0, src_dir)
        logger.debug(f"Added src directory to sys.path: {src_dir}")

    parent_dir = os.path.dirname(src_dir)
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)
        logger.debug(f"Added parent directory to sys.path: {parent_dir}")

    # Use absolute import now that parent dirs are in sys.path
    from handlers import METHOD_MAP, initialize_reasoning_components, REASONING_COMPONENTS

    logger.info(f"Python Executable: {sys.executable}")
    logger.info(f"sys.path: {sys.path}")
    logger.info(f"Current Working Directory: {os.getcwd()}")

    # --- Run the Backend ---
    run_backend() # Uncommented - This starts the main process

    # Code here is reached only after run_backend() finishes (i.e., loop exits or critical error)
    logger.info("Python main.py script execution finished.")