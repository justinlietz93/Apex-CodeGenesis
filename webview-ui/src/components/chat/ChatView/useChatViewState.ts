import { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { useDeepCompareEffect } from 'react-use';
import { ApexMessage, ApexAsk, ApexSayTool } from '../../../../../src/shared/ExtensionMessage'; // Added ApexSayTool

export const useChatViewState = (messages: ApexMessage[]) => {
  const [apexAsk, setApexAsk] = useState<ApexAsk | undefined>(undefined);
  const [enableButtons, setEnableButtons] = useState<boolean>(false);
  const [primaryButtonText, setPrimaryButtonText] = useState<string | undefined>("Approve");
  const [secondaryButtonText, setSecondaryButtonText] = useState<string | undefined>("Reject");
  const [didClickCancel, setDidClickCancel] = useState(false);

  // Logic moved from ChatView.tsx
  const lastMessage = useMemo(() => messages.at(-1), [messages]);
  const secondLastMessage = useMemo(() => messages.at(-2), [messages]);

  useDeepCompareEffect(() => {
		// if last message is an ask, show user ask UI
		// if user finished a task, then start a new task with a new conversation history since in this moment that the extension is waiting for user response, the user could close the extension and the conversation history would be lost.
		// basically as long as a task is active, the conversation history will be persisted
		if (lastMessage) {
			switch (lastMessage.type) {
				case "ask":
					const isPartial = lastMessage.partial === true
					switch (lastMessage.ask) {
						case "api_req_failed":
							// setTextAreaDisabled(true) // Handled elsewhere
							setApexAsk("api_req_failed")
							setEnableButtons(true)
							setPrimaryButtonText("Retry")
							setSecondaryButtonText("Start New Task")
							break
						case "mistake_limit_reached":
							// setTextAreaDisabled(false) // Handled elsewhere
							setApexAsk("mistake_limit_reached")
							setEnableButtons(true)
							setPrimaryButtonText("Proceed Anyways")
							setSecondaryButtonText("Start New Task")
							break
						case "auto_approval_max_req_reached":
							// setTextAreaDisabled(true) // Handled elsewhere
							setApexAsk("auto_approval_max_req_reached")
							setEnableButtons(true)
							setPrimaryButtonText("Proceed")
							setSecondaryButtonText("Start New Task")
							break
						case "followup":
							// setTextAreaDisabled(isPartial) // Handled elsewhere
							setApexAsk("followup")
							setEnableButtons(false)
							// setPrimaryButtonText(undefined)
							// setSecondaryButtonText(undefined)
							break
						case "plan_mode_respond":
							// setTextAreaDisabled(isPartial) // Handled elsewhere
							setApexAsk("plan_mode_respond")
							setEnableButtons(false)
							// setPrimaryButtonText(undefined)
							// setSecondaryButtonText(undefined)
							break
						case "tool":
							// setTextAreaDisabled(isPartial) // Handled elsewhere
							setApexAsk("tool")
							setEnableButtons(!isPartial)
							const tool = JSON.parse(lastMessage.text || "{}") as ApexSayTool
							switch (tool.tool) {
								case "editedExistingFile":
								case "newFileCreated":
									setPrimaryButtonText("Save")
									setSecondaryButtonText("Reject")
									break
								default:
									setPrimaryButtonText("Approve")
									setSecondaryButtonText("Reject")
									break
							}
							break
						case "browser_action_launch":
							// setTextAreaDisabled(isPartial) // Handled elsewhere
							setApexAsk("browser_action_launch")
							setEnableButtons(!isPartial)
							setPrimaryButtonText("Approve")
							setSecondaryButtonText("Reject")
							break
						case "command":
							// setTextAreaDisabled(isPartial) // Handled elsewhere
							setApexAsk("command")
							setEnableButtons(!isPartial)
							setPrimaryButtonText("Run Command")
							setSecondaryButtonText("Reject")
							break
						case "command_output":
							// setTextAreaDisabled(false) // Handled elsewhere
							setApexAsk("command_output")
							setEnableButtons(true)
							setPrimaryButtonText("Proceed While Running")
							setSecondaryButtonText(undefined)
							break
						case "use_mcp_server":
							// setTextAreaDisabled(isPartial) // Handled elsewhere
							setApexAsk("use_mcp_server")
							setEnableButtons(!isPartial)
							setPrimaryButtonText("Approve")
							setSecondaryButtonText("Reject")
							break
						case "completion_result":
							// extension waiting for feedback. but we can just present a new task button
							// setTextAreaDisabled(isPartial) // Handled elsewhere
							setApexAsk("completion_result")
							setEnableButtons(!isPartial)
							setPrimaryButtonText("Start New Task")
							setSecondaryButtonText(undefined)
							break
						case "resume_task":
							// setTextAreaDisabled(false) // Handled elsewhere
							setApexAsk("resume_task")
							setEnableButtons(true)
							setPrimaryButtonText("Resume Task")
							setSecondaryButtonText(undefined)
							setDidClickCancel(false) // special case where we reset the cancel button state
							break
						case "resume_completed_task":
							// setTextAreaDisabled(false) // Handled elsewhere
							setApexAsk("resume_completed_task")
							setEnableButtons(true)
							setPrimaryButtonText("Start New Task")
							setSecondaryButtonText(undefined)
							setDidClickCancel(false)
							break
					}
					break
				case "say":
					// don't want to reset since there could be a "say" after an "ask" while ask is waiting for response
					switch (lastMessage.say) {
						case "api_req_started":
							if (secondLastMessage?.ask === "command_output") {
								// if the last ask is a command_output, and we receive an api_req_started, then that means the command has finished and we don't need input from the user anymore (in every other case, the user has to interact with input field or buttons to continue, which does the following automatically)
								// setInputValue("") // Handled elsewhere
								// setTextAreaDisabled(true) // Handled elsewhere
								// setSelectedImages([]) // Handled elsewhere
								setApexAsk(undefined)
								setEnableButtons(false)
							}
							break
						case "task":
						case "error":
						case "api_req_finished":
						case "text":
						case "browser_action":
						case "browser_action_result":
						case "browser_action_launch":
						case "command":
						case "use_mcp_server":
						case "command_output":
						case "mcp_server_request_started":
						case "mcp_server_response":
						case "completion_result":
						case "tool":
							break
					}
					break
			}
		} else {
			// This case is handled by the useEffect below based on messages.length
		}
	}, [lastMessage, secondLastMessage]);

  // Effect to reset state when messages are cleared (new task starts)
  useEffect(() => {
		if (messages.length === 0) {
			// setTextAreaDisabled(false) // Handled elsewhere
			setApexAsk(undefined)
			setEnableButtons(false)
			setPrimaryButtonText("Approve")
			setSecondaryButtonText("Reject")
		}
	}, [messages.length]);


  return {
    apexAsk,
    enableButtons,
    primaryButtonText,
    secondaryButtonText,
    didClickCancel,
    setApexAsk, // Expose setters if needed by other components/hooks
    setEnableButtons,
    setPrimaryButtonText,
    setSecondaryButtonText,
    setDidClickCancel,
  };
};
