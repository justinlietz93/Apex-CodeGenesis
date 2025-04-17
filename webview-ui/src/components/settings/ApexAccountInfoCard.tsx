import {
  VSCodeButton,
  VSCodeTextField,
} from '@vscode/webview-ui-toolkit/react';
import { useState } from 'react';
import { useFirebaseAuth } from '../../context/FirebaseAuthContext';
import { vscode } from '../../utils/vscode';
import { useExtensionState } from '../../context/ExtensionStateContext';
import { createProfile, updateProfile } from '../../services/local-auth';

// Firebaseuser is actually for local auth for now
export const ApexAccountInfoCard = () => {
  const { user: firebaseUser, handleSignOut } = useFirebaseAuth();
  const { userInfo, apiConfiguration } = useExtensionState();

  let user = apiConfiguration?.apexApiKey
    ? firebaseUser || userInfo
    : undefined;

  // Local profile management
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.displayName || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');

  const handleLogin = () => {
    // Create a new local profile with default values
    const token = `local-token-${Date.now()}`;
    vscode.postMessage({
      type: 'accountLoginClicked',
      data: { localAuth: true },
      customToken: token,
    });
  };

  const handleLogout = () => {
    // First notify extension to clear API keys and state
    vscode.postMessage({ type: 'accountLogoutClicked' });
    // Then sign out of local auth service
    handleSignOut();
  };

  const handleUpdateProfile = () => {
    if (user) {
      // Update the profile
      updateProfile({
        ...user,
        displayName: profileName || user.displayName,
        email: profileEmail || user.email,
      });

      // Update the extension state
      vscode.postMessage({
        type: 'authStateChanged',
        user: {
          displayName: profileName || user.displayName,
          email: profileEmail || user.email,
          photoURL: user.photoURL,
        },
      });
    }

    setIsEditingProfile(false);
  };

  const handleShowAccount = () => {
    vscode.postMessage({ type: 'showAccountViewClicked' });
  };

  return (
    <div className="max-w-[600px]">
      {user ? (
        isEditingProfile ? (
          <div className="p-4 rounded-[2px] bg-[var(--vscode-dropdown-background)]">
            <h3 className="text-[var(--vscode-foreground)] m-0 mb-3">
              Edit Profile
            </h3>
            <div className="flex flex-col gap-3">
              <VSCodeTextField
                value={profileName}
                onChange={(e) =>
                  setProfileName((e.target as HTMLInputElement).value)
                }
                placeholder="Display Name"
              >
                Display Name
              </VSCodeTextField>
              <VSCodeTextField
                value={profileEmail}
                onChange={(e) =>
                  setProfileEmail((e.target as HTMLInputElement).value)
                }
                placeholder="Email"
              >
                Email
              </VSCodeTextField>
              <div className="flex gap-2 mt-2">
                <VSCodeButton onClick={handleUpdateProfile}>
                  Save Profile
                </VSCodeButton>
                <VSCodeButton
                  appearance="secondary"
                  onClick={() => setIsEditingProfile(false)}
                >
                  Cancel
                </VSCodeButton>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-2 rounded-[2px] bg-[var(--vscode-dropdown-background)]">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-[38px] h-[38px] rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-[38px] h-[38px] rounded-full bg-[var(--vscode-button-background)] flex items-center justify-center text-xl text-[var(--vscode-button-foreground)] flex-shrink-0">
                  {user.displayName?.[0] || user.email?.[0] || '?'}
                </div>
              )}
              <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                {user.displayName && (
                  <div className="text-[13px] font-bold text-[var(--vscode-foreground)] break-words">
                    {user.displayName}
                  </div>
                )}
                {user.email && (
                  <div className="text-[13px] text-[var(--vscode-descriptionForeground)] break-words overflow-hidden text-ellipsis">
                    {user.email}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap mt-1">
                  <VSCodeButton
                    appearance="icon"
                    onClick={() => {
                      setProfileName(user?.displayName || '');
                      setProfileEmail(user?.email || '');
                      setIsEditingProfile(true);
                    }}
                    className="scale-[0.85] origin-left mt-0.5 mb-0 -mr-1"
                  >
                    <span className="codicon codicon-edit"></span>
                  </VSCodeButton>
                  <VSCodeButton
                    appearance="secondary"
                    onClick={handleShowAccount}
                    className="scale-[0.85] origin-left w-fit mt-0.5 mb-0 -mr-3"
                  >
                    Usage
                  </VSCodeButton>
                  <VSCodeButton
                    appearance="secondary"
                    onClick={handleLogout}
                    className="scale-[0.85] origin-left w-fit mt-0.5 mb-0 -mr-3"
                  >
                    Log out
                  </VSCodeButton>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        <div>
          <VSCodeButton onClick={handleLogin} className="mt-0">
            Create Local Profile
          </VSCodeButton>
        </div>
      )}
    </div>
  );
};
