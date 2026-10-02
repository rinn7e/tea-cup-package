# tea-cup-package

[![AI-DECLARATION: assist](https://img.shields.io/badge/䷼%20AI--DECLARATION-assist-fef9c3?labelColor=fef9c3)](AI-DECLARATION.md)

Monorepo containing components and utilities for react-tea-cup.

## Workspace Packages

This monorepo manages the following sub-packages:

*   **[package/tea-cup-prelude](package/tea-cup-prelude)**: Core prelude, types, and Elm Architecture runtime utilities.
*   **[package/tea-cup-form](package/tea-cup-form)**: Reusable, type-safe form validation and state management components.
*   **[package/tea-cup-pagination](package/tea-cup-pagination)**: Standard React pagination component following Elm Architecture principles.
*   **[package/tea-cup-link-pagination](package/tea-cup-link-pagination)**: Bidirectional infinite-scroll and cursor-based stream pagination engine.
*   **[package/tea-cup-intersection-observer](package/tea-cup-intersection-observer)**: Intersection Observer subscription for React Tea-Cup applications.
*   **[package/tea-cup-router](package/tea-cup-router)**: Pure, modular router and navigation manager preventing double-update loops.
*   **[package/tea-cup-drawer](package/tea-cup-drawer)**: Drawer / bottom sheet with swipe gestures and snap points, a TEA port of vaul.
*   **[package/tea-cup-rte-toolkit](package/tea-cup-rte-toolkit)**: Rich Text Editor toolkit built for React Tea-Cup applications.

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

## Installing from GitHub Packages (For Consumers)

All packages in this monorepo are published to the **GitHub Packages npm registry** under the `@rinn7e` scope.

> **Note:** GitHub Packages requires authentication to install packages, even for public repositories.

### 1. Configure `.npmrc`

Create or update a `.npmrc` file in the root of your application:

```ini
@rinn7e:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${INSTALL_GITHUB_PACKAGE_TOKEN}
```

### 2. Set Up a GitHub Personal Access Token

1. Go to your GitHub account: **Settings** → **Developer Settings** → **Personal Access Tokens** → **Tokens (classic)**.
2. Generate a new token with the **`read:packages`** scope.
3. Export the token in your shell environment:

```bash
export INSTALL_GITHUB_PACKAGE_TOKEN=ghp_pat_for_install_packages
```

*(Alternatively, you can save the token globally in `~/.npmrc` so you don't need to export it in each terminal session: `npm config set //npm.pkg.github.com/:_authToken ghp_pat_for_install_packages`)*

### 3. Install Packages

Install any of the packages using your preferred package manager:

```bash
# Using pnpm
pnpm add @rinn7e/tea-cup-router @rinn7e/tea-cup-prelude

# Using npm
npm install @rinn7e/tea-cup-router @rinn7e/tea-cup-prelude

# Using yarn
yarn add @rinn7e/tea-cup-router @rinn7e/tea-cup-prelude
```

---

## Publishing Packages (For Maintainers)

Packages are published to GitHub Packages (`https://npm.pkg.github.com`).

### 1. Prerequisites

You must have a GitHub Personal Access Token with **`write:packages`** and **`read:packages`** permissions associated with the `@rinn7e` namespace.

Set your token in your environment:

```bash
export PUBLISH_GITHUB_PACKAGE_TOKEN=ghp_pat_for_publish_packages
```

### 2. Publish All Packages in Dependency Order

Use the automated publish script to compile and deploy all packages in their topological dependency order:

```bash
pnpm run publish-all
```

This runs:
1. `tea-cup-prelude` (Core base)
2. `tea-cup-intersection-observer` & `tea-cup-rte-toolkit`
3. `tea-cup-router`, `tea-cup-pagination`, `tea-cup-link-pagination`, and `tea-cup-form`

### 3. Publish an Individual Package

To publish a specific package manually:

```bash
cd package/tea-cup-router
pnpm run build
npm publish --access public
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
| `pnpm publish-all` | Build and publish all packages to GitHub Packages |


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
  "@rinn7e/tea-cup-prelude": "link:../tea-cup-package/package/tea-cup-prelude",
  "@rinn7e/tea-cup-form": "link:../tea-cup-package/package/tea-cup-form",
  "@rinn7e/tea-cup-pagination": "link:../tea-cup-package/package/tea-cup-pagination",
  "@rinn7e/tea-cup-link-pagination": "link:../tea-cup-package/package/tea-cup-link-pagination",
  "@rinn7e/tea-cup-intersection-observer": "link:../tea-cup-package/package/tea-cup-intersection-observer",
  "@rinn7e/tea-cup-router": "link:../tea-cup-package/package/tea-cup-router",
  "@rinn7e/tea-cup-rte-toolkit": "link:../tea-cup-package/package/tea-cup-rte-toolkit"
}
```

Since the compiled assets (`lib/` folders) are tracked in this repository, your host application will pick up the changes immediately after you run `pnpm build` in the `tea-cup-package` workspace.

## AI declaration

This project declares its AI usage in [AI-DECLARATION.md](AI-DECLARATION.md), following the
[AI-DECLARATION.md](https://ai-declaration.md) standard (level: `assist`).
