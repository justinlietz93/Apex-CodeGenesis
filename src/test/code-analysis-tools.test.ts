import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as path from 'path';
import { Task } from '../core/task'; // Adjust path
import {
    executeListFilesTool,
    executeSearchFilesTool,
    executeListCodeDefinitionNamesTool
} from '../core/task/modules/tools/code-analysis-tools'; // Adjust path
import { formatResponse } from '../core/prompts/responses'; // Adjust path
import * as globService from '../services/glob/list-files'; // Adjust path
import * as rgService from '../services/ripgrep'; // Adjust path
import * as tsService from '../services/tree-sitter'; // Adjust path
import { ApexIgnoreController } from '../core/ignore/ApexIgnoreController'; // Adjust path
import { ApiHandlerModule } from '../core/task/modules/api-handler'; // Adjust path

// --- Mocks ---

class MockApiHandlerModule {
    consecutiveMistakeCount = 0;
}
class MockApexIgnoreController {
    // Mock methods if needed, e.g., shouldIgnore
    shouldIgnore = sinon.stub().returns(false);
    apexIgnoreContent = null; // Or mock content if needed
}
class MockTask {
    apiHandlerModule = new MockApiHandlerModule();
    apexIgnoreController = new MockApexIgnoreController();
    // Add other properties if needed
}

