import {
  VSCodeButton,
  VSCodeCheckbox,
  VSCodeLink,
  VSCodeTextArea,
  VSCodePanels,
  VSCodePanelTab,
  VSCodePanelView,
} from '@vscode/webview-ui-toolkit/react';
import { VSCodeDropdown, VSCodeOption } from '@vscode/webview-ui-toolkit/react'; // Add Dropdown/Option
import { memo, useCallback, useEffect, useState } from 'react';
import { useExtensionState } from '../../context/ExtensionStateContext';
import {
  validateApiConfiguration,
  validateModelId,
} from '../../utils/validate';
import { vscode } from '../../utils/vscode';
// Import types
import {
  UserProfile,
  CustomInstructionItem,
} from '../../../../src/shared/ExtensionMessage';
import SettingsButton from '../common/SettingsButton';
import ApiOptions from './ApiOptions';
import { TabButton } from '../mcp/McpView';
import { useEvent } from 'react-use';
import { ExtensionMessage } from '../../../../src/shared/ExtensionMessage';
const { IS_DEV } = process.env;

type SettingsViewProps = {
  onDone: () => void;
};

const SettingsView = ({ onDone }: SettingsViewProps) => {
  const {
    // Existing state
    apiConfiguration,
    version,
    // customInstructions, // Removed - Handled by library/profile
    // setCustomInstructions, // Removed
    openRouterModels,
    telemetrySetting,
    setTelemetrySetting,
    chatSettings,
    planActSeparateModelsSetting,
    setPlanActSeparateModelsSetting,
    // New state for profiles/library
    userProfiles,
    activeProfileId,
    customInstructionLibrary,
    // New actions for profiles/library
    createProfile,
    deleteProfile,
    setActiveProfile,
    updateProfile, // Add if needed for renaming etc.
    createCustomInstruction,
    updateCustomInstruction, // Add if needed for editing
    deleteCustomInstruction,
    setActiveCustomInstruction,
  } = useExtensionState();
  const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(
    undefined
  );
  const [modelIdErrorMessage, setModelIdErrorMessage] = useState<
    string | undefined
  >(undefined);
  const [pendingTabChange, setPendingTabChange] = useState<
    'plan' | 'act' | null
  >(null);

  const handleSubmit = (withoutDone: boolean = false) => {
    const apiValidationResult = validateApiConfiguration(apiConfiguration);
    const modelIdValidationResult = validateModelId(
      apiConfiguration,
      openRouterModels
    );

    // setApiErrorMessage(apiValidationResult)
    // setModelIdErrorMessage(modelIdValidationResult)

    let apiConfigurationToSubmit = apiConfiguration;
    if (!apiValidationResult && !modelIdValidationResult) {
      // API Config is sent directly by ApiOptions component now
      // Custom Instructions are set via setActiveCustomInstruction
      // Telemetry setting is sent directly below
      // Plan/Act setting is sent directly below
    } else {
      // if the api configuration is invalid, we don't save it
      apiConfigurationToSubmit = undefined; // Don't submit invalid API config via this general save
    }

    // Send only settings not handled by specific messages/actions
    vscode.postMessage({
      type: 'updateSettings',
      planActSeparateModelsSetting,
      // customInstructionsSetting: customInstructions, // Removed
      telemetrySetting,
      // apiConfiguration: apiConfigurationToSubmit, // Removed - Handled by ApiOptions component sending 'apiConfiguration' message
    });

    if (!withoutDone) {
      onDone();
    }
  };

  useEffect(() => {
    setApiErrorMessage(undefined);
    setModelIdErrorMessage(undefined);
  }, [apiConfiguration]);

  // validate as soon as the component is mounted
  /*
    useEffect will use stale values of variables if they are not included in the dependency array. 
    so trying to use useEffect with a dependency array of only one value for example will use any 
    other variables' old values. In most cases you don't want this, and should opt to use react-use 
    hooks.
    
        // uses someVar and anotherVar
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [someVar])
	If we only want to run code once on mount we can use react-use's useEffectOnce or useMount
    */

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;
      switch (message.type) {
        case 'didUpdateSettings':
          if (pendingTabChange) {
            vscode.postMessage({
              type: 'togglePlanActMode',
              chatSettings: {
                mode: pendingTabChange,
              },
            });
            setPendingTabChange(null);
          }
          break;
      }
    },
    [pendingTabChange]
  );

  useEvent('message', handleMessage);

  const handleResetState = () => {
    vscode.postMessage({ type: 'resetState' });
  };

  const handleTabChange = (tab: 'plan' | 'act') => {
    if (tab === chatSettings.mode) {
      return;
    }
    setPendingTabChange(tab);
    handleSubmit(true);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: '10px 0px 0px 20px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '13px',
          paddingRight: 17,
        }}
      >
        <h3 style={{ color: 'var(--vscode-foreground)', margin: 0 }}>
          Settings
        </h3>
        <VSCodeButton onClick={() => handleSubmit(false)}>Done</VSCodeButton>
      </div>
      <div
        style={{
          flexGrow: 1,
          overflowY: 'scroll',
          paddingRight: 8,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Tabs container */}
        {planActSeparateModelsSetting ? (
          <div
            style={{
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '4px',
              padding: '10px',
              marginBottom: '20px',
              background: 'var(--vscode-panel-background)',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '1px',
                marginBottom: '10px',
                marginTop: -8,
                borderBottom: '1px solid var(--vscode-panel-border)',
              }}
            >
              <TabButton
                isActive={chatSettings.mode === 'plan'}
                onClick={() => handleTabChange('plan')}
              >
                Plan Mode
              </TabButton>
              <TabButton
                isActive={chatSettings.mode === 'act'}
                onClick={() => handleTabChange('act')}
              >
                Act Mode
              </TabButton>
            </div>

            {/* Content container */}
            <div style={{ marginBottom: -12 }}>
              <ApiOptions
                key={chatSettings.mode}
                showModelOptions={true}
                apiErrorMessage={apiErrorMessage}
                modelIdErrorMessage={modelIdErrorMessage}
              />
            </div>
          </div>
        ) : (
          <ApiOptions
            key={'single'}
            showModelOptions={true}
            apiErrorMessage={apiErrorMessage}
            modelIdErrorMessage={modelIdErrorMessage}
          />
        )}

        {/* --- Profile Management --- */}
        <div
          style={{
            marginBottom: '20px',
            border: '1px solid var(--vscode-panel-border)',
            borderRadius: '4px',
            padding: '10px',
            background: 'var(--vscode-panel-background)',
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: '10px' }}>
            Profile Management
          </h4>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '10px',
            }}
          >
            <label htmlFor="profile-select" style={{ flexShrink: 0 }}>
              Active Profile:
            </label>
            <VSCodeDropdown
              id="profile-select"
              value={activeProfileId ?? ''}
              onChange={(e: any) => setActiveProfile(e.target.value)}
              style={{ flexGrow: 1 }}
            >
              {userProfiles.map(
                (
                  profile: UserProfile // Added type UserProfile
                ) => (
                  <VSCodeOption
                    key={profile.profileId}
                    value={profile.profileId}
                  >
                    {profile.profileName}
                  </VSCodeOption>
                )
              )}
            </VSCodeDropdown>
            {/* Add Profile Button */}
            <VSCodeButton
              appearance="secondary"
              onClick={() => {
                const newName = prompt(
                  'Enter new profile name:',
                  `Profile ${userProfiles.length + 1}`
                );
                if (newName) createProfile(newName);
              }}
              title="Create New Profile"
            >
              <i className="codicon codicon-add"></i>
            </VSCodeButton>
            {/* Delete Profile Button (disable if only one profile) */}
            <VSCodeButton
              appearance="secondary"
              disabled={userProfiles.length <= 1 || !activeProfileId}
              onClick={() => {
                // Added type UserProfile to find callback parameter
                if (
                  activeProfileId &&
                  confirm(
                    `Are you sure you want to delete profile "${userProfiles.find((p: UserProfile) => p.profileId === activeProfileId)?.profileName}"?`
                  )
                ) {
                  deleteProfile(activeProfileId);
                }
              }}
              title="Delete Active Profile"
            >
              <i className="codicon codicon-trash"></i>
            </VSCodeButton>
            {/* TODO: Add Rename Profile Button */}
          </div>
        </div>

        {/* --- Custom Instruction Library --- */}
        <div
          style={{
            marginBottom: '20px',
            border: '1px solid var(--vscode-panel-border)',
            borderRadius: '4px',
            padding: '10px',
            background: 'var(--vscode-panel-background)',
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: '10px' }}>
            Custom Instruction Library
          </h4>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '10px',
            }}
          >
            <label htmlFor="instruction-select" style={{ flexShrink: 0 }}>
              Active Instruction:
            </label>
            <VSCodeDropdown
              id="instruction-select"
              // Added type UserProfile to find callback parameter
              value={
                userProfiles.find(
                  (p: UserProfile) => p.profileId === activeProfileId
                )?.activeCustomInstructionId ?? ''
              }
              onChange={(e: any) =>
                setActiveCustomInstruction(e.target.value || null)
              } // Send null if empty
              style={{ flexGrow: 1 }}
            >
              <VSCodeOption value="">-- None --</VSCodeOption>
              {customInstructionLibrary.map(
                (
                  item: CustomInstructionItem // Added type CustomInstructionItem
                ) => (
                  <VSCodeOption key={item.id} value={item.id}>
                    {item.name}
                  </VSCodeOption>
                )
              )}
            </VSCodeDropdown>
            {/* TODO: Add Create/Edit/Delete buttons for library items */}
            <VSCodeButton
              appearance="secondary"
              onClick={() =>
                alert('Create/Edit/Delete UI not implemented yet.')
              }
              title="Manage Instructions"
            >
              Manage...
            </VSCodeButton>
          </div>
          <p
            style={{
              fontSize: '12px', // Removed duplicate fontSize and marginTop
              marginTop: '5px',
              marginBottom: 0, // Adjust margin
              color: 'var(--vscode-descriptionForeground)',
            }}
          >
            These instructions are added to the end of the system prompt sent
            with every request.
          </p>
        </div>

        <div style={{ marginBottom: 5 }}>
          <VSCodeCheckbox
            style={{ marginBottom: '5px' }}
            checked={planActSeparateModelsSetting}
            onChange={(e: any) => {
              const checked = e.target.checked === true;
              setPlanActSeparateModelsSetting(checked);
            }}
          >
            Use different models for Plan and Act modes
          </VSCodeCheckbox>
          <p
            style={{
              fontSize: '12px',
              marginTop: '5px',
              color: 'var(--vscode-descriptionForeground)',
            }}
          >
            Switching between Plan and Act mode will persist the API and model
            used in the previous mode. This may be helpful e.g. when using a
            strong reasoning model to architect a plan for a cheaper coding
            model to act on.
          </p>
        </div>

        <div style={{ marginBottom: 5 }}>
          <VSCodeCheckbox
            style={{ marginBottom: '5px' }}
            checked={telemetrySetting === 'enabled'}
            onChange={(e: any) => {
              const checked = e.target.checked === true;
              setTelemetrySetting(checked ? 'enabled' : 'disabled');
            }}
          >
            Allow anonymous error and usage reporting
          </VSCodeCheckbox>
          <p
            style={{
              fontSize: '12px',
              marginTop: '5px',
              color: 'var(--vscode-descriptionForeground)',
            }}
          >
            Help improve Apex by sending anonymous usage data and error reports.
            No code, prompts, or personal information are ever sent. See our{' '}
            <VSCodeLink
              href="https://docs.apex.bot/more-info/telemetry"
              style={{ fontSize: 'inherit' }}
            >
              telemetry overview
            </VSCodeLink>{' '}
            and{' '}
            <VSCodeLink
              href="https://apex.bot/privacy"
              style={{ fontSize: 'inherit' }}
            >
              privacy policy
            </VSCodeLink>{' '}
            for more details.
          </p>
        </div>

        {IS_DEV && (
          <>
            <div style={{ marginTop: '10px', marginBottom: '4px' }}>Debug</div>
            <VSCodeButton
              onClick={handleResetState}
              style={{ marginTop: '5px', width: 'auto' }}
            >
              Reset State
            </VSCodeButton>
            <p
              style={{
                fontSize: '12px',
                marginTop: '5px',
                color: 'var(--vscode-descriptionForeground)',
              }}
            >
              This will reset all global state and secret storage in the
              extension.
            </p>
          </>
        )}

        <div
          style={{
            marginTop: 'auto',
            paddingRight: 8,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <SettingsButton
            onClick={() =>
              vscode.postMessage({ type: 'openExtensionSettings' })
            }
            style={{
              margin: '0 0 16px 0',
            }}
          >
            <i className="codicon codicon-settings-gear" />
            Advanced Settings
          </SettingsButton>
        </div>
        <div
          style={{
            textAlign: 'center',
            color: 'var(--vscode-descriptionForeground)',
            fontSize: '12px',
            lineHeight: '1.2',
            padding: '0 8px 15px 0',
          }}
        >
          <p
            style={{
              wordWrap: 'break-word',
              margin: 0,
              padding: 0,
            }}
          >
            If you have any questions or feedback, feel free to open an issue at{' '}
            <VSCodeLink
              href="https://github.com/apex/apex"
              style={{ display: 'inline' }}
            >
              https://github.com/apex/apex
            </VSCodeLink>
          </p>
          <p
            style={{
              fontStyle: 'italic',
              margin: '10px 0 0 0',
              padding: 0,
            }}
          >
            v{version}
          </p>
        </div>
      </div>
    </div>
  );
};

export default memo(SettingsView);
