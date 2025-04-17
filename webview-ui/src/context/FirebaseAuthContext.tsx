import {
  LocalUser,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
  createDefaultLocalUser,
} from '../services/local-auth';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { vscode } from '../utils/vscode';

// Create default user if needed (will be used if no user exists)
createDefaultLocalUser();

interface FirebaseAuthContextType {
  user: LocalUser | null;
  isInitialized: boolean;
  signInWithToken: (token: string) => Promise<void>;
  handleSignOut: () => Promise<void>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | undefined>(
  undefined
);

export const FirebaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Handle auth state changes using local auth service
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setUser(user);
      setIsInitialized(true);

      console.log('onAuthStateChanged user', user);

      if (!user) {
        // when opening the extension in a new webview (ie if you logged in to sidebar webview but then open a popout tab webview) this effect will trigger without the original webview's session, resulting in us clearing out the user info object.
        // we rely on this object to determine if the user is logged in, so we only want to clear it when the user logs out, rather than whenever a webview without a session is opened.
        return;
      }
      // Sync auth state with extension
      vscode.postMessage({
        type: 'authStateChanged',
        user: user
          ? {
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
            }
          : null,
      });
    });

    return () => unsubscribe();
  }, []);

  const signInWithToken = useCallback(async (token: string) => {
    try {
      await signInWithCustomToken(token);
      console.log('Successfully signed in with local auth service');
    } catch (error) {
      console.error('Error signing in with local auth service:', error);
      throw error;
    }
  }, []);

  // Listen for auth callback from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'authCallback' && message.customToken) {
        signInWithToken(message.customToken);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [signInWithToken]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      console.log('Successfully signed out of local auth service');
    } catch (error) {
      console.error('Error signing out of local auth service:', error);
      throw error;
    }
  }, []);

  return (
    <FirebaseAuthContext.Provider
      value={{ user, isInitialized, signInWithToken, handleSignOut }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
};

export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error(
      'useFirebaseAuth must be used within a FirebaseAuthProvider'
    );
  }
  return context;
};
