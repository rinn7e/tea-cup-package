# `@rinn7e/tea-cup-navigation`

A modular, type-safe, functional router and navigation management library built for React and The Elm Architecture (TEA), powered by `tea-cup-fp` and `react-tea-cup`.

---

## Features

- **Double-Update Loop Prevention**: Implements the `isInternal` state handshake pattern to prevent redundant page model re-initializations when synchronizing browser URL history.
- **Declarative Route Guards**: Flexible authorization and access control (`Allow`, `Redirect`, `Reject`) with support for shared application contexts and internal/external navigation origins.
- **State-Preserving In-Place Navigation**: Supports `ChangeRouteNoReload` for updating URL search params, tabs, or pagination without resetting active page state, and `ChangeRouteUrlNoReload` for URL-only updates.
- **Isolated React Entrypoint**: Pure router types, configuration, and reducers are exported from `@rinn7e/tea-cup-navigation`. The declarative `<Link />` component is isolated under `@rinn7e/tea-cup-navigation/component`.
- **First-Class TEA Integration**: Cleanly integrates with `ProgramWithNav` and `Dispatcher<Msg>` without mutable state or hidden side-effects.

---

## Philosophy: Solving the "Double Update" Problem

In standard TEA / Elm routing, updating the route internally emits a `newUrl` command to push the change to browser history. When the browser executes the URL push, it fires an `onUrlChange` event back into the application runtime. Naive routers re-parse the route and re-initialize page models on `onUrlChange`, causing expensive data fetches and state resets to run **twice**.

`@rinn7e/tea-cup-navigation` eliminates this by maintaining an `isInternal` flag in the router model:

1. **Internal Navigation (`ChangeRoute`)**: Sets `isInternal = true`, transitions the `pageModel` immediately, and emits the `newUrl` command.
2. **Browser URL Event (`UrlChange`)**:
   - If `isInternal === true`: The URL change was triggered by the app itself. The router consumes the flag (`isInternal = false`) and ignores the message without re-initializing the page.
   - If `isInternal === false`: The URL change originated externally (e.g. browser Back / Forward buttons or direct address bar entry). The router parses the URL and runs full navigation.

