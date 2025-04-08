import * as vscode from "vscode";
import { Anthropic } from "@anthropic-ai/sdk";
import { Task } from "../index";
// Import backend protocol types for reasoning
import { GeneratePlanParams, GeneratePlanResult } from "../../../shared/BackendProtocol";
// Import the extracted loop controller
import { recursivelyMakeApexRequests } from "./api_handler/loop-controller";
// Import helpers (though they might not be directly needed here anymore)
// import { formatAssistantContentForHistory, formatErrorWithStatusCode } from "./api_handler/helpers";

// Define UserContent locally if not imported from elsewhere
type UserContent = Array<Anthropic.ContentBlockParam>;

export class ApiHandlerModule {
    private task: Task;

    // State properties managed by this module (passed to loop controller via callbacks)
    // These might be better placed in a dedicated state object if complexity grows
    public isWaitingForFirstChunk = false;
    public didAutomaticallyRetryFailedApiRequest = false;
    public consecutiveMistakeCount: number = 0;
    public consecutiveAutoApprovedRequestsCount: number = 0;
    public consecutiveRecoveryFailures: number = 0; // Added for Step 5.7.1
    public didFinishAbortingStream = false; // May still be needed by Task?

    // --- Task 4.2: Autonomy State ---
    public currentAutonomyMode: 'turnBased' | 'stepLimited' | 'full' = 'turnBased';
    public maxAutonomousSteps: number = 5;
    public autonomousStepsRemaining: number = 0;
    public taskGoal: string | null = null;
    public isTaskComplete: boolean = false;


    constructor(taskInstance: Task) {
        this.task = taskInstance;
    }

     // Method to initiate the task loop (called by startTask/resumeTask)
     async initiateTaskLoop(userContent: UserContent): Promise<void> {
        // Reset state specific to this module before starting a new loop
        this.isWaitingForFirstChunk = false;
        this.didAutomaticallyRetryFailedApiRequest = false;
        this.consecutiveMistakeCount = 0;
        this.consecutiveAutoApprovedRequestsCount = 0;
        this.didFinishAbortingStream = false;

        // --- Task 4.1 Integration: Generate Plan ---
        let initialGoal: string | undefined;
        try {
            const firstTextBlock = userContent.find(block => block.type === 'text') as Anthropic.TextBlockParam | undefined;
            initialGoal = firstTextBlock?.text?.replace(/<\/?task>/g, '').trim();

            // Plan generation logic removed as per previous steps, assuming it's handled elsewhere or not needed now.
        } catch (error) {
            // Keep error handling in case plan generation is re-introduced
            console.error("[ApiHandlerModule] Error during initial goal processing:", error);
            // this.task.webviewCommunicator.say("error", `Error processing initial goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        // --- End Task 4.1 Integration ---

        // --- Task 4.2: Initialize Autonomy Settings ---
        const config = vscode.workspace.getConfiguration("apex.agent");
        this.currentAutonomyMode = config.get<'turnBased' | 'stepLimited' | 'full'>("autonomyMode", "turnBased");
        this.maxAutonomousSteps = config.get<number>("maxAutonomousSteps", 5);
        this.autonomousStepsRemaining = this.maxAutonomousSteps;
        this.taskGoal = this.task.taskGoal || null; // Get goal from Task property
        this.isTaskComplete = false;
        console.log(`[ApiHandlerModule] Initializing task with autonomyMode: ${this.currentAutonomyMode}, maxSteps: ${this.maxAutonomousSteps}`);
        // --- End Task 4.2 ---


        // Call the main recursive loop from the loop-controller module
        // Pass necessary state and state-setting callbacks
        await recursivelyMakeApexRequests(
            this.task,
            this.consecutiveMistakeCount,
            (count) => { this.consecutiveMistakeCount = count; },
            this.consecutiveAutoApprovedRequestsCount,
            (count) => { this.consecutiveAutoApprovedRequestsCount = count; },
            this.didAutomaticallyRetryFailedApiRequest,
            (value) => { this.didAutomaticallyRetryFailedApiRequest = value; },
            this.consecutiveRecoveryFailures, // Pass new state
            (count: number) => { this.consecutiveRecoveryFailures = count; }, // Pass new setter
            // Pass autonomy state
            this.currentAutonomyMode,
            this.maxAutonomousSteps,
            this.autonomousStepsRemaining,
            (count: number) => { this.autonomousStepsRemaining = count; }, // Add type annotation
            this.isTaskComplete,
            (value: boolean) => { this.isTaskComplete = value; },
            userContent,
            true // includeFileDetails for the first call
        );

        // The loop controller now handles the main logic.
        // This module primarily holds state and initiates the loop.
    }
}
