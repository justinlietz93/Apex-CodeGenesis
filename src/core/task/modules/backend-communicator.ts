import * as vscode from "vscode"
import * as path from "path"
import { ChildProcessWithoutNullStreams, spawn } from "child_process"
import * as rpc from "vscode-jsonrpc/node"
import pTimeout from "p-timeout" // Keep for potential timeouts on requests
import { Task } from "../index" // Import Task type
// Import all necessary types from the updated protocol file
import {
	InitializeParams,
	InitializeResult,
	GeneratePlanParams,
	GeneratePlanResult,
	RefineStepsParams,
	RefineStepsResult,
	SelectPersonaParams,
	SelectPersonaResult,
	AnalyzeAndRecoverParams,
	AnalyzeAndRecoverResult,
	GetPersonaContentByNameRequest,
	GetPersonaContentByNameResult,
	ReplanningRequest,
	ReplanningResult, // Added replanning types
	KnowledgeSearchParams,
	KnowledgeSearchResult,
	RpcError,
} from "../../../shared/BackendProtocol"

export class BackendCommunicator {
	private task: Task

	// Properties moved from Task
	private pythonProcess: ChildProcessWithoutNullStreams | null = null
	private rpcConnection: rpc.MessageConnection | null = null
	private backendInitialized = false

	constructor(taskInstance: Task) {
		this.task = taskInstance
	}

	// --- Python Backend Communication ---

	public async setupBackendConnection(): Promise<void> {
		if (this.rpcConnection) {
			console.log("Backend connection already exists.")
			return
		}

		console.log("Setting up Python backend connection...")
		const config = vscode.workspace.getConfiguration("apex.backend")
		const pythonPath = config.get<string>("pythonPath") || "python" // Default to 'python' if not set
		// Access context via task
		const context = this.task.getContext()
		// Resolve path assuming python_backend is copied into 'dist' during build
		const backendRootPath = path.resolve(context.extensionPath, "dist", "python_backend") // Corrected path to include 'dist'
		const backendScriptPath = path.resolve(backendRootPath, "src", "main.py") // Removed incorrect 'src' segment

		console.log(`Using Python path: ${pythonPath}`)
		console.log(`Backend script path: ${backendScriptPath}`)
		console.log(`Backend working directory: ${backendRootPath}`)

		try {
			// Ensure the backend script exists before attempting to spawn
			try {
				await vscode.workspace.fs.stat(vscode.Uri.file(backendScriptPath))
			} catch (statError) {
				throw new Error(
					`Python backend script not found at expected location: ${backendScriptPath}. Stat error: ${statError}`,
				)
			}

			this.pythonProcess = spawn(pythonPath, ["-u", backendScriptPath], {
				cwd: backendRootPath, // Set cwd to the python_backend directory
			})

			if (!this.pythonProcess.stdout || !this.pythonProcess.stdin) {
				throw new Error("Failed to get stdio streams from Python process.")
			}

			this.pythonProcess.stderr.on("data", (data) => {
				const errorMsg = data.toString()
				console.error(`Python Backend STDERR: ${errorMsg}`)
				// stderr messages are often noisy; avoid reporting directly to user unless critical
			})

			this.pythonProcess.on("error", (err) => {
				console.error("Failed to start Python backend process:", err)
				// Use webviewCommunicator
				this.task.webviewCommunicator.say("error", `Failed to start Python backend: ${err.message}`)
				this.shutdownBackend()
			})

			this.pythonProcess.on("close", (code) => {
				console.log(`Python backend process exited with code ${code}`)
				if (!this.task.abort) {
					// Access abort via task
					// Use webviewCommunicator
					this.task.webviewCommunicator.say("error", `Python backend process stopped unexpectedly (code ${code}).`)
				}
				this.shutdownBackend() // Ensure cleanup
			})

			this.rpcConnection = rpc.createMessageConnection(
				new rpc.StreamMessageReader(this.pythonProcess.stdout),
				new rpc.StreamMessageWriter(this.pythonProcess.stdin),
			)

			this.rpcConnection.listen()
			console.log("RPC connection established and listening.")

			// Send initialize request
			const initializeParams: InitializeParams = {
				processId: process.pid, // Node.js process ID
				rootUri: vscode.workspace.workspaceFolders?.[0]?.uri.toString() ?? null,
				capabilities: {}, // Define client capabilities if needed
			}

			const initializeResult = await pTimeout(
				this.rpcConnection.sendRequest<InitializeResult>("initialize", initializeParams),
				{
					milliseconds: 10000, // 10 second timeout for initialization
					message: "Python backend initialization timed out.",
				},
			)

			console.log("Python backend initialized:", initializeResult)
			this.backendInitialized = true

			// TODO: Set up notification handlers from backend (e.g., diagnostics)
			// this.rpcConnection.onNotification(...)
		} catch (error: Error | any) {
			// Added type annotation
			console.error("Error setting up backend connection:", error)
			// Use webviewCommunicator
			this.task.webviewCommunicator.say("error", `Failed to initialize Python backend: ${error.message}`)
			this.shutdownBackend() // Clean up if initialization fails
			throw error // Re-throw to be handled by the caller (e.g., Task constructor)
		}
	}

