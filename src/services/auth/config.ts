// Local auth configuration
export const localAuthConfig = {
	// Storage keys used for local authentication
	USER_STORAGE_KEY: "justinlietz93.apex.localUser",
	AUTH_STATE_KEY: "justinlietz93.apex.authState",

	// Default profile settings (used when creating a new profile)
	defaultProfile: {
		displayName: "Local User",
		email: "local@example.com",
		photoURL: null,
	},
}
