# Apex API

The Apex extension exposes an API that can be used by other extensions. To use this API in your extension:

1. Copy `src/extension-api/apex.d.ts` to your extension's source directory.
2. Include `apex.d.ts` in your extension's compilation.
3. Get access to the API with the following code:

    ```ts
    const apexExtension = vscode.extensions.getExtension<ApexAPI>("saoudrizwan.claude-dev")

    if (!apexExtension?.isActive) {
    	throw new Error("Apex extension is not activated")
    }

    const apex = apexExtension.exports

    if (apex) {
    	// Now you can use the API

    	// Set custom instructions
    	await apex.setCustomInstructions("Talk like a pirate")

    	// Get custom instructions
    	const instructions = await apex.getCustomInstructions()
    	console.log("Current custom instructions:", instructions)

    	// Start a new task with an initial message
    	await apex.startNewTask("Hello, Apex! Let's make a new project...")

    	// Start a new task with an initial message and images
    	await apex.startNewTask("Use this design language", ["data:image/webp;base64,..."])

    	// Send a message to the current task
    	await apex.sendMessage("Can you fix the @problems?")

    	// Simulate pressing the primary button in the chat interface (e.g. 'Save' or 'Proceed While Running')
    	await apex.pressPrimaryButton()

    	// Simulate pressing the secondary button in the chat interface (e.g. 'Reject')
    	await apex.pressSecondaryButton()
    } else {
    	console.error("Apex API is not available")
    }
    ```

    **Note:** To ensure that the `saoudrizwan.claude-dev` extension is activated before your extension, add it to the `extensionDependencies` in your `package.json`:

    ```json
    "extensionDependencies": [
        "saoudrizwan.claude-dev"
    ]
    ```

For detailed information on the available methods and their usage, refer to the `apex.d.ts` file.
