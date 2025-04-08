import * as vscode from 'vscode';
import axios from 'axios';
import { Controller } from '../index'; // Import Controller type
import { getGlobalState, updateGlobalState } from '../../storage/state'; // Adjust path
import { postMessageToWebview as postMessageToWebviewUtil } from './webview-handler'; // For sending messages
import { ModelInfo } from '../../../shared/api'; // Adjust path
import { GlobalFileNames } from '../../storage/disk'; // Adjust path
import { fileExistsAtPath } from '../../../utils/fs'; // Adjust path
import * as path from 'path';
import * as fs from 'fs/promises';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

/**
 * Fetches available models from the VS Code Language Model API.
 * @returns A list of available VS Code LM models.
 */
export async function getVsCodeLmModels(): Promise<{ vendor?: string; family?: string; version?: string; id?: string }[]> {
    console.log("[ApiHelpers] Fetching VS Code LM models...");
    try {
        // Note: Accessing specific models might require requesting access first.
        // This just lists potentially available models.
        const models = await vscode.lm.selectChatModels(); // Use the VS Code LM API
        console.log(`[ApiHelpers] Found ${models.length} VS Code LM models.`);
        // Map to the expected structure if necessary, selector might already match
        return models.map(m => ({ vendor: m.vendor, family: m.family, version: m.version, id: m.id }));
    } catch (error) {
        console.error("[ApiHelpers] Error fetching VS Code LM models:", error);
        vscode.window.showErrorMessage(`Failed to fetch VS Code LM models: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return [];
    }
}

/**
 * Fetches available models from an Ollama instance.
 * @param baseUrl The base URL of the Ollama instance.
 * @returns A list of Ollama model names.
 */
export async function getOllamaModels(baseUrl?: string): Promise<string[]> {
    const url = baseUrl || 'http://localhost:11434'; // Default URL
    console.log(`[ApiHelpers] Fetching Ollama models from ${url}...`);
    try {
        const response = await axios.get(`${url}/api/tags`);
        const models = response.data?.models?.map((m: any) => m.name) || [];
        console.log(`[ApiHelpers] Found ${models.length} Ollama models.`);
        return models;
    } catch (error) {
        console.error(`[ApiHelpers] Error fetching Ollama models from ${url}:`, error);
        // Don't show error message for automatic fetches, only user-initiated?
        // vscode.window.showErrorMessage(`Failed to fetch Ollama models: ${error.message}`);
        return [];
    }
}

/**
 * Fetches available models from an LM Studio instance.
 * @param baseUrl The base URL of the LM Studio instance.
 * @returns A list of LM Studio model names.
 */
export async function getLmStudioModels(baseUrl?: string): Promise<string[]> {
    const url = baseUrl || 'http://localhost:1234'; // Default URL
    console.log(`[ApiHelpers] Fetching LM Studio models from ${url}...`);
    // LM Studio API endpoint for listing models might differ, assuming a common pattern
    // This endpoint is hypothetical and needs verification against LM Studio's actual API.
    const modelsEndpoint = `${url}/v1/models`;
    try {
        const response = await axios.get(modelsEndpoint);
        // Adjust parsing based on LM Studio's actual API response structure
        const models = response.data?.data?.map((m: any) => m.id) || [];
        console.log(`[ApiHelpers] Found ${models.length} LM Studio models.`);
        return models;
    } catch (error) {
        console.error(`[ApiHelpers] Error fetching LM Studio models from ${url}:`, error);
        // vscode.window.showErrorMessage(`Failed to fetch LM Studio models: ${error.message}`);
        return [];
    }
}

/**
 * Fetches the latest models from OpenRouter and updates the cache and webview.
 * @param controller The main controller instance.
 */
export async function refreshOpenRouterModels(controller: Controller): Promise<void> {
    console.log("[ApiHelpers] Refreshing OpenRouter models...");
    try {
        const response = await axios.get(`${OPENROUTER_API_URL}/models`);
        const modelsData = response.data?.data;

        if (!Array.isArray(modelsData)) {
            throw new Error("Invalid response format from OpenRouter API");
        }

        const models: Record<string, ModelInfo> = {};
        modelsData.forEach((model: any) => {
            // Map relevant fields from OpenRouter response to ModelInfo interface
            // Note: Pricing needs conversion from string cents to number dollars/Mtok
            const inputPrice = model.pricing?.prompt ? parseFloat(model.pricing.prompt) * 10000 : undefined; // Convert cents/tok to $/Mtok
            const outputPrice = model.pricing?.completion ? parseFloat(model.pricing.completion) * 10000 : undefined; // Convert cents/tok to $/Mtok

            models[model.id] = {
                // id: model.id, // ID is the key, not part of the value
                // name: model.name, // Name is not part of ModelInfo
                description: model.description,
                // pricing: model.pricing, // Pricing structure differs
                contextWindow: model.context_length,
                // architecture: model.architecture, // Not part of ModelInfo
                // top_provider: model.top_provider, // Not part of ModelInfo
                // per_request_limits: model.per_request_limits, // Not part of ModelInfo
                // Map other relevant fields if available in OpenRouter response and ModelInfo
                maxTokens: model.architecture?.top_k, // Example: Infer maxTokens if possible (adjust based on actual API)
                supportsImages: model.architecture?.modality === 'multimodal', // Example: Infer image support
                supportsComputerUse: false, // Assume false unless specified otherwise by OpenRouter
                supportsPromptCache: false, // Assume false unless specified otherwise
                inputPrice: inputPrice,
                outputPrice: outputPrice,
                // cacheWritesPrice and cacheReadsPrice are not directly available from OpenRouter standard response
            };
        });

        // Save to disk cache
        const taskDir = await ensureTaskDirectoryExists(controller.context, 'global_cache'); // Use a dedicated cache dir
        const filePath = path.join(taskDir, GlobalFileNames.openRouterModels);
        await fs.writeFile(filePath, JSON.stringify(models));
        console.log("[ApiHelpers] OpenRouter models cached to disk.");

        // Update webview
        await postMessageToWebviewUtil(controller.webviewProviderRef, { type: "openRouterModels", openRouterModels: models });
        console.log("[ApiHelpers] OpenRouter models refreshed and sent to webview.");

    } catch (error) {
        console.error("[ApiHelpers] Error refreshing OpenRouter models:", error);
        vscode.window.showErrorMessage(`Failed to refresh OpenRouter models: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Optionally load from cache if fetch fails
        const cachedModels = await readOpenRouterModels(controller);
        if (cachedModels) {
            await postMessageToWebviewUtil(controller.webviewProviderRef, { type: "openRouterModels", openRouterModels: cachedModels });
        }
    }
}

/**
 * Fetches available models from the OpenAI API (or compatible endpoint).
 * @param baseUrl The base URL for the OpenAI-compatible API.
 * @param apiKey The API key.
 * @returns A list of OpenAI model IDs.
 */
export async function getOpenAiModels(baseUrl?: string, apiKey?: string): Promise<string[]> {
    const url = baseUrl || 'https://api.openai.com/v1'; // Default OpenAI URL
    console.log(`[ApiHelpers] Fetching OpenAI models from ${url}...`);
    if (!apiKey) {
        console.warn("[ApiHelpers] OpenAI API key not provided.");
        // Optionally show a warning to the user if triggered manually
        // vscode.window.showWarningMessage("OpenAI API key is missing. Please configure it in settings.");
        return [];
    }
    try {
        const response = await axios.get(`${url}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const models = response.data?.data?.map((m: any) => m.id) || [];
        console.log(`[ApiHelpers] Found ${models.length} OpenAI models.`);
        return models;
    } catch (error) {
        console.error(`[ApiHelpers] Error fetching OpenAI models from ${url}:`, error);
        // vscode.window.showErrorMessage(`Failed to fetch OpenAI models: ${error.message}`);
        return [];
    }
}

/**
 * Reads cached OpenRouter models from disk.
 * @param controller The main controller instance.
 * @returns The cached models or undefined if cache doesn't exist or is invalid.
 */
export async function readOpenRouterModels(controller: Controller): Promise<Record<string, ModelInfo> | undefined> {
    try {
        const taskDir = await ensureTaskDirectoryExists(controller.context, 'global_cache');
        const filePath = path.join(taskDir, GlobalFileNames.openRouterModels);
        if (await fileExistsAtPath(filePath)) {
            const content = await fs.readFile(filePath, 'utf8');
            const models = JSON.parse(content);
            // Basic validation
            if (typeof models === 'object' && models !== null) {
                console.log("[ApiHelpers] Read OpenRouter models from cache.");
                return models;
            }
        }
    } catch (error) {
        console.error("[ApiHelpers] Error reading OpenRouter models cache:", error);
    }
    console.log("[ApiHelpers] OpenRouter models cache not found or invalid.");
    return undefined;
}

// Helper function to ensure a directory exists (could be moved to a fs utils file)
async function ensureTaskDirectoryExists(context: vscode.ExtensionContext, taskId: string): Promise<string> {
	const globalStoragePath = context.globalStorageUri.fsPath;
	const taskDir = path.join(globalStoragePath, "tasks", taskId); // Assuming tasks are stored under 'tasks' subdirectory
	await fs.mkdir(taskDir, { recursive: true });
	return taskDir;
}
