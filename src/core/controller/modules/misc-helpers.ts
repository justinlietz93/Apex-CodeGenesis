import * as vscode from "vscode"
import axios from "axios"
import * as cheerio from "cheerio" // Use cheerio instead of jsdom
import { Controller } from "../index" // Import Controller type
import { postMessageToWebview as postMessageToWebviewUtil } from "./webview-handler" // For sending messages

/**
 * Fetches Open Graph data for a given URL.
 * @param controller The main controller instance.
 * @param url The URL to fetch Open Graph data from.
 */
export async function fetchOpenGraphData(controller: Controller, url: string): Promise<void> {
	console.log(`[MiscHelpers] Fetching Open Graph data for URL: ${url}`)
	try {
		const response = await axios.get(url, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36", // Common user agent
			},
			timeout: 5000, // 5 second timeout
		})
		const html = response.data
		const $ = cheerio.load(html) // Load HTML into cheerio

		const getMetaTag = (name: string): string | undefined => {
			// Use cheerio selectors
			let content = $(`meta[property='og:${name}']`).attr("content")
			if (!content) {
				content = $(`meta[name='${name}']`).attr("content")
			}
			return content ?? undefined
		}

		const openGraphData = {
			title: getMetaTag("title") || $("title").text(), // Get title tag text as fallback
			description: getMetaTag("description"),
			image: getMetaTag("image"),
			url: getMetaTag("url") || url, // Fallback to original URL
			siteName: getMetaTag("site_name"),
			type: getMetaTag("type"),
		}

		console.log("[MiscHelpers] Open Graph data fetched:", openGraphData)
		await postMessageToWebviewUtil(controller.webviewProviderRef, { type: "openGraphData", url: url, openGraphData })
	} catch (error) {
		console.error(`[MiscHelpers] Error fetching Open Graph data for ${url}:`, error)
		// Send error back to webview if needed
		await postMessageToWebviewUtil(controller.webviewProviderRef, {
			type: "openGraphData",
			url: url,
			error: `Failed to fetch Open Graph data: ${error instanceof Error ? error.message : "Unknown error"}`,
		})
	}
}

/**
 * Checks if a given URL points to an image by sending a HEAD request.
 * @param controller The main controller instance.
 * @param url The URL to check.
 */
export async function checkIsImageUrl(controller: Controller, url: string): Promise<void> {
	console.log(`[MiscHelpers] Checking if URL is image: ${url}`)
	let isImage = false
	try {
		const response = await axios.head(url, { timeout: 3000 }) // 3 second timeout for HEAD request
		const contentType = response.headers["content-type"]
		isImage = contentType?.startsWith("image/") ?? false
		console.log(`[MiscHelpers] URL content type: ${contentType}, Is image: ${isImage}`)
	} catch (error) {
		// HEAD request might fail for various reasons (CORS, method not allowed, timeout)
		// We can potentially try a GET request as a fallback, but that downloads the content.
		// For now, assume it's not an image if HEAD fails.
		console.warn(`[MiscHelpers] HEAD request failed for ${url}:`, error)
		isImage = false
	}
	await postMessageToWebviewUtil(controller.webviewProviderRef, { type: "isImageUrlResult", url: url, isImage })
}
