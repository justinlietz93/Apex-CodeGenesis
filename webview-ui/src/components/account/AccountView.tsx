import {
  VSCodeButton,
  VSCodeDivider,
  VSCodeLink,
  VSCodeTextField,
} from '@vscode/webview-ui-toolkit/react';
import { memo, useEffect, useState } from 'react';
import { useFirebaseAuth } from '../../context/FirebaseAuthContext';
import { vscode } from '../../utils/vscode';
import VSCodeButtonLink from '../common/VSCodeButtonLink';
import ApexLogoWhite from '../../assets/ApexLogoWhite';
import CountUp from 'react-countup';
import CreditsHistoryTable from './CreditsHistoryTable';
import {
  UsageTransaction,
  PaymentTransaction,
} from '../../../../src/shared/ApexAccount';
import { useExtensionState } from '../../context/ExtensionStateContext';
import { createProfile, updateProfile } from '../../services/local-auth';

type AccountViewProps = {
  onDone: () => void;
};

const AccountView = ({ onDone }: AccountViewProps) => {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden pt-[10px] pl-[20px]">
      <div className="flex justify-between items-center mb-[17px] pr-[17px]">
        <h3 className="text-[var(--vscode-foreground)] m-0">Account</h3>
        <VSCodeButton onClick={onDone}>Done</VSCodeButton>
      </div>
      <div className="flex-grow overflow-hidden pr-[8px] flex flex-col">
        <div className="h-full mb-[5px]">
          <ApexAccountView />
        </div>
      </div>
    </div>
  );
};

