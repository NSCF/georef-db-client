# NSCF Georeferencing Tool Client Rules

This file outlines the rules, architecture constraints, and workflows for the `georef-db-client` project. The agent **MUST** follow these rules for any code changes, testing, or development.

---

## 🛠️ Tech Stack & Constraints

- **Svelte Version**: **Svelte 3** (`^3.59.2`). Do NOT use Svelte 4/5 features or syntax. Keep Svelte files compatible with Svelte 3 standard APIs.
- **Firebase SDK**: **Firebase v8** (`^8.10.1`). 
  - Imports must use the namespaced/compat style:
    ```javascript
    import firebase from 'firebase/app';
    import 'firebase/firestore';
    ```
  - Do NOT rewrite Firebase queries or initialization to the modular v9/v10 SDK style (e.g. `getDoc`, `collection(db, ...)`), as the application relies on the namespace-based API.
- **Vite Build**: Uses Vite with `@sveltejs/vite-plugin-svelte` (`^1.0.8`) and ES Modules.

---

## 🧪 Testing Guidelines (IMPORTANT)

- **Do NOT rely on automated test commands**: Although `package.json` contains `vitest`, the files in `tests/` are actually raw Node.js script execution scripts.
- **Hardcoded environments**: Many test files (e.g., `tests/testValidateCSVContent.js`) contain hardcoded file paths (like `C:\Users\engelbrechti\...`) or assume a specific local filesystem structure.
- **No Node-level Firebase testing**: Some test files (like `tests/testGeorefFuncs.js`) note that they fail in raw Node because of lack of browser APIs or Firebase Client constraints.
- **Running tests**: If you must test utility functions, either use a mock environment, run them in isolation via a scratch script in the `<appDataDir>\brain\<conversation-id>/scratch/` directory, or write specific unit tests in Vitest that mock out DOM and Firebase APIs.

---

## ⚠️ Stability & Refactoring

- **Avoid Extensive Refactoring**: The codebase was written as a learning project and is highly coupled. Sweeping architectural changes risk breaking existing functionality. Prioritize small, localized bug fixes.
- **Preserve Documentation**: Maintain all existing comments, docstrings, and debug logs (e.g., `let i = 0 // debug`) unless explicitly asked to modify them.
- **Cloud Functions**: The client calls external Cloud Functions (such as `https://us-central1-georefmaps.cloudfunctions.net/grouplocalities`). Remember that these functions are hosted in a separate repository; you cannot edit backend Cloud Functions from this workspace.
