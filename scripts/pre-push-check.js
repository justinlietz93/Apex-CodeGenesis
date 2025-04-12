#!/usr/bin/env node
/**
 * Pre-push check script for Apex CodeGenesis VSCode Extension
 * 
 * This script runs a series of checks before allowing code to be pushed:
 * 1. Type checking
 * 2. Linting
 * 3. Formatting verification
 * 4. Tests
 * 5. Cross-dependency check
 * 6. Build verification
 * 
 * Usage: node scripts/pre-push-check.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for better terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Configuration
const config = {
  skipTests: process.argv.includes('--skip-tests'),
  skipBuild: process.argv.includes('--skip-build'),
  verbose: process.argv.includes('--verbose'),
  fix: process.argv.includes('--fix'),
};

// Track overall success
let allChecksSuccessful = true;
const startTime = Date.now();

/**
 * Utility to run a command and handle its output
 */
function runCommand(command, options = {}) {
  const { label, silent = false, ignoreError = false, cwd = process.cwd() } = options;
  
  if (label && !silent) {
    console.log(`\n${colors.bright}${colors.blue}▶ ${label}${colors.reset}`);
  }
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit',
      cwd
    });
    
    if (silent) return { success: true, output };
    return { success: true };
  } catch (error) {
    if (ignoreError) {
      return { success: false, error: error.message };
    }
    
    if (silent) {
      console.error(`${colors.red}✖ ${label || command} failed:${colors.reset}\n${error.stdout || error.message}`);
      allChecksSuccessful = false;
      return { success: false, error: error.message, stdout: error.stdout, stderr: error.stderr };
    }
    
    console.error(`${colors.red}✖ ${label || command} failed${colors.reset}`);
    allChecksSuccessful = false;
    return { success: false };
  }
}

/**
 * Run a check with proper formatting and error handling
 */
function runCheck(name, fn) {
  console.log(`\n${colors.bright}${colors.blue}=== ${name} ===${colors.reset}`);
  const startTime = Date.now();
  
  try {
    const result = fn();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (result === false) {
      console.log(`${colors.red}✖ ${name} failed ${colors.dim}(${duration}s)${colors.reset}`);
      allChecksSuccessful = false;
    } else {
      console.log(`${colors.green}✓ ${name} passed ${colors.dim}(${duration}s)${colors.reset}`);
    }
    return result;
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`${colors.red}✖ ${name} failed with an error ${colors.dim}(${duration}s)${colors.reset}`);
    console.error(`  ${colors.red}${error.message}${colors.reset}`);
    allChecksSuccessful = false;
    return false;
  }
}

/**
 * Check for uncommitted changes
 */
function checkForUncommittedChanges() {
  const { output } = runCommand('git status --porcelain', { silent: true });
  
  if (output && output.trim()) {
    console.log(`${colors.yellow}⚠ You have uncommitted changes:${colors.reset}`);
    console.log(output);
    return true; // Return true even with uncommitted changes
  }
  
  return true;
}

/**
 * Type checking for both main extension and webview
 */
function runTypeCheck() {
  const mainResult = runCommand('npm run check-types', {
    label: 'Type checking main extension'
  });
  
  const webviewResult = runCommand('cd webview-ui && npm run check-types', {
    label: 'Type checking webview UI',
    ignoreError: true
  });
  
  // For webview-ui, check if the script exists and if not, run tsc directly
  if (!webviewResult.success) {
    console.log(`${colors.yellow}⚠ No explicit check-types script in webview-ui, attempting direct tsc check${colors.reset}`);
    runCommand('cd webview-ui && npx tsc --noEmit', {
      label: 'Type checking webview UI (direct)'
    });
  }
  
  return mainResult.success;
}

/**
 * Run linting
 */
function runLinting() {
  // Fix lint issues if requested
  if (config.fix) {
    runCommand('npm run lint -- --fix', {
      label: 'Fixing linting issues in main extension'
    });
  }
  
  const mainResult = runCommand('npm run lint', {
    label: 'Linting main extension'
  });
  
  // Check if webview has a lint script
  const webviewPackageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'webview-ui', 'package.json'), 'utf8'));
  
  if (webviewPackageJson.scripts && webviewPackageJson.scripts.lint) {
    if (config.fix) {
      runCommand('cd webview-ui && npm run lint -- --fix', {
        label: 'Fixing linting issues in webview UI'
      });
    }
    
    const webviewResult = runCommand('cd webview-ui && npm run lint', {
      label: 'Linting webview UI'
    });
    
    return mainResult.success && webviewResult.success;
  }
  
  return mainResult.success;
}

/**
 * Verify code formatting
 */