	public async sendBackendRequest<ResultType>(method: string, params: any): Promise<ResultType> {
		if (!this.rpcConnection || !this.backendInitialized) {
			throw new Error("Backend connection is not ready.")
		}
		console.log(`Sending backend request: ${method}`, params)
		try {
			// Use the class property rpcConnection
			const result = await this.rpcConnection.sendRequest<ResultType>(method, params)
			console.log(`Received backend response for ${method}:`, result)
			return result
		} catch (error) {
			console.error(`Backend request failed for ${method}:`, error)
			throw error // Re-throw to be handled by the caller
		}
	}

	public async shutdownBackend(): Promise<void> {
		// Use the class property rpcConnection
		if (this.rpcConnection) {
			try {
				this.rpcConnection.dispose()
				console.log("RPC connection disposed.")
			} catch (error) {
				console.error("Error disposing RPC connection:", error)
			} finally {
				this.rpcConnection = null
			}
		}
		// Use the class property pythonProcess
		if (this.pythonProcess) {
			this.pythonProcess.kill()
			console.log("Python backend process killed.")
			this.pythonProcess = null
		}
		this.backendInitialized = false
	}
	// --- End Python Backend Communication ---

	// --- New Reasoning Methods ---

	/**
	 * Sends a request to the Python backend to generate a hierarchical plan.
	 * @param params Parameters for plan generation (goal, context).
	 * @returns The generated checklist structure.
	 * @throws Error if the backend connection is not ready or the request fails.
	 */
	public async generatePlan(params: GeneratePlanParams): Promise<GeneratePlanResult> {
		// Type safety: Ensure the return type matches GeneratePlanResult
		// The Python handler directly returns the checklist structure on success.
		const result = await this.sendBackendRequest<GeneratePlanResult>("reasoning/generatePlan", params)
		// Add validation if necessary (e.g., check if result has 'goal' and 'phases')
		if (!result || typeof result !== "object" || !("goal" in result) || !("phases" in result)) {
			console.error("Invalid response structure received from reasoning/generatePlan:", result)
			throw new Error("Invalid response structure received from backend for generatePlan.")
		}
		return result
	}

	/**
	 * Sends a request to the Python backend to refine a set of steps using council critique.
	 * @param params Parameters for step refinement (original steps, context).
	 * @returns The list of refined steps.
	 * @throws Error if the backend connection is not ready or the request fails.
	 */
	public async refineSteps(params: RefineStepsParams): Promise<RefineStepsResult> {
		// Type safety: Ensure the return type matches RefineStepsResult
		const result = await this.sendBackendRequest<RefineStepsResult>("reasoning/refineSteps", params)
		// Add validation if necessary
		if (!result || typeof result !== "object" || !("refined_steps" in result) || !Array.isArray(result.refined_steps)) {
			console.error("Invalid response structure received from reasoning/refineSteps:", result)
			throw new Error("Invalid response structure received from backend for refineSteps.")
		}
		return result
	}

