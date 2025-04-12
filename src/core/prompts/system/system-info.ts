import { getShell } from "../../../utils/shell"
import os from "os"
import osName from "os-name"

export const getSystemInfoPrompt = (cwd: string): string => {
	return `
====

SYSTEM INFORMATION

Operating System: ${osName()}
Default Shell: ${getShell()}
Home Directory: ${os.homedir()}
Current Working Directory: ${cwd}`
}
