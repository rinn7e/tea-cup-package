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
| `pnpm check` | Run TypeScript type checking on all packages |
| `pnpm lint` | Run ESLint check across the entire workspace |
| `pnpm format` | Automatically format all codebase files with Prettier |

---

## Local Installation (Recommended)

To use these packages in a host application during development, clone this repository as a sibling to your project and reference them using `pnpm` links in your `package.json`:

```text
parent-directory/
├── your-host-application/
└── tea-cup-package/           <-- This repository
```

### 1. Build the Shared Libraries

Before using them in your host application, build the packages:

```bash
cd tea-cup-package
pnpm install
pnpm build
```

### 2. Link in Host Application

In your host application's `package.json`, add the dependencies using relative paths:

```json
"dependencies": {
  "@rinn7e/tea-cup-prelude": "link:../tea-cup-package/tea-cup-prelude",
  "@rinn7e/tea-cup-form": "link:../tea-cup-package/tea-cup-form",
  "@rinn7e/tea-cup-pagination": "link:../tea-cup-package/tea-cup-pagination",
  "@rinn7e/tea-cup-intersection-observer": "link:../tea-cup-package/tea-cup-intersection-observer"
}
```

Since the compiled assets (`lib/` folders) are tracked in this repository, your host application will pick up the changes immediately after you run `pnpm build` in the `tea-cup-package` workspace.
