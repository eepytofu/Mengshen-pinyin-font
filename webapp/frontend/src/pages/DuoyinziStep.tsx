import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useRef, useState } from 'react'
import { Badge, Button, Input, Spinner } from '../components/ui'
import { useProject } from './ProjectLayout'

interface DuoyinziRow {
  char: string
  readings: string[]
  pattern_one: { index: number; pinyin: string; phrases: string[] }[]
  pattern_two_phrases: string[]
  exceptional_phrases: string[]
}

interface GsubOverview {
  languages: Record<string, { features: string[] }>
  features: Record<string, string[]>
  lookups: Record<string, { type: string; rule_count: number }>
  lookup_order: string[]
}

interface GsubRules {
  lookup: string
  type: string
  total: number
  page: number
  size: number
  rules: Record<string, unknown>[]
  glyph_chars: Record<string, string>
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? res.statusText)
  }
  return res.json()
}

export default function DuoyinziStep() {
  const [tab, setTab] = useState<'duoyinzi' | 'gsub'>('duoyinzi')

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-6 py-3">
        {(
          [
            ['duoyinzi', '多音字パターン'],
            ['gsub', 'GSUB (rclt) テーブル'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`rounded-lg px-4 py-1.5 text-sm transition-colors ${
              tab === value
                ? 'bg-accent/15 font-medium text-accent-hover'
                : 'text-slate-400 hover:bg-surface-overlay'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'duoyinzi' ? <DuoyinziTab /> : <GsubTab />}
    </div>
  )
}

function DuoyinziTab() {
  const { projectId } = useProject()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const data = useQuery({
    queryKey: ['duoyinzi', projectId, debounced, page],
    queryFn: () =>
      fetchJson<{ total: number; items: DuoyinziRow[] }>(
        `/api/projects/${projectId}/duoyinzi?q=${encodeURIComponent(debounced)}&page=${page}&size=30`,
      ),
    placeholderData: (prev) => prev,
  })

  const totalPages = data.data ? Math.max(1, Math.ceil(data.data.total / 30)) : 1

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-600" />
          <Input
            className="pl-9"
            placeholder="文字・拼音・フレーズで検索"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              clearTimeout(timer.current)
              timer.current = setTimeout(() => {
                setDebounced(e.target.value)
                setPage(1)
              }, 300)
            }}
          />
        </div>
        <span className="text-xs text-slate-500">
          {data.data ? `${data.data.total} 字の多音字に対応` : ''}
        </span>
        {data.isFetching && <Spinner />}
      </div>

      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">文字</th>
              <th className="px-4 py-3">読み</th>
              <th className="px-4 py-3">パターン（読みごとのフレーズ）</th>
              <th className="px-4 py-3">熟語・例外</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.data?.items.map((row) => (
              <tr key={row.char} className="align-top hover:bg-surface-raised/50">
                <td className="px-4 py-3 text-2xl text-slate-100">{row.char}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {row.readings.map((r, i) => (
                      <Badge key={r} tone={i === 0 ? 'success' : 'accent'}>
                        {r}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1.5">
                    {row.pattern_one.map((p) => (
                      <div key={p.index} className="text-xs">
                        <span className="mr-2 font-medium text-accent-hover">{p.pinyin}</span>
                        <span className="text-slate-400">
                          {p.phrases.slice(0, 6).join('、')}
                          {p.phrases.length > 6 && ` …他${p.phrases.length - 6}件`}
                        </span>
                      </div>
                    ))}
                    {row.pattern_one.length === 0 && (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {[...row.pattern_two_phrases, ...row.exceptional_phrases]
                    .slice(0, 5)
                    .join('、') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
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
  )
}

function GsubTab() {
  const { projectId } = useProject()
  const [lookup, setLookup] = useState('lookup_rclt_0')
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const overview = useQuery({
    queryKey: ['gsub', projectId],
    queryFn: () => fetchJson<GsubOverview>(`/api/projects/${projectId}/gsub`),
    retry: false,
  })

  const rules = useQuery({
    queryKey: ['gsub-rules', projectId, lookup, debounced, page],
    queryFn: () =>
      fetchJson<GsubRules>(
        `/api/projects/${projectId}/gsub/${lookup}?q=${encodeURIComponent(debounced)}&page=${page}&size=50`,
      ),
    enabled: overview.isSuccess,
    placeholderData: (prev) => prev,
  })

  if (overview.isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-center">
        <div>
          <p className="text-slate-300">{(overview.error as Error).message}</p>
          <p className="mt-2 text-sm text-slate-500">
            GSUB テーブルの表示にはテンプレート準備（prepare）の完了が必要です。
          </p>
        </div>
      </div>
    )
  }
  if (!overview.data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const rcltLookups = Object.entries(overview.data.lookups).filter(([name]) =>
    name.startsWith('lookup_rclt') || name.startsWith('lookup_aalt'),
  )
  const totalPages = rules.data ? Math.max(1, Math.ceil(rules.data.total / 50)) : 1

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-line p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Feature / Lookup
        </h4>
        <div className="mb-4 space-y-1 text-xs text-slate-400">
          {Object.entries(overview.data.features).map(([feature, lookups]) => (
            <div key={feature} className="rounded-lg bg-surface-raised px-3 py-2">
              <span className="font-mono text-accent-hover">{feature}</span>
              <span className="ml-1 text-slate-600">({lookups.length} lookups)</span>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          {rcltLookups.map(([name, meta]) => (
            <button
              key={name}
              onClick={() => {
                setLookup(name)
                setPage(1)
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${
                lookup === name
                  ? 'bg-accent/15 text-accent-hover'
                  : 'text-slate-400 hover:bg-surface-overlay'
              }`}
            >
              <span className="font-mono">{name}</span>
              <span className="text-slate-600">{meta.rule_count}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-600">
          rclt_0 = パターン1（単語コンテキスト）、rclt_1 = パターン2（熟語）、
          rclt_2 = 例外パターン。読みの変更はビルド時に再生成されます。
        </p>
      </aside>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 flex items-center gap-3">
          <Input
            className="max-w-xs"
            placeholder="文字 or グリフ名でルールを検索"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              clearTimeout(timer.current)
              timer.current = setTimeout(() => {
                setDebounced(e.target.value)
                setPage(1)
              }, 300)
            }}
          />
          <span className="text-xs text-slate-500">
            {rules.data && `${rules.data.total} ルール (${rules.data.type})`}
          </span>
          {rules.isFetching && <Spinner />}
        </div>

        <div className="space-y-2">
          {rules.data?.rules.map((rule, i) => (
            <RuleCard key={i} rule={rule} glyphChars={rules.data?.glyph_chars ?? {}} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
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
    </div>
  )
}

function RuleCard({
  rule,
  glyphChars,
}: {
  rule: Record<string, unknown>
  glyphChars: Record<string, string>
}) {
  const match = (rule.match as string[][] | undefined) ?? []
  const apply = (rule.apply as { at: number; lookup: string }[] | undefined) ?? []

  const renderGroup = (group: string[], index: number) => {
    const applied = apply.some((a) => a.at === index)
    const label = group
      .slice(0, 3)
      .map((g) => glyphChars[g] ?? g)
      .join(' ')
    return (
      <span
        key={index}
        className={`rounded-md px-2 py-1 font-mono text-xs ${
          applied
            ? 'bg-accent/20 text-accent-hover ring-1 ring-accent/40'
            : 'bg-surface-overlay text-slate-300'
        }`}
        title={group.join(', ')}
      >
        {label}
        {group.length > 3 && <span className="text-slate-600"> +{group.length - 3}</span>}
      </span>
    )
  }

  if (match.length > 0) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface-raised px-3 py-2">
        {match.map(renderGroup)}
        {apply.length > 0 && (
          <span className="ml-2 text-xs text-slate-500">
            → {apply.map((a) => a.lookup).join(', ')}
          </span>
        )}
      </div>
    )
  }

  return (
    <pre className="overflow-x-auto rounded-lg border border-line bg-surface-raised px-3 py-2 text-xs text-slate-400">
      {JSON.stringify(rule, null, 1)}
    </pre>
  )
}
