import { VSCodeButton, VSCodeDivider, VSCodeLink, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useCallback, useEffect, useState } from "react"
import { useEvent } from "react-use"
import { ExtensionMessage } from "../../../../src/shared/ExtensionMessage"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { validateApiConfiguration } from "../../utils/validate"
import { vscode } from "../../utils/vscode"
import ApiOptions from "../settings/ApiOptions"
import ApexLogoWhite from "../../assets/ApexLogoWhite"

const WelcomeView = () => {
	const { apiConfiguration } = useExtensionState()
	const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(undefined)
	// Show API options by default now
	// const [showApiOptions, setShowApiOptions] = useState(false)

	const disableLetsGoButton = apiErrorMessage != null

	const handleLogin = () => {
		vscode.postMessage({ type: "accountLoginClicked" })
	}

	const handleSubmit = () => {
		vscode.postMessage({ type: "apiConfiguration", apiConfiguration })
	}

	useEffect(() => {
		setApiErrorMessage(validateApiConfiguration(apiConfiguration))
	}, [apiConfiguration])

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				padding: "0 0px",
				display: "flex",
				flexDirection: "column",
			}}>
			<div
				style={{
					height: "100%",
					padding: "0 20px",
					overflow: "auto",
				}}>
				<h2>Hi, I'm Apex</h2>
				<div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
					<ApexLogoWhite className="size-16" />
				</div>
				<p>
					Leveraging advanced agentic capabilities, I can perform complex software engineering tasks, including:
					<ul>
						<li>End-to-end project generation and completion</li>
						<li>Comprehensive code analysis, debugging, and testing</li>
						<li>Recursive chain-of-thought reasoning for complex problem-solving</li>
						<li>Dynamic persona utilization for specialized task handling</li>
						<li>Full autonomy modes for independent operation</li>
					</ul>
					I utilize a suite of tools for file manipulation, code execution, browsing, and can be extended via the Model
					Context Protocol (MCP).
				</p>

				<p style={{ color: "var(--vscode-descriptionForeground)" }}>
					Configure an API provider below or sign up/log in for managed access.
				</p>

				{/* Show API Options by default */}
				<div style={{ marginTop: "18px" }}>
					<ApiOptions showModelOptions={false} />
					<VSCodeButton
						onClick={handleSubmit}
						disabled={disableLetsGoButton}
						style={{ marginTop: "10px", width: "100%" }}
						appearance="primary">
						Let's go!
					</VSCodeButton>
				</div>

				<VSCodeDivider style={{ margin: "20px 0" }} />

				{/* Secondary option for login */}
				<div style={{ textAlign: "center", marginTop: "10px" }}>
					<span style={{ color: "var(--vscode-descriptionForeground)", marginRight: "5px" }}>Or</span>
					<VSCodeLink href="#" onClick={handleLogin} style={{ display: "inline" }}>
						sign up / log in
					</VSCodeLink>
					<span style={{ color: "var(--vscode-descriptionForeground)", marginLeft: "5px" }}>
						to get started for free.
					</span>
				</div>
			</div>
		</div>
	)
}

export default WelcomeView
