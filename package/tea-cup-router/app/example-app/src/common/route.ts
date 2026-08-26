import type * as EqClass from 'fp-ts/lib/Eq'

export type HomeTab = 'global' | 'feed' | 'tag'

export type AppRoute =
  | { readonly _tag: 'HomePage'; readonly tab: HomeTab; readonly page: number }
  | { readonly _tag: 'LoginPage' }
  | { readonly _tag: 'SignupPage' }
  | { readonly _tag: 'SettingsPage' }
  | {
      readonly _tag: 'ProfilePage'
      readonly username: string
      readonly favorites: boolean
    }
  | { readonly _tag: 'ArticlePage'; readonly slug: string }
  | { readonly _tag: 'EditorPage'; readonly slug?: string }
  | { readonly _tag: 'NotFoundPage' }

export const parseUrl = (location: Location): AppRoute => {
  const pathname = location.pathname.replace(/\/$/, '') || '/'
  const searchParams = new URLSearchParams(location.search)

  if (pathname === '/' || pathname === '') {
    const rawTab = searchParams.get('tab')
    const tab: HomeTab =
      rawTab === 'feed' || rawTab === 'tag' ? rawTab : 'global'
    const pageNum = parseInt(searchParams.get('page') || '1', 10)
    const page = isNaN(pageNum) || pageNum < 1 ? 1 : pageNum
    return { _tag: 'HomePage', tab, page }
  }

  if (pathname === '/login') {
    return { _tag: 'LoginPage' }
  }

  if (pathname === '/signup') {
    return { _tag: 'SignupPage' }
  }

  if (pathname === '/settings') {
    return { _tag: 'SettingsPage' }
  }

  const profileFavMatch = pathname.match(/^\/profile\/([^/]+)\/favorites$/)
  if (profileFavMatch) {
    return {
      _tag: 'ProfilePage',
      username: decodeURIComponent(profileFavMatch[1]),
      favorites: true,
    }
  }

  const profileMatch = pathname.match(/^\/profile\/([^/]+)$/)
  if (profileMatch) {
    return {
      _tag: 'ProfilePage',
      username: decodeURIComponent(profileMatch[1]),
      favorites: false,
    }
  }

  const articleMatch = pathname.match(/^\/article\/([^/]+)$/)
  if (articleMatch) {
    return {
      _tag: 'ArticlePage',
      slug: decodeURIComponent(articleMatch[1]),
    }
  }

  const editorSlugMatch = pathname.match(/^\/editor\/([^/]+)$/)
  if (editorSlugMatch) {
    return {
      _tag: 'EditorPage',
      slug: decodeURIComponent(editorSlugMatch[1]),
    }
  }

  if (pathname === '/editor') {
    return { _tag: 'EditorPage' }
  }

  return { _tag: 'NotFoundPage' }
}

export const toUrl = (route: AppRoute): string => {
  switch (route._tag) {
    case 'HomePage': {
      const params = new URLSearchParams()
      if (route.tab !== 'global') {
        params.set('tab', route.tab)
      }
      if (route.page > 1) {
        params.set('page', route.page.toString())
      }
      const qs = params.toString()
      return qs ? `/?${qs}` : '/'
    }
    case 'LoginPage':
      return '/login'
    case 'SignupPage':
      return '/signup'
    case 'SettingsPage':
      return '/settings'
    case 'ProfilePage':
      return `/profile/${encodeURIComponent(route.username)}${route.favorites ? '/favorites' : ''}`
    case 'ArticlePage':
      return `/article/${encodeURIComponent(route.slug)}`
    case 'EditorPage':
      return route.slug
        ? `/editor/${encodeURIComponent(route.slug)}`
        : '/editor'
    case 'NotFoundPage':
      return '/not-found'
  }
}

export const AppRouteEq: EqClass.Eq<AppRoute> = {
  equals: (a, b) => {
    if (a._tag !== b._tag) return false
    switch (a._tag) {
      case 'HomePage': {
        const bHome = b as typeof a
        return a.tab === bHome.tab && a.page === bHome.page
      }
      case 'ProfilePage': {
        const bProf = b as typeof a
        return a.username === bProf.username && a.favorites === bProf.favorites
      }
      case 'ArticlePage': {
        const bArt = b as typeof a
        return a.slug === bArt.slug
      }
      case 'EditorPage': {
        const bEd = b as typeof a
        return a.slug === bEd.slug
      }
      default:
        return true
    }
  },
}
