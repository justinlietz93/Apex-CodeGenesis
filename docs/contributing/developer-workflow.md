# Developer Workflow Guide

This guide outlines the development workflow for contributing to the Apex CodeGenesis VSCode extension. It covers the tools, processes, and best practices for developing, testing, and submitting changes.

## Development Setup

1. **Clone and Setup**
   ```bash
   # Clone the repository
   git clone https://github.com/justinlietz93/Apex-CodeGenesis.git
   
   # Open in VS Code
   code Apex-CodeGenesis
   
   # Install dependencies for both extension and webview UI
   npm run install:all
   ```

2. **Running the Extension**
   - Press `F5` (or select `Run -> Start Debugging`) to launch a new VS Code window with the extension loaded.
   - Changes to the extension will trigger a reload in the development window.

## Code Quality Tools

### Linting and Formatting

We use ESLint and Prettier to maintain code quality and consistent formatting:

```bash
# Check code formatting
npm run format

# Fix formatting issues automatically
npm run format:fix

# Run linting
npm run lint
```

### Type Checking

TypeScript type checking helps catch errors early:

```bash
# Run type checking
npm run check-types
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests with coverage reports
npm run test:coverage
```

## Cross-Language Dependency Analysis

We've implemented a cross-dependency checking script to analyze dependencies between JavaScript/TypeScript and Python components of the extension.

```bash
# Run dependency analysis
node scripts/check-cross-deps.js
```

This script:
- Analyzes JavaScript dependencies in package.json
- Analyzes Python dependencies in python_backend/requirements.txt
- Identifies potential version conflicts or security issues
- Generates a report of cross-language dependencies

Use this tool when:
- Adding new dependencies to either ecosystem
- Updating existing dependencies
- Before major releases to ensure dependency compatibility

## Pre-Push Verification

The repository includes a comprehensive pre-push check script that runs automatically before each `git push` operation via a Git hook. This script performs multiple validations to ensure code quality:

```bash
# Run manually if needed
node scripts/pre-push-check.js
```

### What the Pre-Push Check Does

1. **Type checking** for both the main extension and webview UI
2. **Linting** to ensure code style consistency
3. **Formatting verification** using Prettier
4. **Python dependency checks**:
   - Identifies unpinned dependencies
   - Runs cross-language dependency analysis
5. **Test execution** to catch regressions
6. **Build verification** to ensure the extension can be built

### Pre-Push Check Options

The pre-push script supports several command-line options:

```bash
# Skip running tests (saves time for quick pushes)
node scripts/pre-push-check.js --skip-tests

# Skip the build step
node scripts/pre-push-check.js --skip-build

# Automatically fix formatting and linting issues when possible
node scripts/pre-push-check.js --fix

# Show more detailed output
node scripts/pre-push-check.js --verbose
```

## Version Management with Changesets

We use changesets to manage version bumps and release notes:

1. **Create a changeset** for user-facing changes:
   ```bash
   npm run changeset
   ```

2. **Choose the appropriate version bump**:
   - `major` for breaking changes (1.0.0 → 2.0.0)
   - `minor` for new features (1.0.0 → 1.1.0)
   - `patch` for bug fixes (1.0.0 → 1.0.1)

3. **Write a clear message** explaining the impact of your changes.

4. **Commit the generated `.changeset` file** with your changes.

Note: Documentation-only changes don't require changesets.

## Pull Request Workflow

1. **Create a branch** for your work:
   ```bash
   git checkout -b username/feature-name
   ```

2. **Make changes** and commit them with clear messages using conventional commit format:
   ```
   feat: add new feature X
   fix: resolve issue with Y
   docs: improve documentation for Z
   ```

3. **Before submitting your PR**:
   - Rebase your branch on the latest main
   - Ensure all checks pass with the pre-push script
   - Create a changeset if needed

4. **Submit your PR** with a descriptive title and detailed description.

## Git Hooks

This repository uses [Husky](https://github.com/typicode/husky) to manage Git hooks:

- **pre-commit**: Runs linting and formatting checks
- **pre-push**: Runs the comprehensive pre-push verification script

If a hook fails, it will prevent the commit or push from proceeding until the issues are fixed.

## Troubleshooting Common Issues

### Git Hook Failures

If the pre-commit or pre-push hooks fail:
1. Read the error messages carefully
2. Run the corresponding commands manually to fix the issues:
   - For formatting: `npm run format:fix`
   - For linting: `npm run lint`
   - For type issues: `npm run check-types`
3. For pre-push failures, run `node scripts/pre-push-check.js --fix` to attempt automatic fixes

### Build Issues

If the extension fails to build:
1. Check for type errors with `npm run check-types`
2. Update dependencies with `npm run install:all`
3. Check for conflicting dependencies using `node scripts/check-cross-deps.js`