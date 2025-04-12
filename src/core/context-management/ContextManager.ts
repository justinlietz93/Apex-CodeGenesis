import { Anthropic } from "@anthropic-ai/sdk"
import { ApexApiReqInfo, ApexMessage } from "../../shared/ExtensionMessage"
import { ApiHandler } from "../../api"
import { OpenAiHandler } from "../../api/providers/openai"

export class ContextManager {
	getNewContextMessagesAndMetadata(
		apiConversationHistory: Anthropic.Messages.MessageParam[],
		apexMessages: ApexMessage[],
		api: ApiHandler,
		conversationHistoryDeletedRange: [number, number] | undefined,
		previousApiReqIndex: number,
	) {
		let updatedConversationHistoryDeletedRange = false
		const currentHistoryLength = apiConversationHistory.length // Get current length

		// If the previous API request's total token usage is close to the context window,
		// or if history is simply very long, truncate the conversation history.
		const shouldTruncate = previousApiReqIndex >= 0 || currentHistoryLength > 50 // Example: Trigger also if history > 50 messages

		if (shouldTruncate) {
			let needsTruncationBasedOnTokens = false
			if (previousApiReqIndex >= 0) {
				const previousRequest = apexMessages[previousApiReqIndex]
				if (previousRequest && previousRequest.text) {
					try {
						const { tokensIn, tokensOut, cacheWrites, cacheReads }: ApexApiReqInfo = JSON.parse(previousRequest.text)
						const totalTokens = (tokensIn || 0) + (tokensOut || 0) + (cacheWrites || 0) + (cacheReads || 0)
						let contextWindow = api.getModel().info.contextWindow || 128_000
						// FIXME: hack to get anyone using openai compatible with deepseek to have the proper context window instead of the default 128k. We need a way for the user to specify the context window for models they input through openai compatible
						if (api instanceof OpenAiHandler && api.getModel().id.toLowerCase().includes("deepseek")) {
							contextWindow = 64_000
						}
						let maxAllowedSize: number
						switch (contextWindow) {
							case 64_000: // deepseek models
								maxAllowedSize = contextWindow - 27_000
								break
							case 128_000: // most models
								maxAllowedSize = contextWindow - 30_000
								break
							case 200_000: // claude models
								maxAllowedSize = contextWindow - 40_000
								break
							default:
								maxAllowedSize = Math.max(contextWindow - 40_000, contextWindow * 0.8)
						}
						if (totalTokens >= maxAllowedSize) {
							needsTruncationBasedOnTokens = true
						}
					} catch (e) {
						console.error("Failed to parse previous API request tokens:", e)
						// Proceed with length-based truncation if parsing fails
					}
				}
			}

			// Decide if truncation is needed based on tokens OR length
			if (needsTruncationBasedOnTokens || currentHistoryLength > 50) {
				console.log(
					`[ContextManager] Truncation needed. Reason: ${needsTruncationBasedOnTokens ? "Token Limit Approaching" : "History Length Exceeded"}. History length: ${currentHistoryLength}`,
				)
				// Determine how much to keep (simple strategy for now)
				const keepRatio = needsTruncationBasedOnTokens ? 0.25 : 0.5 // Keep less if token limit is the issue

				conversationHistoryDeletedRange = this.getNextTruncationRange(
					apiConversationHistory,
					conversationHistoryDeletedRange,
					keepRatio, // Pass ratio instead of "half"/"quarter"
				)
				updatedConversationHistoryDeletedRange = true
			}
		} // End if (shouldTruncate)

		// conversationHistoryDeletedRange is updated only when we're close to hitting the context window, so we don't continuously break the prompt cache
		const truncatedConversationHistory = this.getTruncatedMessages(apiConversationHistory, conversationHistoryDeletedRange)

		return {
			conversationHistoryDeletedRange: conversationHistoryDeletedRange,
			updatedConversationHistoryDeletedRange: updatedConversationHistoryDeletedRange,
			truncatedConversationHistory: truncatedConversationHistory,
		}
	}

