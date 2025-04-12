# Security Policy

## About Us

Apex is maintained by a very small team. As the primary maintainer, Justin is a relatively new developer who is committed to improving the project's security, vulnerability management, and dependency management practices. While we may not have the resources of larger projects, we are dedicated to addressing security concerns as effectively as possible given our constraints.

## Supported Versions

The following versions of Apex-CodeGenesis-VSCode are currently being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| older   | :x:                |

**Note:** Apex-CodeGenesis-VSCode is currently in active development. We recommend always using the latest version for the best security coverage.

## Reporting a Vulnerability

We take the security of Apex-CodeGenesis-VSCode seriously. If you believe you've found a security vulnerability, please follow these steps:

1. **Do not disclose the vulnerability publicly**
2. **Email us** at jlietz93dev@gmail.com with details about the vulnerability
3. **Include the following information**:
   - Type of vulnerability
   - Full paths of source files related to the vulnerability
   - Location of the affected source code (tag/branch/commit or direct URL)
   - Any special configuration required to reproduce the issue
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the vulnerability, including how an attacker might exploit it

### What to expect
- We aim to acknowledge receipt of legitimate vulnerability reports within a reasonable timeframe
- We will evaluate reports based on severity, credibility, and impact to the project
- Reports that appear to be spam, automated, or lack sufficient detail may not receive a response
- For valid reports, we will provide updates on our investigation as appropriate
- We maintain discretion in determining which reports will be acknowledged publicly

## Automatic Security Scanning

This repository uses the following automated security tools:

1. **Dependabot** - Scans dependencies for known vulnerabilities daily and creates PRs for security updates.
2. **CodeQL Analysis** - Performs code scanning on push, pull request to main branch, and weekly scheduled scans.

These tools help us identify and remediate security issues in the codebase and dependencies automatically.

## Security Best Practices

Contributors to this project are encouraged to:

- Follow secure coding practices
- Keep dependencies up-to-date
- Review Dependabot and CodeQL alerts promptly
- Add tests for security fixes
- Document security considerations in code comments

## Continuous Improvement

As a small team focusing on growing our security expertise, we welcome constructive feedback on our security practices. We are continuously learning and improving our approach to security, vulnerability management, and dependency maintenance.