	/**
	 * Sends a request to the Python backend to select the most appropriate persona for a given goal.
	 * @param params Parameters for persona selection (goal).
	 * @returns The content of the selected persona file.
	 * @throws Error if the backend connection is not ready or the request fails.
	 */
	public async selectPersona(params: SelectPersonaParams): Promise<SelectPersonaResult> {
		// Type safety: Ensure the return type matches SelectPersonaResult
		const result = await this.sendBackendRequest<SelectPersonaResult>("reasoning/selectPersona", params)
		// Add validation if necessary
		if (!result || typeof result !== "object" || typeof result.persona_content !== "string") {
			console.error("Invalid response structure received from reasoning/selectPersona:", result)
			throw new Error("Invalid response structure received from backend for selectPersona.")
		}
		return result
	}

	/**
	 * Sends a request to the Python backend to analyze an error/situation and propose recovery steps.
	 * @param params Parameters for analysis and recovery (goal, state, error, history, plan).
	 * @returns The structured recovery plan from the backend.
	 * @throws Error if the backend connection is not ready or the request fails.
	 */
	public async analyzeAndRecover(params: AnalyzeAndRecoverParams): Promise<AnalyzeAndRecoverResult> {
		// Type safety: Ensure the return type matches AnalyzeAndRecoverResult
		const result = await this.sendBackendRequest<AnalyzeAndRecoverResult>("reasoning/analyzeAndRecover", params)
		// Add validation if necessary
		if (!result || typeof result !== "object" || typeof result.analysis !== "string" || !Array.isArray(result.next_actions)) {
			console.error("Invalid response structure received from reasoning/analyzeAndRecover:", result)
			throw new Error("Invalid response structure received from backend for analyzeAndRecover.")
		}
		return result
	}

	/**
	 * Sends a request to the Python backend to retrieve the content of a specific persona file.
	 * @param params Parameters containing the name of the persona file.
	 * @returns An object containing the persona content string, or null if not found.
	 * @throws Error if the backend connection is not ready or the request fails.
	 */
	public async getPersonaContentByName(params: GetPersonaContentByNameRequest): Promise<GetPersonaContentByNameResult> {
		// Type safety: Ensure the return type matches GetPersonaContentByNameResult
		const result = await this.sendBackendRequest<GetPersonaContentByNameResult>("reasoning/getPersonaContentByName", params)
		// Add validation if necessary
		if (
			!result ||
			typeof result !== "object" ||
			!(typeof result.content === "string" || result.content === null) // Check for string or null
		) {
			console.error("Invalid response structure received from reasoning/getPersonaContentByName:", result)
			throw new Error("Invalid response structure received from backend for getPersonaContentByName.")
		}
		return result
	}

	/**
	 * Sends a request to the Python backend to analyze the current situation and potentially revise the plan.
	 * @param params Parameters including goal, current plan, agent state, and obstacle description.
	 * @returns The analysis and potentially a revised plan or next step suggestion.
	 * @throws Error if the backend connection is not ready or the request fails.
	 */
	public async replanning(params: ReplanningRequest): Promise<ReplanningResult> {
		// Type safety: Ensure the return type matches ReplanningResult
		const result = await this.sendBackendRequest<ReplanningResult>("reasoning/replanning", params)
		// Add validation if necessary
		if (
			!result ||
			typeof result !== "object" ||
			typeof result.analysis !== "string"
			// Add checks for optional fields if needed (revised_plan, suggested_next_step)
		) {
			console.error("Invalid response structure received from reasoning/replanning:", result)
			throw new Error("Invalid response structure received from backend for replanning.")
		}
		return result
	}

	// --- New Knowledge Methods ---

	/**
	 * Sends a request to the Python backend to search the knowledge base.
	 * @param params Parameters for knowledge search (query, num_docs).
	 * @returns The list of relevant document content strings.
	 * @throws Error if the backend connection is not ready or the request fails.
	 */
	public async knowledgeSearch(params: KnowledgeSearchParams): Promise<KnowledgeSearchResult> {
		// Type safety: Ensure the return type matches KnowledgeSearchResult
		const result = await this.sendBackendRequest<KnowledgeSearchResult>("knowledge/search", params)
		// Add validation if necessary
		if (!result || typeof result !== "object" || !Array.isArray(result.results)) {
			console.error("Invalid response structure received from knowledge/search:", result)
			throw new Error("Invalid response structure received from backend for knowledgeSearch.")
		}
		return result
	}
}