function checkFormatting() {
  // Fix formatting issues if requested
  if (config.fix) {
    runCommand('npm run format:fix', {
      label: 'Fixing formatting issues'
    });
    return true;
  }
  
  return runCommand('npm run format', {
    label: 'Checking code formatting'
  }).success;
}

/**
 * Check Python dependencies
 */
function checkPythonDependencies() {
  const pythonReqPath = path.join(process.cwd(), 'python_backend', 'requirements.txt');
  
  if (!fs.existsSync(pythonReqPath)) {
    console.log(`${colors.yellow}⚠ No Python requirements.txt found, skipping Python dependency check${colors.reset}`);
    return true;
  }
  
  // Check if requirements.txt has unpinned dependencies
  const requirements = fs.readFileSync(pythonReqPath, 'utf8');
  const lines = requirements.split('\n');
  const unpinnedDeps = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    // Skip comments and empty lines
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;
    
    // Check if line has a pinned version (==)
    if (!trimmedLine.includes('==')) {
      unpinnedDeps.push(trimmedLine.split('#')[0].trim());
    }
  }
  
  if (unpinnedDeps.length > 0) {
    console.log(`${colors.yellow}⚠ Found ${unpinnedDeps.length} unpinned Python dependencies:${colors.reset}`);
    unpinnedDeps.forEach(dep => console.log(`  - ${dep}`));
    console.log(`${colors.yellow}Consider pinning these dependencies for better security and reproducibility.${colors.reset}`);
  }
  
  // Run the cross-dependency check script if it exists
  const crossDepScriptPath = path.join(process.cwd(), 'scripts', 'check-cross-deps.js');
  if (fs.existsSync(crossDepScriptPath)) {
    console.log(`${colors.cyan}ℹ Running cross-language dependency check${colors.reset}`);
    runCommand('node scripts/check-cross-deps.js', {
      label: 'Analyzing cross-language dependencies',
      ignoreError: true  // We don't want this to fail the push
    });
  }
  
  return true;  // Return true as this is a warning, not an error
}

/**
 * Run tests if not skipped
 */
function runTests() {
  if (config.skipTests) {
    console.log(`${colors.yellow}⚠ Skipping tests (--skip-tests flag used)${colors.reset}`);
    return true;
  }
  
  const mainResult = runCommand('npm run test', {
    label: 'Running extension tests'
  });
  
  // Check if webview-ui has tests
  const webviewPackageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'webview-ui', 'package.json'), 'utf8'));
  
  if (webviewPackageJson.scripts && webviewPackageJson.scripts.test) {
    const webviewResult = runCommand('cd webview-ui && npm run test', {
      label: 'Running webview UI tests'
    });
    
    return mainResult.success && webviewResult.success;
  }
  
  return mainResult.success;
}

/**
 * Verify build process
 */
function verifyBuild() {
  if (config.skipBuild) {
    console.log(`${colors.yellow}⚠ Skipping build verification (--skip-build flag used)${colors.reset}`);
    return true;
  }
  
  // Build the webview first
  const webviewResult = runCommand('npm run build:webview', {
    label: 'Building webview UI'
  });
  
  if (!webviewResult.success) {
    return false;
  }
  
  // Then build the extension
  const extensionResult = runCommand('node esbuild.js', {
    label: 'Building extension'
  });
  
  return extensionResult.success;
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.bright}${colors.cyan}🔍 APEX PRE-PUSH VERIFICATION${colors.reset}`);
  console.log(`${colors.dim}Running pre-push checks to verify code quality...${colors.reset}`);
  
  if (config.fix) {
    console.log(`${colors.yellow}ℹ Running in FIX mode: will attempt to automatically fix issues${colors.reset}`);
  }
  
  // Run all checks
  runCheck('Check for uncommitted changes', checkForUncommittedChanges);
  runCheck('Type checking', runTypeCheck);
  runCheck('Linting', runLinting);
  runCheck('Formatting', checkFormatting);
  runCheck('Python dependency check', checkPythonDependencies);
  runCheck('Tests', runTests);
  runCheck('Build verification', verifyBuild);
  
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  if (allChecksSuccessful) {
    console.log(`\n${colors.green}${colors.bright}✓ All checks passed successfully! ${colors.reset}${colors.dim}(${totalDuration}s)${colors.reset}`);
    console.log(`${colors.bright}${colors.green}Ready to push! 🚀${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bright}✖ Some checks failed. ${colors.reset}${colors.dim}(${totalDuration}s)${colors.reset}`);
    console.log(`${colors.yellow}Please fix the issues before pushing your changes.${colors.reset}`);
    console.log(`${colors.yellow}You can use ${colors.bright}--fix${colors.reset}${colors.yellow} flag to automatically fix some issues.${colors.reset}`);
    process.exit(1);
  }
}

// Run the script
main();