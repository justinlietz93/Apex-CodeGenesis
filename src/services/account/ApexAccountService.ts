import axios, { AxiosRequestConfig, AxiosResponse } from "axios"
import { Controller } from "../../core/controller"
import type { BalanceResponse, PaymentTransaction, UsageTransaction } from "../../shared/ApexAccount"
// Import necessary functions from controller modules
import { getStateToPostToWebview } from "../../core/controller/modules/state-updater";
import { postMessageToWebview } from "../../core/controller/modules/webview-handler";

export class ApexAccountService {
	private readonly baseUrl = "https://api.apex.bot/v1"
	private controllerRef: WeakRef<Controller>

	constructor(controller: Controller) {
		this.controllerRef = new WeakRef(controller)
	}

	/**
	 * Get the user's Apex Account key from the apiConfiguration
	 */
	private async getApexApiKey(): Promise<string | undefined> {
		const provider = this.controllerRef.deref()
		if (!provider) {
			return undefined
		}

		const { apiConfiguration } = await getStateToPostToWebview(provider); // Use imported function
		return apiConfiguration?.apexApiKey
	}

	/**
	 * Helper function to make authenticated requests to the Apex API
	 * @param endpoint The API endpoint to call (without the base URL)
	 * @param config Additional axios request configuration
	 * @returns The API response data
	 * @throws Error if the API key is not found or the request fails
	 */
	private async authenticatedRequest<T>(endpoint: string, config: AxiosRequestConfig = {}): Promise<T> {
		const apexApiKey = await this.getApexApiKey()

		if (!apexApiKey) {
			throw new Error("Apex API key not found")
		}

		const url = `${this.baseUrl}${endpoint}`
		const requestConfig: AxiosRequestConfig = {
			...config,
			headers: {
				Authorization: `Bearer ${apexApiKey}`,
				"Content-Type": "application/json",
				...config.headers,
			},
		}

		const response: AxiosResponse<T> = await axios.get(url, requestConfig)

		if (!response.data) {
			throw new Error(`Invalid response from ${endpoint} API`)
		}

		return response.data
	}

	/**
	 * Fetches the user's current credit balance
	 */
	async fetchBalance(): Promise<BalanceResponse | undefined> {
		try {
			const data = await this.authenticatedRequest<BalanceResponse>("/user/credits/balance")

			// Post to webview
			const controllerForBalance = this.controllerRef.deref();
			if (controllerForBalance) {
				await postMessageToWebview(controllerForBalance.webviewProviderRef, { // Use imported function
					type: "userCreditsBalance",
					userCreditsBalance: data,
				});
			}

			return data
		} catch (error) {
			console.error("Failed to fetch balance:", error)
			return undefined
		}
	}

	/**
	 * Fetches the user's usage transactions
	 */
	async fetchUsageTransactions(): Promise<UsageTransaction[] | undefined> {
		try {
			const data = await this.authenticatedRequest<UsageTransaction[]>("/user/credits/usage")

			// Post to webview
			const controllerForUsage = this.controllerRef.deref();
			if (controllerForUsage) {
				await postMessageToWebview(controllerForUsage.webviewProviderRef, { // Use imported function
					type: "userCreditsUsage",
					userCreditsUsage: data,
				});
			}

			return data
		} catch (error) {
			console.error("Failed to fetch usage transactions:", error)
			return undefined
		}
	}

	/**
	 * Fetches the user's payment transactions
	 */
	async fetchPaymentTransactions(): Promise<PaymentTransaction[] | undefined> {
		try {
			const data = await this.authenticatedRequest<PaymentTransaction[]>("/user/credits/payments")

			// Post to webview
			const controllerForPayments = this.controllerRef.deref();
			if (controllerForPayments) {
				await postMessageToWebview(controllerForPayments.webviewProviderRef, { // Use imported function
					type: "userCreditsPayments",
					userCreditsPayments: data,
				});
			}

			return data
		} catch (error) {
			console.error("Failed to fetch payment transactions:", error)
			return undefined
		}
	}
}
