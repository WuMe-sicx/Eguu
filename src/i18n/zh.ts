// UI 静态文案(不进数据库,§9)。en.ts 必须与本文件同构。
const zh = {
  brand: { name: '显影', sub: 'GRAIN' },
  nav: {
    work: '作品',
    services: '服务',
    about: '关于',
    news: '新闻',
    contact: '联系',
    menu: '菜单',
    close: '关闭',
  },
  a11y: {
    home: '显影 GRAIN 首页',
    toggleTheme: '切换深浅色',
    toThemeDark: '当前浅色,点击切换深色',
    toThemeLight: '当前深色,点击切换浅色',
    switchLang: '切换语言',
  },
  footer: {
    tagline: '创意热店 · 上海。为品牌制造注意力。',
    nav: '导航',
    contact: '联系 / 关注',
    privacy: '隐私政策',
    rights: '版权所有',
  },
  pages: {
    home: { eyebrow: '创意热店 · 上海', slogan: '制造注意力', kicker: 'MAKE THEM LOOK' },
    work: { title: '作品', idx: 'SELECTED WORK' },
    services: { title: '服务', idx: 'WHAT WE DO' },
    about: { title: '关于', idx: 'STUDIO' },
    news: { title: '新闻', idx: 'JOURNAL' },
    contact: { title: '联系', idx: 'START A PROJECT' },
    privacy: { title: '隐私政策', idx: 'PRIVACY' },
  },
  sections: {
    services: '核心服务',
    work: '精选案例',
    news: '最新动态',
  },
  labels: {
    viewAll: '查看全部',
    related: '相关案例',
    relatedNews: '相关阅读',
    client: '客户',
    service: '服务',
    team: '团队',
    clients: '合作客户',
    awards: '奖项',
    email: '邮箱',
    phone: '电话',
    address: '地址',
    viewMap: '在地图查看',
    follow: '关注我们',
    prev: '上一页',
    next: '下一页',
    empty: '内容即将上线',
  },
  common: { comingSoon: '内容建设中', backHome: '返回首页' },
}

export default zh
export type Dict = typeof zh
