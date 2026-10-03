// A settings menu: every row pushes the next page, nothing blocks going
// forward or back. The screen is just the page's name; the tree says which
// pages each one leads to.
export type Page =
  | 'Settings'
  | 'General'
  | 'About'
  | 'Licenses'
  | 'Language'
  | 'Notifications'
  | 'Sounds'
  | 'Privacy'

export const children: Record<Page, Page[]> = {
  Settings: ['General', 'Notifications', 'Privacy'],
  General: ['About', 'Language'],
  About: ['Licenses'],
  Licenses: [],
  Language: [],
  Notifications: ['Sounds'],
  Sounds: [],
  Privacy: [],
}

// Shown on the pages without children
export const descriptions: Record<Page, string> = {
  Settings: '',
  General: '',
  About: '',
  Licenses: 'MIT License. Free to use, copy, modify and distribute.',
  Language: 'English (the only one in this demo).',
  Notifications: '',
  Sounds: 'Default notification sound.',
  Privacy:
    'Nothing is collected. This page is longer than the others so the height animation is easy to see when you come back from it.',
}
