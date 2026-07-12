import type { Dict } from './zh'

// 与 zh.ts 同构(类型 Dict 强约束,漏字段会编译报错)
const en: Dict = {
  brand: { name: 'GRAIN', sub: '显影' },
  nav: {
    work: 'Work',
    services: 'Services',
    about: 'About',
    news: 'News',
    contact: 'Contact',
    menu: 'Menu',
    close: 'Close',
  },
  a11y: {
    home: 'GRAIN home',
    toggleTheme: 'Toggle theme',
    toThemeDark: 'Light mode active, switch to dark',
    toThemeLight: 'Dark mode active, switch to light',
    switchLang: 'Switch language',
  },
  footer: {
    tagline: 'Creative studio · Shanghai. We make brands impossible to ignore.',
    nav: 'Navigate',
    contact: 'Contact / Follow',
    privacy: 'Privacy Policy',
    rights: 'All rights reserved',
  },
  pages: {
    home: { eyebrow: 'Creative Studio · Shanghai', slogan: 'Make Them Look', kicker: '制造注意力' },
    work: { title: 'Work', idx: 'SELECTED WORK' },
    services: { title: 'Services', idx: 'WHAT WE DO' },
    about: { title: 'About', idx: 'STUDIO' },
    news: { title: 'News', idx: 'JOURNAL' },
    contact: { title: 'Contact', idx: 'START A PROJECT' },
    privacy: { title: 'Privacy Policy', idx: 'PRIVACY' },
  },
  sections: {
    services: 'What We Do',
    work: 'Selected Work',
    news: 'Latest',
  },
  labels: {
    viewAll: 'View all',
    related: 'Related work',
    relatedNews: 'Related reading',
    client: 'Client',
    service: 'Services',
    team: 'Team',
    clients: 'Clients',
    awards: 'Awards',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    viewMap: 'View on map',
    follow: 'Follow us',
    prev: 'Prev',
    next: 'Next',
    empty: 'Coming soon',
  },
  common: { comingSoon: 'Coming soon', backHome: 'Back home' },
}

export default en