	public getNextTruncationRange(
		apiMessages: Anthropic.Messages.MessageParam[],
		currentDeletedRange: [number, number] | undefined,
		keepRatio: number = 0.5, // Ratio of *middle* messages to keep (e.g., 0.5 keeps half, 0.25 keeps quarter)
	): [number, number] | undefined {
		// Return undefined if no truncation needed

		const minMessagesToKeep = 6 // Always keep first message + last N turns (e.g., 2 user, 3 assistant)
		const messagesToKeepAtEnd = 4 // Keep last 4 messages (2 turns)

		// Calculate the effective history length excluding the first message and last few messages
		const firstMessageIndex = 0 // Always keep the first message (index 0)
		const lastMessagesStartIndex = Math.max(firstMessageIndex + 1, apiMessages.length - messagesToKeepAtEnd)

		// Determine the range of messages available for truncation (middle section)
		const availableRangeStart = currentDeletedRange ? currentDeletedRange[1] + 1 : firstMessageIndex + 1
		const availableRangeEnd = lastMessagesStartIndex - 1 // Exclusive end index

		const availableMessagesCount = Math.max(0, availableRangeEnd - availableRangeStart + 1)

		if (availableMessagesCount <= 0 || apiMessages.length <= minMessagesToKeep) {
			// Not enough messages in the middle to truncate, or total history too short
			return currentDeletedRange // Return existing range (or undefined)
		}

		// Calculate how many messages to remove from the available middle section
		const messagesToRemoveCount = Math.floor(availableMessagesCount * (1 - keepRatio))

		// Ensure we remove an even number to maintain user/assistant pairs if possible (optional refinement)
		const finalMessagesToRemove =
			messagesToRemoveCount % 2 === 0 ? messagesToRemoveCount : Math.max(0, messagesToRemoveCount - 1)

		if (finalMessagesToRemove <= 0) {
			return currentDeletedRange // No messages to remove after adjustment
		}

		// Calculate the new end index for the deleted range
		// Start removing from availableRangeStart
		let newRangeEndIndex = availableRangeStart + finalMessagesToRemove - 1

		// Ensure the end index doesn't exceed the available range
		newRangeEndIndex = Math.min(newRangeEndIndex, availableRangeEnd)

		// Ensure the range ends on a user message if possible (to keep pairs intact)
		// Check the message *after* the proposed end index
		if (
			newRangeEndIndex + 1 < apiMessages.length &&
			apiMessages[newRangeEndIndex + 1]?.role === "user" &&
			newRangeEndIndex >= availableRangeStart
		) {
			// If the message *after* the deleted range is 'user', the last deleted message was 'assistant'.
			// To end on a 'user' message, we need to remove one less.
			newRangeEndIndex = Math.max(availableRangeStart - 1, newRangeEndIndex - 1) // Adjust, ensuring it doesn't go below start
		}

		// The new range starts after the first message (index 0)
		const newRangeStartIndex = firstMessageIndex + 1

		// Ensure start index is less than or equal to end index
		if (newRangeStartIndex > newRangeEndIndex) {
			console.warn("[ContextManager] Calculated invalid truncation range, skipping truncation.")
			return currentDeletedRange
		}

		console.log(`[ContextManager] Calculated new truncation range: [${newRangeStartIndex}, ${newRangeEndIndex}]`)
		// TODO: Implement summarization call here if desired, using messages from newRangeStartIndex to newRangeEndIndex
		// const messagesToSummarize = apiMessages.slice(newRangeStartIndex, newRangeEndIndex + 1);
		// const summary = await callSummarizationApi(messagesToSummarize);
		// Instead of returning a range, could return modified history with summary block.

		return [newRangeStartIndex, newRangeEndIndex]
	}

	public getTruncatedMessages(
		messages: Anthropic.Messages.MessageParam[],
		deletedRange: [number, number] | undefined,
	): Anthropic.Messages.MessageParam[] {
		if (!deletedRange) {
			return messages
		}

		const [start, end] = deletedRange
		// the range is inclusive - both start and end indices and everything in between will be removed from the final result.
		// NOTE: if you try to console log these, don't forget that logging a reference to an array may not provide the same result as logging a slice() snapshot of that array at that exact moment. The following DOES in fact include the latest assistant message.
		return [...messages.slice(0, start), ...messages.slice(end + 1)]
	}
}
