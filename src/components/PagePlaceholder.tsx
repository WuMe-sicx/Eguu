// 阶段3 骨架用:内页头 + 占位体(阶段4 逐页替换为真实内容)
export default function PagePlaceholder({
  title,
  idx,
  note,
}: {
  title: string
  idx: string
  note: string
}) {
  return (
    <>
      <header className="page-header reveal">
        <span className="idx mono">{idx}</span>
        <h1>{title}</h1>
      </header>
      <section className="page-body">
        <span className="placeholder">
          {note} · {idx}
        </span>
      </section>
    </>
  )
}
