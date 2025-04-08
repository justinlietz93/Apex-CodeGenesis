# Phase 3: Backend Integration and Feature Mapping

**Goal:** Integrate the Apex panel UI with the Python backend by defining and implementing a communication protocol, connecting UI actions and mapped Copilot features (commands, menus, shortcuts) to backend logic, and ensuring necessary editor context is captured and passed.

---

## Task 3.9: Implement state management within the panel UI to handle loading indicators, error messages, and asynchronous updates from the backend. [ ]

### Step: Analyze the existing webview panel's frontend code (likely JavaScript/TypeScript, potentially using a framework like React, Vue, Svelte, or vanilla JS). Identify the current method for handling data and UI updates. Based on the complexity and existing structure, choose and document an appropriate state management strategy (e.g., local component state, Context API, Redux, Zustand, Pinia, or simple object/event pattern for vanilla JS) to manage loading status, error messages, and data received from the backend. [ ]
#### Success Criteria:
- The current UI update mechanism in the webview code is understood.
- A suitable state management strategy (e.g., Zustand, simple event pattern) is chosen and documented.
#### Validation Metrics:
- Analysis notes or documentation describe the current UI handling.
- The chosen state management strategy is documented, along with the rationale if necessary.

### Step: Define the structure for the state object within your chosen state management approach. This structure should include at least the following fields: `isLoading` (boolean, default: `false`), `errorMessage` (string or null, default: `null`), and `panelData` (type appropriate for Apex's output, e.g., `object`, `array`, `string`, default: appropriate initial empty state like `null` or `[]`). Initialize the state with these default values when the panel loads. [ ]
#### Success Criteria:
- The state structure (e.g., interface or object definition) is defined.
- It includes `isLoading` (boolean), `errorMessage` (string | null), and `panelData` (appropriate type).
- Initial state values are defined (e.g., `isLoading: false`, `errorMessage: null`, `panelData: []`).
- State initialization logic exists (e.g., setting initial state when the store/component is created).
#### Validation Metrics:
- Code review confirms the state structure definition.
- Code review confirms initialization with default values.

### Step: Integrate a visual loading indicator into the panel's UI. Modify the UI rendering logic to display this indicator (e.g., a spinner, skeleton screen, or 'Loading...' text) whenever the `isLoading` state property is `true`. Ensure other potentially stale content is hidden or disabled during the loading state. [ ]
#### Success Criteria:
- An HTML element for a loading indicator exists in the UI.
- UI rendering logic conditionally displays the loading indicator based on the `isLoading` state value.
- UI logic potentially hides/disables other content while loading.
#### Validation Metrics:
- Code review confirms the presence of the loading indicator element (e.g., `<vscode-progress-ring>`).
- Code review confirms conditional rendering logic (e.g., `{#if isLoading} ... {/if}` in Svelte, `isLoading && <Spinner />` in React) tied to the `isLoading` state.
- Testing confirms the indicator appears/disappears when `isLoading` is toggled.

### Step: Implement an error display area within the panel's UI. Update the UI rendering logic to show this area, displaying the content of the `errorMessage` state property, whenever `errorMessage` is not `null` or empty. Provide a mechanism for the user to potentially dismiss the error message (which should set `errorMessage` back to `null`). [ ]
#### Success Criteria:
- An HTML element for displaying errors exists.
- UI rendering logic conditionally displays this element and its content based on the `errorMessage` state value (non-null).
- A UI element (e.g., close button) exists to dismiss the error.
- An event handler is attached to the dismiss element that updates the state (`errorMessage = null`).
#### Validation Metrics:
- Code review confirms the error display element.
- Code review confirms conditional rendering logic tied to `errorMessage`.
- Code review confirms the dismiss button/element and its event handler updating the state.
- Testing confirms error messages appear when `errorMessage` has value and disappear when dismissed.

### Step: Refactor the message handling logic within the webview (the code that processes messages received from the extension host via `window.addEventListener('message', ...)` or framework-specific equivalent). Update this logic to interact with the state management system: [ ]
  - Before sending a request to the backend (or when receiving confirmation that a request has started), set `isLoading` to `true` and `errorMessage` to `null`.
  - Upon receiving a successful response from the backend, update `panelData` with the received payload, set `isLoading` to `false`, and ensure `errorMessage` is `null`.
  - Upon receiving an error message from the backend or detecting a communication failure, update `errorMessage` with an appropriate message and set `isLoading` to `false`.
#### Success Criteria:
- Code that sends requests to the host now also sets `isLoading = true` and `errorMessage = null`.
- The webview's message listener (`window.addEventListener`) updates state based on received messages:
    - On success (`backendResponse`): Sets `panelData`, sets `isLoading = false`, sets `errorMessage = null`.
    - On error (`backendError`): Sets `errorMessage`, sets `isLoading = false`.
#### Validation Metrics:
- Code review confirms state updates (`isLoading`, `errorMessage`) occur when requests are initiated.
- Code review confirms state updates (`panelData`, `isLoading`, `errorMessage`) occur within the message listener's success handler.
- Code review confirms state updates (`errorMessage`, `isLoading`) occur within the message listener's error handler.

### Step: Ensure that all state updates correctly trigger UI re-renders. If using a declarative UI framework (React, Vue, Svelte), this is often automatic. If using vanilla JavaScript, verify that the code explicitly updates the relevant DOM elements whenever the `isLoading`, `errorMessage`, or `panelData` state changes. [ ]
#### Success Criteria:
- Changes to `isLoading`, `errorMessage`, and `panelData` state reliably cause the UI to update visually.
- **If Framework:** Components subscribe to state changes correctly.
- **If Vanilla JS:** State change handlers explicitly update corresponding DOM element properties (e.g., `textContent`, `style.display`, `innerHTML`).
#### Validation Metrics:
- **If Framework:** Code review confirms components use state variables correctly for rendering.
- **If Vanilla JS:** Code review confirms DOM manipulation code runs after state changes.
- Testing confirms UI visually reflects changes made to `isLoading`, `errorMessage`, and `panelData` state variables.

### Step: Refactor any existing UI components responsible for displaying the main content (e.g., Apex suggestions, analysis results) to source their data directly from the `panelData` property within the managed state. Ensure they render correctly both with initial/empty data and when populated. [ ]
#### Success Criteria:
- UI components displaying results (e.g., message list) are modified to read data from the `panelData` state variable.
- Components correctly render the initial empty state (e.g., show nothing, show a placeholder).
- Components correctly render the content when `panelData` is populated.
#### Validation Metrics:
- Code review confirms components use `panelData` for rendering content.
- Testing confirms the component displays correctly when `panelData` is empty/null.
- Testing confirms the component displays correctly when `panelData` contains valid data.

### Step: Add comprehensive testing within the webview context, if possible, or manually test the state transitions. Verify: [ ]
  - The loading indicator appears when an action is triggered and disappears on completion/error.
  - Correct data is displayed after a successful backend response.
  - Error messages are displayed appropriately when the backend reports an error.
  - The UI correctly handles rapid sequential updates or concurrent operations if applicable.
#### Success Criteria:
- State transitions (loading -> success, loading -> error) function correctly visually.
- Data display is accurate upon success.
- Error display is accurate upon failure.
- UI remains stable during rapid updates or concurrent operations (if relevant).
#### Validation Metrics:
- Manual testing: Trigger action -> Verify loading indicator shows -> Verify disappears on response.
- Manual testing: Trigger action -> Verify success data appears correctly.
- Manual testing: Trigger action causing error -> Verify error message appears correctly.
- (If applicable) Manual testing: Trigger multiple actions quickly -> Verify UI state remains consistent and eventually reflects final results.