suite('Code Analysis Tools Test Suite', () => {
    vscode.window.showInformationMessage('Start code analysis tools tests.');

    let task: MockTask;
    let sandbox: sinon.SinonSandbox;
    const testCwd = '/mock/cwd';
    const testDirPath = 'src';
    const absoluteTestPath = path.resolve(testCwd, testDirPath);

    setup(() => {
        task = new MockTask();
        sandbox = sinon.createSandbox();

        // Stub services used by the tools
        sandbox.stub(globService, 'listFiles');
        sandbox.stub(rgService, 'regexSearchFiles');
        sandbox.stub(tsService, 'parseSourceCodeForDefinitionsTopLevel');
        // Stub formatResponse methods used
        sandbox.stub(formatResponse, 'formatFilesList').returns('Formatted file list');
        // sandbox.stub(formatResponse, 'formatRgResults').returns('Formatted rg results'); // rgService returns formatted string directly
        sandbox.stub(formatResponse, 'formatDefinitions').returns('Formatted definitions');
        sandbox.stub(formatResponse, 'missingToolParameterError').callsFake(param => `Missing parameter: ${param}`);
        sandbox.stub(formatResponse, 'toolError').callsFake(msg => `TOOL_ERROR: ${msg}`);
    });

    teardown(() => {
        sandbox.restore();
    });

    // --- executeListFilesTool ---
    suite('executeListFilesTool', () => {
        test('Should call listFiles and format response on success (non-recursive)', async () => {
            const files = ['file1.ts', 'file2.js'];
            const limitHit = false;
            (globService.listFiles as sinon.SinonStub).withArgs(absoluteTestPath, false, 200).resolves([files, limitHit]);

            const result = await executeListFilesTool(task as any, testCwd, { path: testDirPath });

            assert.ok((globService.listFiles as sinon.SinonStub).calledOnceWith(absoluteTestPath, false, 200));
            assert.ok((formatResponse.formatFilesList as sinon.SinonStub).calledOnceWith(absoluteTestPath, files, limitHit, task.apexIgnoreController));
            assert.strictEqual(result, 'Formatted file list');
        });

        test('Should call listFiles and format response on success (recursive)', async () => {
            const files = ['file1.ts', 'subdir/file2.js'];
            const limitHit = true;
            (globService.listFiles as sinon.SinonStub).withArgs(absoluteTestPath, true, 200).resolves([files, limitHit]);

            const result = await executeListFilesTool(task as any, testCwd, { path: testDirPath, recursive: 'true' });

            assert.ok((globService.listFiles as sinon.SinonStub).calledOnceWith(absoluteTestPath, true, 200));
            assert.ok((formatResponse.formatFilesList as sinon.SinonStub).calledOnceWith(absoluteTestPath, files, limitHit, task.apexIgnoreController));
            assert.strictEqual(result, 'Formatted file list');
        });

        test('Should return error if path is missing', async () => {
            const result = await executeListFilesTool(task as any, testCwd, {});
            assert.strictEqual(result, 'TOOL_ERROR: Missing parameter: path');
            assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1);
        });

        test('Should return error if listFiles fails', async () => {
            const error = new Error('Glob failed');
            (globService.listFiles as sinon.SinonStub).rejects(error);

            const result = await executeListFilesTool(task as any, testCwd, { path: testDirPath });
            assert.strictEqual(result, `TOOL_ERROR: Error listing files: ${error.message}`);
        });
    });

    // --- executeSearchFilesTool ---
    suite('executeSearchFilesTool', () => {
        const regex = 'console\\.log';
        const filePattern = '*.ts';
        const searchResults = 'src/file1.ts:10: console.log("hello");';

        test('Should call regexSearchFiles and return result on success', async () => {
            (rgService.regexSearchFiles as sinon.SinonStub)
                .withArgs(regex, absoluteTestPath, testCwd, filePattern, task.apexIgnoreController)
                .resolves(searchResults);

            const result = await executeSearchFilesTool(task as any, testCwd, { path: testDirPath, regex: regex, file_pattern: filePattern });

            assert.ok((rgService.regexSearchFiles as sinon.SinonStub).calledOnce);
            // assert.ok((formatResponse.formatRgResults as sinon.SinonStub).calledOnceWith(searchResults)); // Service returns formatted string
            assert.strictEqual(result, searchResults); // Directly compare with service output
        });

         test('Should call regexSearchFiles without file_pattern', async () => {
            (rgService.regexSearchFiles as sinon.SinonStub)
                .withArgs(regex, absoluteTestPath, testCwd, undefined, task.apexIgnoreController)
                .resolves(searchResults);

            const result = await executeSearchFilesTool(task as any, testCwd, { path: testDirPath, regex: regex });

            assert.ok((rgService.regexSearchFiles as sinon.SinonStub).calledOnce);
            assert.strictEqual(result, searchResults);
        });


        test('Should return error if path is missing', async () => {
            const result = await executeSearchFilesTool(task as any, testCwd, { regex: regex });
            assert.strictEqual(result, 'TOOL_ERROR: Missing parameter: path');
            assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1);
        });

        test('Should return error if regex is missing', async () => {
            const result = await executeSearchFilesTool(task as any, testCwd, { path: testDirPath });
            assert.strictEqual(result, 'TOOL_ERROR: Missing parameter: regex');
            assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1);
        });

        test('Should return error if regexSearchFiles fails', async () => {
            const error = new Error('rg failed');
            (rgService.regexSearchFiles as sinon.SinonStub).rejects(error);

            const result = await executeSearchFilesTool(task as any, testCwd, { path: testDirPath, regex: regex });
            assert.strictEqual(result, `TOOL_ERROR: Error searching files: ${error.message}`);
        });
    });

    // --- executeListCodeDefinitionNamesTool ---
    suite('executeListCodeDefinitionNamesTool', () => {
        const definitions = [{ name: 'myFunction', kind: 'function', file: 'file1.ts', range: {} }]; // Mock definition structure

        test('Should call parseSourceCodeForDefinitionsTopLevel and format response', async () => {
            (tsService.parseSourceCodeForDefinitionsTopLevel as sinon.SinonStub)
                .withArgs(absoluteTestPath, task.apexIgnoreController)
                .resolves(definitions);

            const result = await executeListCodeDefinitionNamesTool(task as any, testCwd, { path: testDirPath });

            assert.ok((tsService.parseSourceCodeForDefinitionsTopLevel as sinon.SinonStub).calledOnce);
            assert.ok((formatResponse.formatDefinitions as sinon.SinonStub).calledOnceWith(definitions));
            assert.strictEqual(result, 'Formatted definitions');
        });

        test('Should return error if path is missing', async () => {
            const result = await executeListCodeDefinitionNamesTool(task as any, testCwd, {});
            assert.strictEqual(result, 'TOOL_ERROR: Missing parameter: path');
            assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1);
        });

        test('Should return error if parseSourceCodeForDefinitionsTopLevel fails', async () => {
            const error = new Error('Tree-sitter failed');
            (tsService.parseSourceCodeForDefinitionsTopLevel as sinon.SinonStub).rejects(error);

            const result = await executeListCodeDefinitionNamesTool(task as any, testCwd, { path: testDirPath });
            assert.strictEqual(result, `TOOL_ERROR: Error listing code definitions: ${error.message}`);
        });
    });
});
