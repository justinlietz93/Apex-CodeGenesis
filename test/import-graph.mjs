#!/usr/bin/env node
import { spawnSync } from "child_process"

const cmds = [
	// quick sanity: ESM path
	["node", ["scripts/plutonium.js", "--help"]],
	// quick sanity: CJS path
	["node", ["scripts/plutonium.cjs", "--help"]],
]

for (const [cmd, args] of cmds) {
	console.log(`Running: ${cmd} ${args.join(" ")}`)
	const { status, stderr, stdout } = spawnSync(cmd, args, { stdio: "pipe", encoding: "utf8" })

	if (status !== 0) {
		console.error(`❌ Command failed with status ${status}:`)
		console.error(stderr)
		process.exit(status ?? 1)
	} else {
		console.log(`✅ Command completed successfully`)
		if (process.env.VERBOSE) {
			console.log(stdout)
		}
	}
}

console.log("🎉 All import paths verified successfully!")