export const ApexAccountView = () => {
  const { user: firebaseUser, handleSignOut } = useFirebaseAuth();
  const { userInfo, apiConfiguration } = useExtensionState();

  let user = apiConfiguration?.apexApiKey
    ? firebaseUser || userInfo
    : undefined;

  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [usageData, setUsageData] = useState<UsageTransaction[]>([]);
  const [paymentsData, setPaymentsData] = useState<PaymentTransaction[]>([]);

  // Listen for balance and transaction data updates from the extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'userCreditsBalance' && message.userCreditsBalance) {
        setBalance(message.userCreditsBalance.currentBalance);
      } else if (
        message.type === 'userCreditsUsage' &&
        message.userCreditsUsage
      ) {
        setUsageData(message.userCreditsUsage.usageTransactions);
      } else if (
        message.type === 'userCreditsPayments' &&
        message.userCreditsPayments
      ) {
        setPaymentsData(message.userCreditsPayments.paymentTransactions);
      }
      setIsLoading(false);
    };

    window.addEventListener('message', handleMessage);

    // Fetch all account data when component mounts
    if (user) {
      setIsLoading(true);
      vscode.postMessage({ type: 'fetchUserCreditsData' });
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [user]);

  // Local profile management
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.displayName || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');

  const handleLogin = () => {
    // Create a new local profile
    const token = `local-token-${Date.now()}`;
    vscode.postMessage({
      type: 'accountLoginClicked',
      data: { localAuth: true },
      customToken: token, // Use existing customToken property
    });
  };

  const handleLogout = () => {
    // First notify extension to clear API keys and state
    vscode.postMessage({ type: 'accountLogoutClicked' });
    // Then sign out of local auth
    handleSignOut();
  };

  const handleCreateProfile = () => {
    // Save the new profile
    createProfile(
      profileName || 'Local User',
      profileEmail || 'local@example.com'
    );

    // Update the extension state
    vscode.postMessage({
      type: 'authStateChanged',
      user: {
        displayName: profileName || 'Local User',
        email: profileEmail || 'local@example.com',
        photoURL: null,
      },
    });

    setIsEditingProfile(false);
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
  return (
    <div className="h-full flex flex-col">
      {user ? (
        <div className="flex flex-col pr-3 h-full">
          <div className="flex flex-col w-full">
            <div className="flex flex-col w-full">
              {isEditingProfile ? (
                <div className="mb-6">
                  <h2 className="text-[var(--vscode-foreground)] m-0 mb-4 text-lg font-medium">
                    {user ? 'Edit Profile' : 'Create Profile'}
                  </h2>
                  <div className="flex flex-col gap-4">
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
                    <div className="flex gap-2">
                      <VSCodeButton
                        onClick={
                          user ? handleUpdateProfile : handleCreateProfile
                        }
                      >
                        {user ? 'Update Profile' : 'Create Profile'}
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
                <div className="flex items-center mb-6 flex-wrap gap-y-4">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="size-16 rounded-full mr-4"
                    />
                  ) : (
                    <div className="size-16 rounded-full bg-[var(--vscode-button-background)] flex items-center justify-center text-2xl text-[var(--vscode-button-foreground)] mr-4">
                      {user.displayName?.[0] || user.email?.[0] || '?'}
                    </div>
                  )}

                  <div className="flex flex-col">
                    {user.displayName && (
                      <h2 className="text-[var(--vscode-foreground)] m-0 mb-1 text-lg font-medium">
                        {user.displayName}
                      </h2>
                    )}

                    {user.email && (
                      <div className="text-sm text-[var(--vscode-descriptionForeground)]">
                        {user.email}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TODO: Verify Dashboard link functionality */}
          <div className="w-full flex gap-2 flex-col min-[225px]:flex-row">
            {!isEditingProfile && (
              <VSCodeButton
                onClick={() => {
                  setProfileName(user?.displayName || '');
                  setProfileEmail(user?.email || '');
                  setIsEditingProfile(true);
                }}
                className="w-full"
              >
                Edit Profile
              </VSCodeButton>
            )}
            {/* Logout button */}
            <VSCodeButton
              appearance="secondary"
              onClick={handleLogout}
              className="w-full"
            >
              Log out
            </VSCodeButton>
          </div>

          <VSCodeDivider className="w-full my-6" />

          <div className="w-full flex flex-col items-center">
            <div className="text-sm text-[var(--vscode-descriptionForeground)] mb-3">
              CURRENT BALANCE
            </div>

            <div className="text-4xl font-bold text-[var(--vscode-foreground)] mb-6 flex items-center gap-2">
              {isLoading ? (
                <div className="text-[var(--vscode-descriptionForeground)]">
                  Loading...
                </div>
              ) : (
                <>
                  <span>$</span>
                  <CountUp end={balance} duration={0.66} decimals={2} />
                  <VSCodeButton
                    appearance="icon"
                    className="mt-1"
                    onClick={() =>
                      vscode.postMessage({ type: 'fetchUserCreditsData' })
                    }
                  >
                    <span className="codicon codicon-refresh"></span>
                  </VSCodeButton>
                </>
              )}
            </div>

            {/* TODO: Verify Add Credits link functionality */}
            <div className="w-full">
              {/* <VSCodeButtonLink href="https://app.apex.bot/credits/#buy" className="w-full">
								Add Credits
							</VSCodeButtonLink> */}
            </div>
          </div>

          <VSCodeDivider className="mt-6 mb-3 w-full" />

          <div className="flex-grow flex flex-col min-h-0 pb-[0px]">
            <CreditsHistoryTable
              isLoading={isLoading}
              usageData={usageData}
              paymentsData={paymentsData}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center pr-3">
          <ApexLogoWhite className="size-16 mb-4" />

          <p style={{}}>
            Log in to your Apex account to manage settings, view usage, and
            access exclusive features.
          </p>

          <VSCodeButton onClick={handleLogin} className="w-full mb-4">
            Log in / Sign up
          </VSCodeButton>

          <p className="text-[var(--vscode-descriptionForeground)] text-xs text-center m-0">
            By continuing, you agree to the{' '}
            <VSCodeLink href="https://apex.bot/tos">
              Terms of Service
            </VSCodeLink>{' '}
            and{' '}
            <VSCodeLink href="https://apex.bot/privacy">
              Privacy Policy.
            </VSCodeLink>
          </p>
        </div>
      )}
    </div>
  );
};

export default memo(AccountView);
