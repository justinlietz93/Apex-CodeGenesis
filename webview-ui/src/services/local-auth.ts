import * as crypto from 'crypto';

/**
 * Local Authentication Service
 * This service mimics Firebase Auth's interface using localStorage for persistence.
 */

/**
 * Interface for local user data, matching Firebase User interface properties used in the application
 */
export interface LocalUser {
  uid: string; // Unique identifier for the user
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  // Add any other properties needed from Firebase User
}

// Storage key for the local user in localStorage
const LOCAL_USER_KEY = 'justinlietz93.apex.localUser';
const LOCAL_AUTH_STATE = 'justinlietz93.apex.authState';

// Event name for auth state changes
const AUTH_STATE_CHANGED_EVENT = 'localAuthStateChanged';

/**
 * Type definition for auth state change listeners
 */
type AuthStateChangeListener = (user: LocalUser | null) => void;

// Map to store auth state change listeners
const authStateListeners = new Map<string, AuthStateChangeListener>();

/**
 * Get the current user from localStorage
 * @returns The current user or null if not logged in
 */
export function getCurrentUser(): LocalUser | null {
  const userJson = localStorage.getItem(LOCAL_USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
}

/**
 * Set the current user in localStorage
 * @param user The user to set as current, or null to clear
 */
function setCurrentUser(user: LocalUser | null): void {
  if (user) {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    localStorage.setItem(LOCAL_AUTH_STATE, 'authenticated');
  } else {
    localStorage.removeItem(LOCAL_USER_KEY);
    localStorage.setItem(LOCAL_AUTH_STATE, 'unauthenticated');
  }

  // Notify listeners about the auth state change
  notifyAuthStateChanged(user);
}

/**
 * Notify all auth state change listeners
 * @param user The current user or null
 */
function notifyAuthStateChanged(user: LocalUser | null): void {
  // Create a custom event
  const event = new CustomEvent(AUTH_STATE_CHANGED_EVENT, { detail: { user } });

  // Dispatch the event
  window.dispatchEvent(event);

  // Call all registered listeners
  authStateListeners.forEach((listener) => {
    try {
      listener(user);
    } catch (error) {
      console.error('Error in auth state change listener:', error);
    }
  });
}

/**
 * Sign in with a custom token (simulated)
 * In a real Firebase app, this would validate the token with Firebase.
 * Here we just create a local user based on the token.
 *
 * @param token A custom authentication token
 * @returns A promise that resolves when authentication is complete
 */
export async function signInWithCustomToken(token: string): Promise<void> {
  try {
    // In a real implementation, we would validate the token
    // Here we'll just parse it assuming it has user info embedded
    // or create a default user

    let user: LocalUser;

    try {
      // If token contains JSON information about the user, extract it
      const tokenData = JSON.parse(atob(token.split('.')[1] || '{}'));

      user = {
        uid: tokenData.uid || generateUniqueId(),
        displayName: tokenData.displayName || null,
        email: tokenData.email || null,
        photoURL: tokenData.photoURL || null,
      };
    } catch (e) {
      // If token doesn't contain valid JSON, create a default user
      user = {
        uid: generateUniqueId(),
        displayName: 'Local User',
        email: 'local@example.com',
        photoURL: null,
      };
    }

    // Set the user in local storage
    setCurrentUser(user);

    console.log('Successfully signed in with local auth service');
    return Promise.resolve();
  } catch (error) {
    console.error('Error signing in with local auth service:', error);
    return Promise.reject(error);
  }
}

/**
 * Sign out the current user
 * @returns A promise that resolves when sign-out is complete
 */
export async function signOut(): Promise<void> {
  try {
    // Clear the current user from localStorage
    setCurrentUser(null);

    console.log('Successfully signed out of local auth service');
    return Promise.resolve();
  } catch (error) {
    console.error('Error signing out of local auth service:', error);
    return Promise.reject(error);
  }
}

/**
 * Register a listener for auth state changes
 * @param callback Function to call when auth state changes
 * @returns An unsubscribe function
 */
export function onAuthStateChanged(
  callback: (user: LocalUser | null) => void
): () => void {
  const listenerId = generateUniqueId();
  authStateListeners.set(listenerId, callback);

  // Setup event listener
  const eventListener = (event: Event) => {
    const customEvent = event as CustomEvent;
    callback(customEvent.detail?.user || null);
  };

  window.addEventListener(AUTH_STATE_CHANGED_EVENT, eventListener);

  // Immediately call with current user
  setTimeout(() => {
    callback(getCurrentUser());
  }, 0);

  // Return unsubscribe function
  return () => {
    authStateListeners.delete(listenerId);
    window.removeEventListener(AUTH_STATE_CHANGED_EVENT, eventListener);
  };
}

/**
 * Create a default local user if none exists
 * @param displayName Optional display name for the user
 * @param email Optional email for the user
 * @returns The created user or existing user
 */
export function createDefaultLocalUser(
  displayName: string = 'Local User',
  email: string = 'local@example.com'
): LocalUser {
  const existingUser = getCurrentUser();

  if (existingUser) {
    return existingUser;
  }

  const newUser: LocalUser = {
    uid: generateUniqueId(),
    displayName,
    email,
    photoURL: null,
  };

  setCurrentUser(newUser);
  return newUser;
}

/**
 * Generate a unique ID for users or listeners
 * @returns A unique ID string
 */
function generateUniqueId(): string {
  const randomPart = crypto.randomBytes(8).toString('hex'); // Generate a secure random string
  return Date.now().toString(36) + randomPart;
}

/**
 * Get all local user profiles
 * This is a new function not in Firebase Auth, for managing multiple local profiles
 */
export function getAllProfiles(): LocalUser[] {
  // In a more robust implementation, we would store multiple profiles in localStorage
  // For now, we'll just return the current user if it exists
  const currentUser = getCurrentUser();
  return currentUser ? [currentUser] : [];
}

/**
 * Save a user profile
 * @param user The user profile to save
 */
export function saveProfile(user: LocalUser): void {
  // In a more robust implementation, we would update the profile in a list of profiles
  // For now, we'll just set it as the current user
  setCurrentUser(user);
}

/**
 * Create a new user profile and set it as the current user
 * @param displayName The display name for the new profile
 * @param email The email for the new profile
 * @returns The newly created user
 */
export function createProfile(displayName: string, email: string): LocalUser {
  const newUser: LocalUser = {
    uid: generateUniqueId(),
    displayName,
    email,
    photoURL: null,
  };

  setCurrentUser(newUser);
  return newUser;
}

/**
 * Update the current user's profile
 * @param updates The profile fields to update
 * @returns The updated user
 */
export function updateProfile(updates: Partial<LocalUser>): LocalUser | null {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return null;
  }

  const updatedUser = {
    ...currentUser,
    ...updates,
  };

  setCurrentUser(updatedUser);
  return updatedUser;
}
