#!/usr/bin/env node
const { createRequire } = require("module")
const requireEsm = createRequire(__filename)
requireEsm("./esbuild.cjs")
