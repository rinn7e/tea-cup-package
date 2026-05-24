# tea-cup-package

Monorepo containing components and utilities for react-tea-cup.

## Workspace Packages

This monorepo manages the following sub-packages:

*   **[tea-cup-prelude](file:///home/rinne/projects/my-package/tea-cup-package/tea-cup-prelude)**: Core prelude, types, and Elm Architecture runtime utilities.
*   **[tea-cup-form](file:///home/rinne/projects/my-package/tea-cup-package/tea-cup-form)**: Reusable, type-safe form validation and state management components.
*   **[tea-cup-pagination](file:///home/rinne/projects/my-package/tea-cup-package/tea-cup-pagination)**: Standard React pagination component following Elm Architecture principles.
*   **[tea-cup-intersection-observer](file:///home/rinne/projects/my-package/tea-cup-package/tea-cup-intersection-observer)**: Intersection Observer subscription for React Tea-Cup applications.

---

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) installed:

```bash
# Verify pnpm version
pnpm --version
```

### Installation

Install the dependencies across the entire workspace and link local packages:

```bash
pnpm install
```

### Build

Compile all the packages in the workspace in the correct topological order:

```bash
pnpm build
```

---

## Workspace Scripts

All scripts are executed from the monorepo root using pnpm workspace filters:

| Command | Description |
| --- | --- |
| `pnpm build` | Compile all packages in the workspace |
| `pnpm typecheck` | Run TypeScript type checking on all packages |
| `pnpm lint` | Run ESLint check across the entire workspace |
| `pnpm fix-style` | Automatically format all codebase files with Prettier |
| `pnpm check-style` | Verify code formatting rules with Prettier |

---

## Installation from GitHub

To install any of these packages directly from GitHub into a host application, use the `#commit-hash&path:directory` syntax in your dependencies:

```json
"dependencies": {
  "@rinn7e/tea-cup-prelude": "github:rinn7e/tea-cup-package#[commit-hash]&path:tea-cup-prelude",
  "@rinn7e/tea-cup-form": "github:rinn7e/tea-cup-package#[commit-hash]&path:tea-cup-form",
  "@rinn7e/tea-cup-pagination": "github:rinn7e/tea-cup-package#[commit-hash]&path:tea-cup-pagination",
  "@rinn7e/tea-cup-intersection-observer": "github:rinn7e/tea-cup-package#[commit-hash]&path:tea-cup-intersection-observer"
}
```

Since the compiled assets (`lib/` folders) are tracked in the repository and the installation scripts are bypassed, installation is extremely fast, secure, and offline-compatible.
