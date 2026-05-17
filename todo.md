# Monorepo Migration Plan: tea-cup-package

This document outlines the plan to convert the standalone tea-cup libraries (tea-cup-prelude, tea-cup-form, and tea-cup-pagination) into an npm Workspaces monorepo.

---

## Goal
Consolidate tea-cup-prelude, tea-cup-form, and tea-cup-pagination into a single unified monorepo workspace to:
- Enable local package linking for rapid development and testing without version publishing cycles.
- Share unified ESLint, Prettier, and TypeScript configurations at the root level.
- Enforce consistent code quality standards across all packages.

---

## Technical Migration Steps

### Phase 1: Workspace Initialization
- [ ] **Create Root package.json**:
  Create a root-level package.json inside /home/rinne/projects/my-package/tea-cup-package/ defining the workspaces:
  ```json
  {
    "name": "tea-cup-package-monorepo",
    "private": true,
    "version": "1.0.0",
    "description": "Monorepo for tea-cup libraries",
    "workspaces": [
      "tea-cup-prelude",
      "tea-cup-form",
      "tea-cup-pagination"
    ],
    "scripts": {
      "build": "npm run build --workspaces",
      "typecheck": "npm run typecheck --workspaces",
      "lint": "npm run lint --workspaces",
      "fix-style": "npm run fix-style --workspaces",
      "check-style": "npm run check-style --workspaces"
    }
  }
  ```
- [ ] **Install dependencies from the root**:
  Run `npm install` at the root directory to let npm automatically construct symlinks under node_modules for local packages.

---

### Phase 2: Configuration Consolidation
- [ ] **Consolidate Prettier Settings**:
  Establish a single .prettierrc and .prettierignore at the root. Remove individual package-level Prettier configurations.
- [ ] **Consolidate ESLint Settings**:
  Set up a single root-level eslint.config.js to enforce consistent styling and rules.
- [ ] **Consolidate TypeScript Settings**:
  Define a root-level tsconfig.json with shared compiler options, and update package-level tsconfig.json files to extend it:
  ```json
  {
    "extends": "../tsconfig.json",
    "compilerOptions": {
      "outDir": "./lib"
    }
  }
  ```

---

### Phase 3: Sibling Dependency Alignment
- [ ] **Update package.json Sibling Versions**:
  Update package dependency definitions to reference local workspace packages:
  - In `tea-cup-form/package.json` depend on `"@rinn7e/tea-cup-prelude": "*"`
  - In `tea-cup-pagination/package.json` depend on `"@rinn7e/tea-cup-prelude": "*"`
- [ ] **Configure Host Applications**:
  Ensure local demo applications and dashboards reference packages appropriately during active development.
