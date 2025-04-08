# Getting Started with Apex | New Coders

Welcome to Apex! This guide will help you get set up and start using Apex to build your first project.

## What You'll Need

Before you begin, make sure you have the following:

-   **VS Code:** A free, powerful code editor.
    -   [Download VS Code](https://code.visualstudio.com/)
-   **Development Tools:** Essential software for coding (Homebrew, Node.js, Git, etc.).
    -   Follow our [Installing Essential Development Tools](installing-dev-essentials.md) guide to set these up with Apex's help (after getting setup here)
    -   Apex will guide you through installing everything you need
-   **Apex Projects Folder:** A dedicated folder for all your Apex projects.
    -   On macOS: Create a folder named "Apex" in your Documents folder
        -   Path: `/Users/[your-username]/Documents/Apex`
    -   On Windows: Create a folder named "Apex" in your Documents folder
        -   Path: `C:\Users\[your-username]\Documents\Apex`
    -   Inside this Apex folder, create separate folders for each project
        -   Example: `Documents/Apex/workout-app` for a workout tracking app
        -   Example: `Documents/Apex/portfolio-website` for your portfolio
-   **Apex Extension in VS Code:** The Apex extension installed in VS Code.

-   Here's a [tutorial](https://www.youtube.com/watch?v=N4td-fKhsOQ) on everything you need to get started.

## Step-by-Step Setup

Follow these steps to get Apex up and running:

1. **Open VS Code:** Launch the VS Code application. If VS Code shows "Running extensions might...", click "Allow".

2. **Open Your Apex Folder:** In VS Code, open the Apex folder you created in Documents.

3. **Navigate to Extensions:** Click on the Extensions icon in the Activity Bar on the side of VS Code.

4. **Search for 'Apex':** In the Extensions search bar, type "Apex".

5. **Install the Extension:** Click the "Install" button next to the Apex extension.

6. **Open Apex:** Once installed, you can open Apex in a few ways:
    - Click the Apex icon in the Activity Bar.
    - Use the command palette (`CMD/CTRL + Shift + P`) and type "Apex: Open In New Tab" to open Apex as a tab in your editor. This is recommended for a better view.
    - **Troubleshooting:** If you don't see the Apex icon, try restarting VS Code.
    - **What You'll See:** You should see the Apex chat window appear in your VS Code editor.


## Setting up OpenRouter API Key

Now that you have Apex installed, you'll need to set up your OpenRouter API key to use Apex's full capabilities.

1.  **Get your OpenRouter API Key:**
    -   [Get your OpenRouter API Key](https://openrouter.ai/)
2.  **Input Your OpenRouter API Key:**
    -   Navigate to the settings button in the Apex extension.
    -   Input your OpenRouter API key.
    -   Select your preferred API model.
        -   **Recommended Models for Coding:**
            -   `anthropic/claude-3.5-sonnet`: Most used for coding tasks.
            -   `google/gemini-2.0-flash-exp:free`: A free option for coding.
            -   `deepseek/deepseek-chat`: SUPER CHEAP, almost as good as 3.5 sonnet
        -   [OpenRouter Model Rankings](https://openrouter.ai/rankings/programming)

## Your First Interaction with Apex

Now you're ready to start building with Apex. Let's create your first project folder and build something! Copy and paste the following prompt into the Apex chat window:

```
Hey Apex! Could you help me create a new project folder called "hello-world" in my Apex directory and make a simple webpage that says "Hello World" in big blue text?
```

**What You'll See:** Apex will help you create the project folder and set up your first webpage.

## Tips for Working with Apex

-   **Ask Questions:** If you're unsure about something, don't hesitate to ask Apex!
-   **Use Screenshots:** Apex can understand images, so feel free to use screenshots to show him what you're working on.
-   **Copy and Paste Errors:** If you encounter errors, copy and paste the error messages into Apex's chat. This will help him understand the issue and provide a solution.
-   **Speak Plainly:** Apex is designed to understand plain, non-technical language. Feel free to describe your ideas in your own words, and Apex will translate them into code.

## FAQs

-   **What is the Terminal?** The terminal is a text-based interface for interacting with your computer. It allows you to run commands to perform various tasks, such as installing packages, running scripts, and managing files. Apex uses the terminal to execute commands and interact with your development environment.
-   **How Does the Codebase Work?** (This section will be expanded based on common questions from new coders)
