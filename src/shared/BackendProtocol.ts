// --- Common Structures ---

export interface EditorContext {
	/** Represents the editor context sent from host to backend. */
	activeEditorContent?: string | null
	activeEditorPath?: string | null
	selection?: string | null
	openFiles: string[]
	// relevantFiles?: string[]; // Consider adding if needed later
}

export interface RpcErrorData {
	/** Structure for the 'data' field within a JSON-RPC error object. */
	details?: string | null
	// Add other relevant fields as needed
}

export interface RpcError {
	/** JSON-RPC Error Object structure. */
	code: number
	message: string
	data?: RpcErrorData | null
}

// --- Method-Specific Parameter & Result Types ---

// initialize (Request Params)
export interface InitializeParams {
	processId: number | null // process.pid can be null
	rootUri: string | null
	capabilities: Record<string, any> // Define more specific capabilities if needed
	// Add any other necessary initialization parameters
	initialConfig?: Record<string, any> // Structure depends on actual config needed
	workspaceRoot?: string | null
	environment?: Record<string, any> // e.g., { 'vscodeVersion': '1.80.0', 'platform': 'win32' }
}

// initialize (Result - Success)
export interface InitializeResult {
	capabilities: Record<string, any> // Define server capabilities
	// Add other result fields as needed
}

// executeTask (Request Params)
export interface ExecuteTaskParams {
	taskId: string
	prompt: string
	context: EditorContext
}

// executeTask (Result - Success)
export interface ExecuteTaskResult {
	status: "completed" | "error"
	message?: string | null // Optional message, e.g., on error
}

// $/partialResult (Notification Params)
export interface PartialResultParams {
	taskId: string
	content: string
	type: "thought" | "code" | "text"
}

// $/requestToolExecution (Request Params)
export interface RequestToolExecutionParams {
	toolCallId: string
	toolName: string
	toolInput: Record<string, any> // Tool input structure varies per tool
}

// toolResponse (Response Params from Host)
export interface ToolResponseParams {
	toolCallId: string
	result?: any | null
	error?: RpcError | null // Use RpcError structure for tool errors
}

// $/logMessage (Notification Params)
export interface LogMessageParams {
	type: "info" | "warn" | "error"
	message: string
}

// $/statusUpdate (Notification Params)
export interface StatusUpdateParams {
	message: string
	progress?: number | null // e.g., 0.0 to 1.0
}

// $/taskError (Notification Params)
export interface TaskErrorParams {
	taskId: string
	message: string
	details?: any | null
}

// updateConfiguration (Notification Params)
export interface UpdateConfigurationParams {
	updatedConfig: Record<string, any> // Structure depends on actual config changed
}

// shutdown (Request Params - Empty)
export interface ShutdownParams {}

// shutdown (Result - Empty)
export interface ShutdownResult {}

// exit (Notification Params - Empty)
export interface ExitParams {}

// --- Reasoning Methods ---

// reasoning/generatePlan (Request Params)
export interface GeneratePlanParams {
	goal: string
	context?: Record<string, any> | null
}

// reasoning/generatePlan (Result - Success)
// Define the structure based on Python ChecklistGenerator output
interface BackendStep {
	step_id: string // Matches Python StepModel
	prompt: string // Matches Python StepModel
	description?: string // Optional, might be present
}
interface BackendTask {
	name: string
	description: string
	steps: BackendStep[]
}
interface BackendPhase {
	name: string
	description: string
	tasks: BackendTask[]
	reasoning?: Record<string, any> // Optional reasoning metadata
}
export interface BackendChecklist {
	goal: string
	phases: BackendPhase[]
	metadata?: Record<string, any> // Optional metadata
}
export interface GeneratePlanResult {
	// The handler directly returns the checklist structure
	goal: string
	phases: BackendPhase[]
	metadata?: Record<string, any>
}

// reasoning/refineSteps (Request Params)
export interface RefineStepsParams {
	steps: BackendStep[] // Use the defined BackendStep type
	context: {
		// Context needed for refinement
		goal: string
		phase_name?: string
		phase_description?: string
		task_name?: string
		task_description?: string
		// Add other relevant context fields if needed
	}
}

// reasoning/refineSteps (Result - Success)
export interface RefineStepsResult {
	refined_steps: BackendStep[] // Returns the list of refined steps
}

// reasoning/selectPersona (Request Params)
export interface SelectPersonaParams {
	goal: string
}

// reasoning/selectPersona (Result - Success)
export interface SelectPersonaResult {
	persona_content: string // The content of the selected persona file
}

// reasoning/analyzeAndRecover (Request Params)
export interface AnalyzeAndRecoverParams {
	task_goal: string
	agent_state: Record<string, any> | string // Can be complex state object or stringified version
	error_details: Record<string, any> | string // Can be error object or stringified version
	action_history: Array<Record<string, any>> | string // List of actions or stringified version
	plan_state?: Record<string, any> | string | null // Optional plan state
}

// reasoning/analyzeAndRecover (Result - Success)
// Matches the expected JSON structure from the Python handler's LLM call
export interface RecoveryAction {
	type: "tool_use" | "instruction" | "clarification_request" | string // Allow other types if needed
	details: Record<string, any> // Specific parameters for the action
}

export interface AnalyzeAndRecoverResult {
	analysis: string
	recovery_strategy?: string | null // Optional strategy description
	next_actions: RecoveryAction[]
	confidence_score?: number | null // Optional confidence score
	// Allow other fields the LLM might return
	[key: string]: any
}

// reasoning/getPersonaContentByName (Request Params)
export interface GetPersonaContentByNameRequest {
	name: string // The name of the persona file (without extension)
}

// reasoning/getPersonaContentByName (Result - Success)
export interface GetPersonaContentByNameResult {
	content: string | null // The content of the persona file, or null if not found
}

// reasoning/replanning (Request Params)
export interface ReplanningRequest {
	task_goal: string
	current_plan_state: BackendChecklist | string // Current plan (structured or stringified)
	agent_state: Record<string, any> | string // Current agent state/history snapshot
	obstacle_description: string // Description of the deviation or obstacle encountered
}

// reasoning/replanning (Result - Success)
export interface ReplanningResult {
	analysis: string // LLM analysis of the situation
	revised_plan?: BackendChecklist | null // Optional revised plan structure
	suggested_next_step?: string | null // Optional specific next step suggestion
	confidence_score?: number | null // Optional confidence in the replan
	// Allow other fields
	[key: string]: any
}

// --- Knowledge Methods ---

// knowledge/search (Request Params)
export interface KnowledgeSearchParams {
	query: string
	num_docs?: number // Optional number of documents to return
}

// knowledge/search (Result - Success)
export interface KnowledgeSearchResult {
	results: string[] // List of relevant document content strings
}
