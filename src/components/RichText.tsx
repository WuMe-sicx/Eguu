import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

// 渲染 Lexical(RSC 安全)。空内容(无节点)返回 null,避免渲染空块。
export default function RichText({ data, className }: { data: unknown; className?: string }) {
  if (!data || typeof data !== 'object') return null
  const state = data as SerializedEditorState
  const children = state.root?.children
  if (!Array.isArray(children) || children.length === 0) return null
  return (
    <div className={className}>
      <LexicalRichText data={state} />
    </div>
  )
}