For an in-depth breakdown of this design, read [Solving Elm Router "Double Update" Problem](https://dev.to/rinn7e/solving-elm-router-double-update-problem-dde).

---

## Installation

```bash
pnpm add @rinn7e/tea-cup-navigation
```

---

## Quick Start

### 1. Define Routes & Navigation Configuration

Create a router configuration using `Config<Route, PageModel, Context, Msg>`:

```ts
import * as Navigation from '@rinn7e/tea-cup-navigation'
import { Cmd } from 'tea-cup-fp'

export type AppRoute =
  | { readonly _tag: 'HomePage' }
  | { readonly _tag: 'ProfilePage'; readonly username: string }
  | { readonly _tag: 'LoginPage' }

export type PageModel =
  | { readonly _tag: 'HomePageModel'; readonly model: HomeModel }
  | { readonly _tag: 'ProfilePageModel'; readonly model: ProfileModel }
  | { readonly _tag: 'LoginPageModel'; readonly model: LoginModel }

export type AppContext = {
  readonly isAuthenticated: boolean
}

export const navigationConfig: Navigation.Config<
  AppRoute,
  PageModel,
  AppContext,
  AppMsg
> = {
  parseUrl: (location) => parseAppRoute(location.href),
  toUrl: (route) => serializeAppRoute(route),
  routeEq: appRouteEq,

  // Declarative Route Guard
  guard: (toRoute, context) => {
    if (toRoute._tag === 'ProfilePage' && !context.isAuthenticated) {
      return { _tag: 'Redirect', to: { _tag: 'LoginPage' } }
    }
    if (toRoute._tag === 'LoginPage' && context.isAuthenticated) {
      return { _tag: 'Redirect', to: { _tag: 'HomePage' } }
    }
    return { _tag: 'Allow' }
  },

  // Initialize Page Model & Child Commands
  initPageModel: (route, context, prev) => {
    switch (route._tag) {
      case 'HomePage': {
        const [subModel, subCmd] = initHome()
        return [
          { _tag: 'HomePageModel', model: subModel },
          subCmd.map((subMsg) => ({ _tag: 'HomeMsg', subMsg })),
        ]
      }
      case 'ProfilePage': {
        const [subModel, subCmd] = initProfile(route.username)
        return [
          { _tag: 'ProfilePageModel', model: subModel },
          subCmd.map((subMsg) => ({ _tag: 'ProfileMsg', subMsg })),
        ]
      }
      case 'LoginPage': {
        const [subModel, subCmd] = initLogin()
        return [
          { _tag: 'LoginPageModel', model: subModel },
          subCmd.map((subMsg) => ({ _tag: 'LoginMsg', subMsg })),
        ]
      }
    }
  },

  toMsg: (subMsg) => ({ _tag: 'NavigationMsg', subMsg }),
}
```

---

### 2. Integrate into TEA Model & Msg

Embed `Navigation.Model` and `Navigation.Msg` into your top-level TEA state:

```ts
import type * as Navigation from '@rinn7e/tea-cup-navigation'

export type Model = {
  readonly navigation: Navigation.Model<AppRoute, PageModel>
  readonly shared: AppContext
}

export type Msg =
  | {
      readonly _tag: 'NavigationMsg'
      readonly subMsg: Navigation.Msg<AppRoute>
    }
  | { readonly _tag: 'HomeMsg'; readonly subMsg: HomeMsg }
  | { readonly _tag: 'ProfileMsg'; readonly subMsg: ProfileMsg }
  | { readonly _tag: 'LoginMsg'; readonly subMsg: LoginMsg }
```

---

### 3. Handle Navigation in `update.ts`

Initialize with `Navigation.init` and delegate router updates to `Navigation.update`:

```ts
import * as Navigation from '@rinn7e/tea-cup-navigation'
import { Cmd } from 'tea-cup-fp'

export const init = (location: Location): [Model, Cmd<Msg>] => {
  const shared: AppContext = { isAuthenticated: checkAuth() }
  const [navModel, navCmd] = Navigation.init(navigationConfig, location, shared)

  return [
    {
      navigation: navModel,
      shared,
    },
    navCmd,
  ]
}

export const navigationMsgHandler = (
  subMsg: Navigation.Msg<AppRoute>,
  model: Model,
): [Model, Cmd<Msg>] => {
  const [navModel, navCmd] = Navigation.update(navigationConfig, model.shared)(
    subMsg,
    model.navigation,
  )

  return [{ ...model, navigation: navModel }, navCmd]
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'NavigationMsg':
      return navigationMsgHandler(msg.subMsg, model)

    case 'HomeMsg': {
      const pageModel = Navigation.getPageModel(model.navigation)
      if (pageModel._tag !== 'HomePageModel') return [model, Cmd.none()]
      const [subModel, subCmd] = updateHome(msg.subMsg, pageModel.model)
      return [
        {
          ...model,
          navigation: Navigation.setPageModel(model.navigation, {
            _tag: 'HomePageModel',
            model: subModel,
          }),
        },
        subCmd.map((subMsg) => ({ _tag: 'HomeMsg', subMsg })),
      ]
    }
  }
}
```

---

### 4. Mount `ProgramWithNav` in `main.tsx`

Hook up browser location changes via `onUrlChange`:

```tsx
import { devTools } from '@rinn7e/tea-cup-prelude'
import { ProgramWithNav } from 'react-tea-cup'

export const App = () => (
  <ProgramWithNav<Model, Msg>
    onUrlChange={(location) => ({
      _tag: 'NavigationMsg',
      subMsg: { _tag: 'UrlChange', location },
    })}
    init={init}
    update={update}
    view={view}
    subscriptions={() => Sub.none()}
    {...devTools<Model, Msg>().getProgramProps()}
  />
)
```

---

### 5. Render Views & Links

Import `<Link />` from `@rinn7e/tea-cup-navigation/component` and use accessor functions:

```tsx
import * as Navigation from '@rinn7e/tea-cup-navigation'
import { Link } from '@rinn7e/tea-cup-navigation/component'

export const View = ({ model, dispatch }: Props) => {
  const currentRoute = Navigation.getRoute(model.navigation)
  const pageModel = Navigation.getPageModel(model.navigation)

  return (
    <div>
      <nav>
        <Link
          route={{ _tag: 'HomePage' }}
          toUrl={navigationConfig.toUrl}
          dispatch={(subMsg) => dispatch({ _tag: 'NavigationMsg', subMsg })}
          className={currentRoute._tag === 'HomePage' ? 'active' : ''}
        >
          Home
        </Link>
      </nav>

      <main>{renderPage(pageModel, dispatch)}</main>
    </div>
  )
}
```

---

## API Reference

### Core Types & Models

| Type                                         | Description                                                                                                    |
| :------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| `Config<Route, PageModel, Context, PageMsg>` | Complete router configuration (parser, serializer, equality, guards, and initializers).                        |
| `Model<Route, PageModel>`                    | Router model holding `{ route, pageModel, isInternal }`.                                                       |
| `Msg<Route>`                                 | Router message sum-type (`UrlChange`, `ChangeRoute`, `ChangeRouteNoReload`, `ChangeRouteUrlNoReload`, `NoOp`). |
| `GuardResult<Route>`                         | Result of guard evaluation: `{ _tag: 'Allow' }`, `{ _tag: 'Redirect', to }`, or `{ _tag: 'Reject' }`.          |

### Accessor & Update Functions

| Function                              | Signature                                                              | Description                                                      |
| :------------------------------------ | :--------------------------------------------------------------------- | :--------------------------------------------------------------- |
| `getRoute(model)`                     | `(Model<R, P>) => R`                                                   | Retrieves the active route from the router model.                |
| `getPageModel(model)`                 | `(Model<R, P>) => P`                                                   | Retrieves the active page model from the router model.           |
| `setPageModel(model, pageModel)`      | `(Model<R, P>, P) => Model<R, P>`                                      | Replaces the active page model within the router model.          |
| `init(config, location, context)`     | `(Config, Location, Context) => [Model, Cmd]`                          | Initializes router state and triggers route guards/initializers. |
| `update(config, context)`             | `(Config, Context) => (Msg, Model) => [Model, Cmd]`                    | Main TEA router update reducer.                                  |
| `changeRouteHandler(config, context)` | `(Config, Context) => (Route, isInternal?) => (Model) => [Model, Cmd]` | Direct handler for programmatic navigation.                      |
| `changeRouteNoReloadHandler(config)`  | `(Config) => (Route) => (Model) => [Model, Cmd]`                       | Updates route & address bar without re-initializing page model.  |
| `urlChangeHandler(config, context)`   | `(Config, Context) => (Location) => (Model) => [Model, Cmd]`           | Direct handler for browser popstate / URL events.                |
| `mkModelEq(routeEq, pageModelEq)`     | `(Eq<R>, Eq<P>) => Eq<Model<R, P>>`                                    | Constructs an `Eq` instance for React memoization.               |
| `mkPropsEq(routeEq?)`                 | `(Eq<R>?) => Eq<Props<R>>`                                             | Constructs an `Eq` instance for `<Link />` memoization.          |

---

## Development & Testing

```bash
# Typecheck package
pnpm run check

# Check for circular dependencies
pnpm run check-circular

# Build production bundle (ESM, CJS, DTS)
pnpm run build

# Run Playwright E2E test suite (12 comprehensive edge-case scenarios)
pnpm --filter tea-cup-navigation-example-e2e test:e2e
```

---

## License

[MIT License](LICENSE) © 2025 Moremi Vannak
