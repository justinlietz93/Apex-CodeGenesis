#!/usr/bin/env node
/**
 * Cross-Language Dependency Checker
 * 
 * This script identifies potential conflicts and inconsistencies between:
 * 1. Python dependencies (requirements.txt)
 * 2. Main extension npm dependencies (package.json)
 * 3. Webview UI npm dependencies (webview-ui/package.json)
 * 
 * It provides both terminal output and generates a detailed HTML report
 * 
 * Future Plutonium enhancements:
 * - Add support for more language ecosystems (Rust, Go, Java, etc.)
 * - Implement semantic version comparison rather than string comparison
 * - Create a dependency graph visualization to show relationships
 * - Add automated remediation suggestions for conflicts
 * - Integrate with CI/CD pipelines for automated checking
 * - Connect to vulnerability databases to enhance security reporting
 * - Add config file support for custom package name mappings
 * - Support for monorepo structures with multiple package.json files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for terminal output
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
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
};

// Configuration
const CONFIG = {
  // Define paths relative to project root
  ROOT_DIR: path.resolve(__dirname, '..'),
  PYTHON_REQS_PATH: path.join(path.resolve(__dirname, '..'), 'python_backend', 'requirements.txt'),
  MAIN_PKG_PATH: path.join(path.resolve(__dirname, '..'), 'package.json'),
  WEBVIEW_PKG_PATH: path.join(path.resolve(__dirname, '..'), 'webview-ui', 'package.json'),
  
  // Output configuration
  REPORT_DIR: path.join(path.resolve(__dirname, '..'), 'reports'),
  REPORT_FILENAME: 'dependency-report.html',
  
  // Versions to check
  NODEJS_VERSION: process.version,
  
  // Setup timestamp
  TIMESTAMP: new Date().toISOString(),
};

// Known cross-language packages with their name mappings
// Format: { pythonPackage: [npmPackages] }
// Plutonium enhancement: This could be moved to a separate config file
const CROSS_LANGUAGE_MAPPINGS = {
  'openai': ['openai'],
  'anthropic': ['@anthropic-ai/sdk'],
  'numpy': ['numjs', 'numeric'],
  'tensorflow': ['@tensorflow/tfjs'],
  'google-genai': ['@google/generative-ai'],
  'agno': ['agno-js'],
  'requests': ['axios', 'node-fetch', 'got'],
  'pillow': ['sharp', 'jimp'],
  'pandas': ['data-forge', 'danfojs'],
  'matplotlib': ['chart.js', 'd3'],
  'beautifulsoup4': ['cheerio'],
};

// Results container
const results = {
  pythonDeps: {},
  mainDeps: {},
  webviewDeps: {},
  sharedNpmPackages: [],
  npmInconsistencies: [],
  crossLanguageIssues: [],
  systemInfo: {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    timestamp: CONFIG.TIMESTAMP
  }
};

/**
 * Parse Python requirements.txt file
 * 
 * Plutonium enhancement: Add support for pip-compile output format
 * and handle more complex version specifiers
 */
function parsePythonRequirements(filePath) {
  const requirements = {};
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        // Skip comments and empty lines
        if (!line.trim() || line.trim().startsWith('#')) {
          continue;
        }
        
        // Handle lines with comments after the package spec
        const commentSplit = line.split('#')[0].trim();
        
        // Handle package with version spec
        let packageName, versionSpec;
        if (commentSplit.includes('==')) {
          [packageName, versionSpec] = commentSplit.split('==');
          versionSpec = '==' + versionSpec;
        } else if (commentSplit.includes('>=')) {
          [packageName, versionSpec] = commentSplit.split('>=');
          versionSpec = '>=' + versionSpec;
        } else if (commentSplit.includes('<=')) {
          [packageName, versionSpec] = commentSplit.split('<=');
          versionSpec = '<=' + versionSpec;
        } else if (commentSplit.includes('>')) {
          [packageName, versionSpec] = commentSplit.split('>');
          versionSpec = '>' + versionSpec;
        } else if (commentSplit.includes('<')) {
          [packageName, versionSpec] = commentSplit.split('<');
          versionSpec = '<' + versionSpec;
        } else if (commentSplit.includes('~=')) {
          [packageName, versionSpec] = commentSplit.split('~=');
          versionSpec = '~=' + versionSpec;
        } else {
          // No version specified
          packageName = commentSplit;
          versionSpec = 'any';
        }
        
        // Handle extras like json-rpc[tox]
        if (packageName.includes('[')) {
          packageName = packageName.split('[')[0];
        }
        
        packageName = packageName.trim().toLowerCase(); // Normalize package names
        if (packageName) {
          requirements[packageName] = versionSpec ? versionSpec.trim() : 'any';
        }
      }
    }
  } catch (error) {
    console.error(`Error parsing Python requirements: ${error.message}`);
  }
  return requirements;
}

