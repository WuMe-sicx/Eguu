import PagePlaceholder from '@/components/PagePlaceholder'
import { getDict, isLocale } from '@/i18n'

export default async function WorkPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const dict = getDict(isLocale(locale) ? locale : 'zh')
  const p = dict.pages.work
  return <PagePlaceholder title={p.title} idx={p.idx} note={dict.common.comingSoon} />
}
