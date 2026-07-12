// 内页头:等宽索引标签 + 大标题(列表页/关于/联系/隐私复用)。
export default function PageHeader({
  title,
  idx,
  lede,
}: {
  title: string
  idx: string
  lede?: string
}) {
  return (
    <header className="page-header reveal">
      <span className="idx mono">{idx}</span>
      <h1>{title}</h1>
      {lede && <p className="page-lede">{lede}</p>}
    </header>
  )
}
