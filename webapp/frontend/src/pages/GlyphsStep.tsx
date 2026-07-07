import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Pencil, Search, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Badge, Button, Input, Spinner } from '../components/ui'

import type { GlyphEntry, Project } from '../types'
import { useProject } from './ProjectLayout'

// The thumbnail URL has no font identity in its path, so the browser would
// keep serving a cached SVG (from a previously selected font) for the same
// glyph name. Tie the cache key to the font that actually renders it.
function glyphSvgUrl(projectId: string, glyph: GlyphEntry, project?: Project): string {
  const token =
    glyph.font === 'base'
      ? project?.base_font?.sha256
      : glyph.font === 'pinyin'
        ? project?.pinyin_font?.sha256
        : project?.tasks.build.finished_at
  const base = `/api/projects/${projectId}/glyphs/${encodeURIComponent(glyph.name)}/svg`
  return token ? `${base}?v=${token.slice(0, 12)}` : base
}

const CATEGORIES = [
  { value: '', label: 'すべて' },
  { value: 'hanzi', label: '漢字' },
  { value: 'pinyin_alphabet', label: '拼音英字' },
  { value: 'pronunciation', label: '発音グリフ' },
  { value: 'other', label: 'その他' },
]

const COLUMNS = 8
const PAGE_SIZE = 1000