/**
 * Parse npm package.json dependencies
 * 
 * Plutonium enhancement: Also parse optional dependencies and
 * handle workspace/monorepo references
 */
function parseNpmDependencies(filePath) {
  const dependencies = {};
  try {
    if (fs.existsSync(filePath)) {
      const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Combine all dependency types
      const allDeps = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
        ...(packageJson.peerDependencies || {})
      };
      
      for (const [name, version] of Object.entries(allDeps)) {
        // Normalize by removing ^ and ~ to make them directly comparable
        // Plutonium enhancement: Instead of removing, do proper semver comparison
        let cleanVersion = version;
        if (typeof version === 'string') {
          if (version.startsWith('^') || version.startsWith('~')) {
            cleanVersion = version.substring(1);
          }
        }
        
        dependencies[name.toLowerCase()] = cleanVersion; // Normalize package names
      }
    }
  } catch (error) {
    console.error(`Error parsing npm dependencies: ${error.message}`);
  }
  return dependencies;
}

/**
 * Try to detect the active Python version
 * 
 * Plutonium enhancement: Handle virtual environments and more specific
 * Python detection methods
 */
function detectPythonVersion() {
  try {
    // Try different commands as the python command may vary across systems
    const commands = ['python --version', 'python3 --version', 'py --version'];
    
    for (const command of commands) {
      try {
        const output = execSync(command, { encoding: 'utf8' }).trim();
        if (output.includes('Python')) {
          return output.split(' ')[1];
        }
      } catch (e) {
        // Continue to next command if this one fails
      }
    }
    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Check for inconsistencies between two npm environments
 * 
 * Plutonium enhancement: Add detailed comparison showing what changed
 * between versions and if it's a major/minor/patch difference
 */
function checkNpmConsistency(mainDeps, webviewDeps) {
  console.log(`\n${colors.bright}${colors.blue}=== Checking npm dependency consistency ===${colors.reset}`);
  
  const sharedPackages = [];
  for (const pkg in mainDeps) {
    if (webviewDeps[pkg]) {
      sharedPackages.push(pkg);
    }
  }
  
  console.log(`Found ${colors.cyan}${sharedPackages.length}${colors.reset} shared npm packages between main and webview`);
  
  const inconsistencies = [];
  for (const pkg of sharedPackages) {
    if (mainDeps[pkg] !== webviewDeps[pkg]) {
      inconsistencies.push({
        package: pkg,
        mainVersion: mainDeps[pkg],
        webviewVersion: webviewDeps[pkg]
      });
    }
  }
  
  if (inconsistencies.length > 0) {
    console.log(`\n${colors.bright}${colors.yellow}⚠️ Version inconsistencies found between npm environments:${colors.reset}`);
    for (const item of inconsistencies) {
      console.log(`  - ${colors.bright}${item.package}${colors.reset}: main(${colors.cyan}${item.mainVersion}${colors.reset}) vs webview(${colors.magenta}${item.webviewVersion}${colors.reset})`);
    }
  } else {
    console.log(`${colors.green}✅ All shared npm packages have consistent versions!${colors.reset}`);
  }
  
  results.sharedNpmPackages = sharedPackages;
  results.npmInconsistencies = inconsistencies;
}

/**
 * Check for potential cross-language dependency issues
 * 
 * Plutonium enhancement: Add API compatibility checks between 
 * equivalent packages in different languages
 */
function checkCrossLanguageDependencies(pythonDeps, mainDeps, webviewDeps) {
  console.log(`\n${colors.bright}${colors.blue}=== Checking cross-language dependencies ===${colors.reset}`);
  
  const allNpmDeps = {...mainDeps, ...webviewDeps};
  const potentialIssues = [];
  
  for (const [pythonPkg, npmPkgs] of Object.entries(CROSS_LANGUAGE_MAPPINGS)) {
    if (pythonDeps[pythonPkg]) {
      for (const npmPkg of npmPkgs) {
        const normalizedNpmPkg = npmPkg.toLowerCase();
        if (allNpmDeps[normalizedNpmPkg]) {
          potentialIssues.push({
            pythonPackage: pythonPkg,
            pythonVersion: pythonDeps[pythonPkg],
            npmPackage: npmPkg,
            npmVersion: mainDeps[normalizedNpmPkg] || webviewDeps[normalizedNpmPkg],
            environment: mainDeps[normalizedNpmPkg] ? 'main' : 'webview'
          });
        }
      }
    }
  }
  
  if (potentialIssues.length > 0) {
    console.log(`\n${colors.bright}${colors.yellow}⚠️ Potential cross-language dependency conflicts:${colors.reset}`);
    for (const issue of potentialIssues) {
      console.log(`  - Python: ${colors.cyan}${issue.pythonPackage}${colors.reset}@${issue.pythonVersion} / npm(${issue.environment}): ${colors.magenta}${issue.npmPackage}${colors.reset}@${issue.npmVersion}`);
    }
    console.log(`\n   ${colors.dim}ⓘ Review these packages to ensure version compatibility between languages${colors.reset}`);
  } else {
    console.log(`${colors.green}✅ No potential cross-language dependency conflicts detected!${colors.reset}`);
  }
  
  results.crossLanguageIssues = potentialIssues;
}

/**
 * Checks for unpinned Python dependencies
 * 
 * Plutonium enhancement: Integrate with safety/pip audit to check for vulnerabilities
 */
function checkUnpinnedPythonDeps(pythonDeps) {
  console.log(`\n${colors.bright}${colors.blue}=== Checking for unpinned Python dependencies ===${colors.reset}`);
  
  const unpinnedDeps = [];
  
  for (const [pkg, version] of Object.entries(pythonDeps)) {
    if (version === 'any' || !version.startsWith('==')) {
      unpinnedDeps.push({ package: pkg, constraint: version });
    }
  }
  
  if (unpinnedDeps.length > 0) {
    console.log(`\n${colors.bright}${colors.yellow}⚠️ Found ${unpinnedDeps.length} unpinned Python dependencies:${colors.reset}`);
    for (const dep of unpinnedDeps) {
      console.log(`  - ${colors.cyan}${dep.package}${colors.reset} (${dep.constraint})`);
    }
    console.log(`\n   ${colors.dim}ⓘ Consider pinning these dependencies to specific versions for better reproducibility${colors.reset}`);
  } else {
    console.log(`${colors.green}✅ All Python dependencies are properly pinned!${colors.reset}`);
  }
  
  return unpinnedDeps;
}

/**
 * Generate HTML report from results
 * 
 * Plutonium enhancement: Add interactive features, filtering, and 
 * sorting to the HTML report
 */
function generateHTMLReport(results, outputPath) {
  const pythonVersion = detectPythonVersion();
  
  // Calculate statistics for the report
  const stats = {
    pythonDepsCount: Object.keys(results.pythonDeps).length,
    mainDepsCount: Object.keys(results.mainDeps).length,
    webviewDepsCount: Object.keys(results.webviewDeps).length,
    sharedNpmPackagesCount: results.sharedNpmPackages.length,
    npmInconsistenciesCount: results.npmInconsistencies.length,
    crossLanguageIssuesCount: results.crossLanguageIssues.length,
  };
  
  // Count unpinned Python deps
  const unpinnedPythonDeps = [];
  for (const [pkg, version] of Object.entries(results.pythonDeps)) {
    if (version === 'any' || !version.startsWith('==')) {
      unpinnedPythonDeps.push({ package: pkg, constraint: version });
    }
  }
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dependency Analysis Report - ${new Date().toLocaleDateString()}</title>
  <style>
    :root {
      --color-bg: #ffffff;
      --color-text: #333333;
      --color-primary: #3498db;
      --color-secondary: #2ecc71;
      --color-warning: #f39c12;
      --color-danger: #e74c3c;
      --color-info: #95a5a6;
      --color-dark: #2c3e50;
      --color-card: #f8f9fa;
      --color-border: #dee2e6;
    }
    
    @media (prefers-color-scheme: dark) {
      :root {
        --color-bg: #1a1a1a;
        --color-text: #f8f9fa;
        --color-primary: #3498db;
        --color-secondary: #2ecc71;
        --color-warning: #f39c12;
        --color-danger: #e74c3c;
        --color-info: #95a5a6;
        --color-dark: #2c3e50;
        --color-card: #2c2c2c;
        --color-border: #444444;
      }
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", sans-serif;
      line-height: 1.6;
      color: var(--color-text);
      background-color: var(--color-bg);
      margin: 0;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    header {
      margin-bottom: 30px;
      border-bottom: 2px solid var(--color-primary);
      padding-bottom: 10px;
    }
    
    h1, h2, h3, h4 {
      margin-top: 0;
      color: var(--color-primary);
    }
    
    h1 {
      font-size: 28px;
    }
    
    h2 {
      font-size: 24px;
      margin-top: 30px;
    }
    
    .timestamp {
      color: var(--color-info);
      font-size: 14px;
      margin-bottom: 10px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .stat-card {
      background-color: var(--color-card);
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-left: 5px solid var(--color-primary);
    }
    
    .stat-card.warning {
      border-left-color: var(--color-warning);
    }
    
    .stat-card.danger {
      border-left-color: var(--color-danger);
    }
    
    .stat-card.success {
      border-left-color: var(--color-secondary);
    }
    
    .stat-value {
      font-size: 36px;
      font-weight: bold;
      margin: 5px 0;
    }
    
    .stat-label {
      color: var(--color-info);
      font-size: 14px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 14px;
    }
    
    th, td {
      text-align: left;
      padding: 12px;
      border-bottom: 1px solid var(--color-border);
    }
    
    th {
      background-color: var(--color-card);
      font-weight: 600;
    }
    
    tr:nth-child(even) {
      background-color: rgba(0,0,0,0.03);
    }
    
    .tag {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    
    .tag-main {
      background-color: var(--color-primary);
      color: white;
    }
    
    .tag-webview {
      background-color: var(--color-secondary);
      color: white;
    }
    
    .tag-python {
      background-color: var(--color-warning);
      color: white;
    }
    
    .inconsistency {
      color: var(--color-danger);
    }
    
    .section {
      margin-bottom: 40px;
      padding: 20px;
      background-color: var(--color-card);
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .system-info {
      font-size: 14px;
      color: var(--color-info);
      margin-top: 10px;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--color-border);
      text-align: center;
      color: var(--color-info);
      font-size: 14px;
    }
    
    .pill {
      display: inline-block;
      padding: 2px 8px;
      font-size: 12px;
      border-radius: 12px;
    }
    
    .pill-warning {
      background-color: var(--color-warning);
      color: white;
    }
    
    .pill-danger {
      background-color: var(--color-danger);
      color: white;
    }
    
    .pill-success {
      background-color: var(--color-secondary);
      color: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Dependency Analysis Report</h1>
      <div class="timestamp">Generated on ${new Date().toLocaleString()}</div>
      <div class="system-info">
        Node.js: ${results.systemInfo.nodeVersion} | 
        Python: ${pythonVersion} | 
        Platform: ${results.systemInfo.platform}-${results.systemInfo.arch}
      </div>
    </header>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Python Dependencies</div>
        <div class="stat-value">${stats.pythonDepsCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Main Extension Deps</div>
        <div class="stat-value">${stats.mainDepsCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Webview UI Deps</div>
        <div class="stat-value">${stats.webviewDepsCount}</div>
      </div>
      <div class="stat-card ${stats.sharedNpmPackagesCount > 0 ? 'success' : ''}">
        <div class="stat-label">Shared NPM Packages</div>
        <div class="stat-value">${stats.sharedNpmPackagesCount}</div>
      </div>
      <div class="stat-card ${stats.npmInconsistenciesCount > 0 ? 'warning' : 'success'}">
        <div class="stat-label">NPM Inconsistencies</div>
        <div class="stat-value">${stats.npmInconsistenciesCount}</div>
      </div>
      <div class="stat-card ${stats.crossLanguageIssuesCount > 0 ? 'warning' : 'success'}">
        <div class="stat-label">Cross-Language Issues</div>
        <div class="stat-value">${stats.crossLanguageIssuesCount}</div>
      </div>
      <div class="stat-card ${unpinnedPythonDeps.length > 0 ? 'warning' : 'success'}">
        <div class="stat-label">Unpinned Python Deps</div>
        <div class="stat-value">${unpinnedPythonDeps.length}</div>
      </div>
    </div>
    
    <!-- NPM Inconsistencies Section -->
    <section class="section">
      <h2>NPM Package Version Inconsistencies</h2>
      ${results.npmInconsistencies.length > 0 ? `
        <p>The following packages have different versions between the main extension and webview-ui:</p>
        <table>
          <thead>
            <tr>
              <th>Package</th>
              <th>Main Extension</th>
              <th>Webview UI</th>
            </tr>
          </thead>
          <tbody>
            ${results.npmInconsistencies.map(item => `
              <tr>
                <td><strong>${item.package}</strong></td>
                <td>${item.mainVersion}</td>
                <td>${item.webviewVersion}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p>Consider aligning these versions to prevent compatibility issues.</p>
      ` : `
        <p>All shared npm packages have consistent versions. <span class="pill pill-success">✓ Good</span></p>
      `}
    </section>
    
    <!-- Cross-language Issues Section -->
    <section class="section">
      <h2>Cross-Language Dependency Issues</h2>
      ${results.crossLanguageIssues.length > 0 ? `
        <p>The following packages have potential compatibility issues between Python and JavaScript:</p>
        <table>
          <thead>
            <tr>
              <th>Python Package</th>
              <th>Python Version</th>
              <th>NPM Package</th>
              <th>NPM Version</th>
              <th>Environment</th>
            </tr>
          </thead>
          <tbody>
            ${results.crossLanguageIssues.map(issue => `
              <tr>
                <td><span class="tag tag-python">${issue.pythonPackage}</span></td>
                <td>${issue.pythonVersion}</td>
                <td><span class="tag tag-${issue.environment}">${issue.npmPackage}</span></td>
                <td>${issue.npmVersion}</td>
                <td>${issue.environment}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p>Review these packages to ensure compatibility between Python and JavaScript implementations.</p>
      ` : `
        <p>No cross-language dependency issues detected. <span class="pill pill-success">✓ Good</span></p>
      `}
    </section>
    
    <!-- Unpinned Python Dependencies -->
    <section class="section">
      <h2>Unpinned Python Dependencies</h2>
      ${unpinnedPythonDeps.length > 0 ? `
        <p>The following Python dependencies are not pinned to specific versions:</p>
        <table>
          <thead>
            <tr>
              <th>Package</th>
              <th>Current Constraint</th>
            </tr>
          </thead>
          <tbody>
            ${unpinnedPythonDeps.map(dep => `
              <tr>
                <td><strong>${dep.package}</strong></td>
                <td><span class="pill pill-warning">${dep.constraint}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p>Consider pinning these dependencies to specific versions for better reproducibility and security.</p>
      ` : `
        <p>All Python dependencies are properly pinned to specific versions. <span class="pill pill-success">✓ Good</span></p>
      `}
    </section>

    <!-- Dependency Lists Section -->
    <section class="section">
      <h2>All Dependencies</h2>
      <h3>Python Dependencies (${stats.pythonDepsCount})</h3>
      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>Version Constraint</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(results.pythonDeps).map(([pkg, version]) => `
            <tr>
              <td><strong>${pkg}</strong></td>
              <td>${version}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <h3>Main Extension Dependencies (${stats.mainDepsCount})</h3>
      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>Version Constraint</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(results.mainDeps).map(([pkg, version]) => `
            <tr>
              <td><strong>${pkg}</strong></td>
              <td>${version}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <h3>Webview UI Dependencies (${stats.webviewDepsCount})</h3>
      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>Version Constraint</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(results.webviewDeps).map(([pkg, version]) => `
            <tr>
              <td><strong>${pkg}</strong></td>
              <td>${version}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
    
    <div class="footer">
      Generated by Dependency Analyzer | Plutonium Development Preview
    </div>
  </div>
</body>
</html>`;

  // Ensure the reports directory exists
  if (!fs.existsSync(CONFIG.REPORT_DIR)) {
    fs.mkdirSync(CONFIG.REPORT_DIR, { recursive: true });
  }

  fs.writeFileSync(outputPath, html);
  console.log(`\n${colors.green}Report generated: ${outputPath}${colors.reset}`);
}

/**
 * Main function that orchestrates the dependency checking process
 * 
 * Plutonium enhancement: Make this configurable via CLI arguments
 */
function main() {
  console.log(`${colors.bright}${colors.blue}🔍 Dependency Analyzer${colors.reset} (Plutonium Development Preview)`);
  console.log(`${colors.dim}Running on Node.js ${process.version} | ${process.platform}-${process.arch} | ${new Date().toISOString()}${colors.reset}\n`);
  
  // Parse all dependencies
  console.log(`${colors.cyan}Analyzing dependencies...${colors.reset}`);
  results.pythonDeps = parsePythonRequirements(CONFIG.PYTHON_REQS_PATH);
  results.mainDeps = parseNpmDependencies(CONFIG.MAIN_PKG_PATH);
  results.webviewDeps = parseNpmDependencies(CONFIG.WEBVIEW_PKG_PATH);
  
  console.log(`Found ${colors.cyan}${Object.keys(results.pythonDeps).length}${colors.reset} Python packages`);
  console.log(`Found ${colors.cyan}${Object.keys(results.mainDeps).length}${colors.reset} main npm packages`);
  console.log(`Found ${colors.cyan}${Object.keys(results.webviewDeps).length}${colors.reset} webview npm packages`);
  
  // Run all checks
  checkNpmConsistency(results.mainDeps, results.webviewDeps);
  checkCrossLanguageDependencies(results.pythonDeps, results.mainDeps, results.webviewDeps);
  checkUnpinnedPythonDeps(results.pythonDeps);
  
  // Generate report
  const reportPath = path.join(CONFIG.REPORT_DIR, CONFIG.REPORT_FILENAME);
  generateHTMLReport(results, reportPath);
  
  // Summary
  console.log(`\n${colors.bright}${colors.blue}=== Analysis Summary ===${colors.reset}`);
  console.log(`${colors.cyan}${results.npmInconsistencies.length}${colors.reset} npm version inconsistencies`);
  console.log(`${colors.cyan}${results.crossLanguageIssues.length}${colors.reset} potential cross-language issues`);
  
  // Open the report if on supported platform
  try {
    const openCommand = process.platform === 'win32' ? 'start' : 
                        process.platform === 'darwin' ? 'open' : 'xdg-open';
    
    console.log(`\n${colors.dim}To view the full report: ${openCommand} ${reportPath}${colors.reset}`);
  } catch (err) {
    // Ignore errors trying to determine how to open the report
  }
}

// Execute the script
main();