export default function GlyphsStep() {
  const { project, projectId } = useProject()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<GlyphEntry | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const glyphs = useQuery({
    queryKey: ['glyphs', projectId, debouncedQuery, category, page],
    queryFn: () =>
      api.listGlyphs(projectId, {
        q: debouncedQuery,
        category,
        page,
        size: PAGE_SIZE,
      }),
    placeholderData: (previous) => previous,
  })

  const rows = useMemo(() => {
    const items = glyphs.data?.glyphs ?? []
    const result: GlyphEntry[][] = []
    for (let i = 0; i < items.length; i += COLUMNS) {
      result.push(items.slice(i, i + COLUMNS))
    }
    return result
  }, [glyphs.data])

  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 128,
    overscan: 4,
  })

  const totalPages = glyphs.data ? Math.max(1, Math.ceil(glyphs.data.total / PAGE_SIZE)) : 1

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-line px-6 py-4">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-600" />
            <Input
              className="pl-9"
              placeholder="グリフ名・文字・U+XXXX で検索"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                clearTimeout(debounceTimer.current)
                debounceTimer.current = setTimeout(() => {
                  setDebouncedQuery(e.target.value)
                  setPage(1)
                }, 300)
              }}
            />
          </div>
          <div className="flex gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  setCategory(c.value)
                  setPage(1)
                }}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  category === c.value
                    ? 'bg-accent/20 text-accent-hover'
                    : 'text-slate-400 hover:bg-surface-overlay'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            {glyphs.isFetching && <Spinner />}
            {glyphs.data && (
              <span>{glyphs.data.total.toLocaleString()} グリフ</span>
            )}
          </div>
        </div>

        {category === 'pronunciation' && glyphs.data?.total === 0 && (
          <div className="mx-6 mt-4 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-slate-400">
            発音グリフ（拼音を合成した .ssNN グリフ）はビルド時に生成されます。
            フォントをビルドすると、ここに一覧表示されます。
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
          <div
            style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => (
              <div
                key={virtualRow.key}
                className="absolute left-0 top-0 grid w-full grid-cols-8 gap-3"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                {rows[virtualRow.index]?.map((glyph) => (
                  <GlyphCell
                    key={glyph.name}
                    glyph={glyph}
                    projectId={projectId}
                    project={project}
                    selected={selected?.name === glyph.name}
                    onClick={() => setSelected(glyph)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 border-t border-line py-3 text-sm">
            <Button variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              前へ
            </Button>
            <span className="text-slate-500">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              次へ
            </Button>
          </div>
        )}
      </div>

      {selected && (
        <GlyphDetailPanel
          projectId={projectId}
          project={project}
          glyph={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function GlyphCell({
  glyph,
  projectId,
  project,
  selected,
  onClick,
}: {
  glyph: GlyphEntry
  projectId: string
  project?: Project
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-28 flex-col items-center justify-center rounded-lg border p-2 transition-colors ${
        selected ? 'border-accent bg-accent/10' : 'border-line hover:border-slate-500'
      }`}
    >
      <img
        src={glyphSvgUrl(projectId, glyph, project)}
        alt={glyph.name}
        loading="lazy"
        className="h-14 w-14 object-contain"
      />
      <span className="mt-1 w-full truncate text-center text-[10px] text-slate-500">
        {glyph.label ?? glyph.char ?? glyph.name}
      </span>
    </button>
  )
}

function GlyphDetailPanel({
  projectId,
  project,
  glyph,
  onClose,
}: {
  projectId: string
  project?: Project
  glyph: GlyphEntry
  onClose: () => void
}) {
  const navigate = useNavigate()
  const detail = useQuery({
    queryKey: ['glyph', projectId, glyph.name],
    queryFn: () => api.glyphDetail(projectId, glyph.name),
  })

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-line bg-surface-raised p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">グリフ詳細</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-line bg-surface p-6">
        <img
          src={glyphSvgUrl(projectId, glyph, project)}
          alt={glyph.name}
          className="mx-auto h-32 w-32 object-contain"
        />
      </div>

      <dl className="space-y-3 text-sm">
        {glyph.category === 'pronunciation' ? (
          <>
            <DetailRow label="名称" value={glyph.label ?? glyph.name} />
            <DetailRow label="読み" value={glyph.variant_label ?? ''} />
          </>
        ) : (
          glyph.char && <DetailRow label="文字" value={glyph.char} />
        )}
        {glyph.codepoints.length > 0 && (
          <DetailRow label="Unicode" value={glyph.codepoints.join(', ')} mono />
        )}
        <DetailRow label="advance width" value={String(glyph.advance_width)} mono />
        <DetailRow label="グリフ名（内部）" value={glyph.name} mono />
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">カテゴリ</dt>
          <dd className="mt-1">
            <Badge tone={glyph.category === 'hanzi' ? 'accent' : 'default'}>
              {glyph.category}
            </Badge>
          </dd>
        </div>
        {detail.data && detail.data.tables.length > 0 && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">所属字表</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {detail.data.tables.map((table) => (
                <Badge key={table.id} tone="accent">
                  {table.label}
                </Badge>
              ))}
            </dd>
          </div>
        )}
        {detail.data && detail.data.readings.length > 0 && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">読み（拼音）</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {detail.data.readings.map((reading) => (
                <Badge key={reading} tone="success">
                  {reading}
                </Badge>
              ))}
            </dd>
          </div>
        )}
        {detail.data && detail.data.ivs.length > 0 && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              IVS 切り替え
            </dt>
            <dd className="mt-1.5 space-y-1">
              {detail.data.ivs.map((seq) => (
                <div
                  key={seq.selector}
                  className="flex items-center gap-2 rounded-md bg-surface px-2 py-1.5 text-xs"
                >
                  <span className="font-mono text-slate-400">
                    {glyph.char}
                    <span className="text-accent-hover">+{seq.selector}</span>
                  </span>
                  <span className="text-slate-600">→</span>
                  {seq.reading ? (
                    <Badge tone="success">{seq.reading}</Badge>
                  ) : (
                    <Badge>拼音なし</Badge>
                  )}
                  <span className="ml-auto text-slate-600">{seq.glyph_suffix}</span>
                </div>
              ))}
            </dd>
          </div>
        )}
      </dl>

      {glyph.char && (
        <Button
          variant="ghost"
          className="mt-5 w-full"
          onClick={() =>
            navigate(`/projects/${projectId}/readings?char=${encodeURIComponent(glyph.char!)}`)
          }
        >
          <span className="flex items-center justify-center gap-2">
            <Pencil className="h-4 w-4" /> 読みを追加・編集
          </span>
        </Button>
      )}
    </aside>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 break-all text-slate-200 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </dd>
    </div>
  )
}
