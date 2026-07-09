import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Input, Spinner } from '../components/ui'
import { ApiError, displayError } from '../i18n/apiError'
import { useProject } from './ProjectLayout'

interface DuoyinziRow {
  char: string
  readings: string[]
  pattern_one: { index: number; pinyin: string; phrases: string[] }[]
  pattern_two_phrases: string[]
  exceptional_phrases: string[]
}

interface PhrasePattern {
  phrase: string
  ignore: string | null
  sequence: { char: string; lookup: string | null }[]
}

interface DuoyinziDetail extends DuoyinziRow {
  pattern_two_detail: PhrasePattern[]
  exceptional_detail: PhrasePattern[]
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
    throw new ApiError((body as { detail?: never }).detail, res.statusText)
  }
  return res.json()
}

export default function DuoyinziStep() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'duoyinzi' | 'gsub' | 'ivs'>('duoyinzi')

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-6 py-3">
        {(['duoyinzi', 'gsub', 'ivs'] as const).map((value) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`rounded-lg px-4 py-1.5 text-sm transition-colors ${
              tab === value
                ? 'bg-accent/15 font-medium text-accent-hover'
                : 'text-slate-400 hover:bg-surface-overlay'
            }`}
          >
            {t(`duoyinzi.tab.${value}`)}
          </button>
        ))}
      </div>
      {tab === 'duoyinzi' ? <DuoyinziTab /> : tab === 'gsub' ? <GsubTab /> : <IvsTab />}
    </div>
  )
}

interface IvsRow {
  char: string
  glyph: string
  readings: string[]
  sequences: {
    selector: string
    glyph_suffix: string
    reading: string | null
    description: string
  }[]
}

function IvsTab() {
  const { projectId } = useProject()
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [homographsOnly, setHomographsOnly] = useState(true)
  const [page, setPage] = useState(1)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const data = useQuery({
    queryKey: ['ivs', projectId, debounced, homographsOnly, page],
    queryFn: () =>
      fetchJson<{ total: number; items: IvsRow[] }>(
        `/api/projects/${projectId}/ivs?q=${encodeURIComponent(debounced)}&homographs_only=${homographsOnly}&page=${page}&size=30`,
      ),
    placeholderData: (prev) => prev,
  })

  const totalPages = data.data ? Math.max(1, Math.ceil(data.data.total / 30)) : 1

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="mb-4 flex items-center gap-4">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-600" />
          <Input
            className="pl-9"
            placeholder={t('duoyinzi.ivs.searchPlaceholder')}
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
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
          <input
            type="checkbox"
            className="h-4 w-4 accent-indigo-500"
            checked={homographsOnly}
            onChange={(e) => {
              setHomographsOnly(e.target.checked)
              setPage(1)
            }}
          />
          {t('duoyinzi.ivs.homographsOnly')}
        </label>
        <span className="ml-auto text-xs text-slate-500">
          {data.data &&
            t('duoyinzi.ivs.assignedCount', {
              count: data.data.total.toLocaleString(),
            })}
        </span>
        {data.isFetching && <Spinner />}
      </div>

      <p className="mb-3 text-xs leading-relaxed text-slate-600">
        {t('duoyinzi.ivs.note')}
      </p>

      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">{t('duoyinzi.ivs.colChar')}</th>
              <th className="px-4 py-3">{t('duoyinzi.ivs.colGlyph')}</th>
              <th className="px-4 py-3">{t('duoyinzi.ivs.colSequence')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.data?.items.map((row) => (
              <tr key={row.char} className="align-top hover:bg-surface-raised/50">
                <td className="px-4 py-3 text-2xl text-slate-100">{row.char}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                  {row.glyph}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {row.sequences.map((seq) => (
                      <span
                        key={seq.selector}
                        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-xs"
                        title={seq.description}
                      >
                        <span className="font-mono text-slate-400">
                          {row.char}
                          <span className="text-accent-hover">+{seq.selector}</span>
                        </span>
                        <span className="text-slate-700">→</span>
                        {seq.reading ? (
                          <Badge tone="success">{seq.reading}</Badge>
                        ) : (
                          <Badge>{t('duoyinzi.noPinyin')}</Badge>
                        )}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {t('common.prev')}
          </Button>
          <span className="text-slate-500">
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t('common.next')}
          </Button>
        </div>
      )}
    </div>
  )
}

function DuoyinziTab() {
  const { projectId } = useProject()
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)
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
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-600" />
          <Input
            className="pl-9"
            placeholder={t('duoyinzi.list.searchPlaceholder')}
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
          {data.data
            ? t('duoyinzi.list.supportedCount', { count: data.data.total })
            : ''}
        </span>
        {data.isFetching && <Spinner />}
      </div>

      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">{t('duoyinzi.list.colChar')}</th>
              <th className="px-4 py-3">{t('duoyinzi.list.colReading')}</th>
              <th className="px-4 py-3">{t('duoyinzi.list.colPattern')}</th>
              <th className="px-4 py-3">{t('duoyinzi.list.colPhrases')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.data?.items.map((row) => (
              <tr
                key={row.char}
                onClick={() => setSelected(row.char)}
                className={`cursor-pointer align-top transition-colors ${
                  selected === row.char
                    ? 'bg-accent/10'
                    : 'hover:bg-surface-raised/50'
                }`}
              >
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
                          {p.phrases.length > 6 &&
                            t('duoyinzi.list.moreCount', {
                              count: p.phrases.length - 6,
                            })}
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
            {t('common.prev')}
            </Button>
            <span className="text-slate-500">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              {t('common.next')}
            </Button>
          </div>
        )}
      </div>

      {selected && (
        <PatternGraphPanel
          projectId={projectId}
          char={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

const SS_COLORS = [
  'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  'text-sky-400 border-sky-500/40 bg-sky-500/10',
  'text-amber-400 border-amber-500/40 bg-amber-500/10',
  'text-rose-400 border-rose-500/40 bg-rose-500/10',
]

function PatternGraphPanel({
  projectId,
  char,
  onClose,
}: {
  projectId: string
  char: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const detail = useQuery({
    queryKey: ['duoyinzi-detail', projectId, char],
    queryFn: () =>
      fetchJson<DuoyinziDetail>(
        `/api/projects/${projectId}/duoyinzi/${encodeURIComponent(char)}`,
      ),
  })

  return (
    <aside className="w-[26rem] shrink-0 overflow-y-auto border-l border-line bg-surface-raised p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">
          {t('duoyinzi.pattern.title')}
        </h3>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
          ✕
        </button>
      </div>

      {!detail.data ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-6">
          <ReadingTree detail={detail.data} />

          {detail.data.pattern_two_detail.length > 0 && (
            <PhrasePatternList
              title={t('duoyinzi.pattern.patternTwo')}
              patterns={detail.data.pattern_two_detail}
              focusChar={char}
            />
          )}
          {detail.data.exceptional_detail.length > 0 && (
            <PhrasePatternList
              title={t('duoyinzi.pattern.exceptional')}
              patterns={detail.data.exceptional_detail}
              focusChar={char}
            />
          )}
        </div>
      )}
    </aside>
  )
}

/**
 * Tree: character -> readings -> trigger phrases.
 * Reading #1 is the default; others are applied by rclt context rules.
 */
function ReadingTree({ detail }: { detail: DuoyinziDetail }) {
  const { t } = useTranslation()
  const phrasesByPinyin = new Map(
    detail.pattern_one.map((p) => [p.pinyin, p] as const),
  )

  return (
    <div className="flex items-start gap-0">
      <div className="sticky top-0 flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-accent/50 bg-accent/10 text-4xl text-slate-100">
        {detail.char}
      </div>
      <div className="mt-8 w-5 shrink-0 border-t-2 border-line" />
      <div className="min-w-0 flex-1 border-l-2 border-line">
        {detail.readings.map((reading, index) => {
          const pattern = phrasesByPinyin.get(reading)
          const color = SS_COLORS[index % SS_COLORS.length]
          return (
            <div key={reading} className="relative pl-5 pb-4 last:pb-0">
              <span className="absolute left-0 top-4 w-4 border-t-2 border-line" />
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-sm font-medium ${color}`}
                >
                  {reading}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-slate-600">
                  {index === 0
                    ? t('duoyinzi.tree.default')
                    : t('duoyinzi.tree.ssContext', { n: index + 1 })}
                </span>
                <span
                  className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-slate-500"
                  title={t('duoyinzi.tree.forceIvsTitle', {
                    char: detail.char,
                    code: (0xe01e1 + index).toString(16).toUpperCase(),
                  })}
                >
                  IVS U+{(0xe01e1 + index).toString(16).toUpperCase()}
                </span>
              </div>
              {pattern && pattern.phrases.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pattern.phrases.map((phrase) => (
                    <PhraseChip key={phrase} phrase={phrase} char={detail.char} color={color} />
                  ))}
                </div>
              )}
              {(!pattern || pattern.phrases.length === 0) && index > 0 && (
                <p className="mt-1 text-[11px] text-slate-600">
                  {t('duoyinzi.tree.noWordContext')}
                </p>
              )}
            </div>
          )
        })}
        <div className="relative pl-5 pt-1">
          <span className="absolute left-0 top-4 w-4 border-t-2 border-line" />
          <div className="flex items-center gap-2 pt-1.5">
            <span className="rounded-full border border-line px-2.5 py-0.5 text-sm text-slate-500">
              {t('duoyinzi.tree.noPinyin')}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-slate-600">ss00</span>
            <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              IVS U+E01E0
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** One trigger phrase; ~ is the homograph position. */
function PhraseChip({
  phrase,
  char,
  color,
}: {
  phrase: string
  char: string
  color: string
}) {
  return (
    <span className="inline-flex overflow-hidden rounded-md border border-line text-sm">
      {[...phrase].map((c, i) =>
        c === '~' ? (
          <span key={i} className={`border-x px-1.5 py-0.5 font-medium ${color}`}>
            {char}
          </span>
        ) : (
          <span key={i} className="bg-surface px-1.5 py-0.5 text-slate-300">
            {c}
          </span>
        ),
      )}
    </span>
  )
}

/** Sequence diagrams for pattern-two / exceptional phrase rules. */
function PhrasePatternList({
  title,
  patterns,
  focusChar,
}: {
  title: string
  patterns: PhrasePattern[]
  focusChar: string
}) {
  const { t } = useTranslation()
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      <div className="space-y-2">
        {patterns.map((pattern) => (
          <div
            key={pattern.phrase}
            className="rounded-lg border border-line bg-surface px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-1">
              {pattern.sequence.map((step, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-slate-700">→</span>}
                  <span
                    className={`rounded-md px-2 py-1 text-lg leading-none ${
                      step.lookup
                        ? 'bg-accent/15 text-accent-hover ring-1 ring-accent/40'
                        : step.char === focusChar
                          ? 'bg-surface-overlay text-slate-100'
                          : 'bg-surface-overlay text-slate-400'
                    }`}
                    title={step.lookup ?? undefined}
                  >
                    {step.char}
                  </span>
                </span>
              ))}
              <span className="ml-2 text-[10px] text-slate-600">
                {t('duoyinzi.pattern.frameHint')}
              </span>
            </div>
            {pattern.ignore && (
              <p className="mt-1.5 text-[11px] text-slate-500">
                {t('duoyinzi.pattern.ignoreContext')}
                <span className="text-slate-400">{pattern.ignore}</span>
                {t('duoyinzi.pattern.ignoreNote')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function GsubTab() {
  const { projectId } = useProject()
  const { t } = useTranslation()
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
          <p className="text-slate-300">{displayError(overview.error)}</p>
          <p className="mt-2 text-sm text-slate-500">
            {t('duoyinzi.gsub.prepareRequired')}
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
          {t('duoyinzi.gsub.featureLookup')}
        </h4>
        <div className="mb-4 space-y-1 text-xs text-slate-400">
          {Object.entries(overview.data.features).map(([feature, lookups]) => (
            <div key={feature} className="rounded-lg bg-surface-raised px-3 py-2">
              <span className="font-mono text-accent-hover">{feature}</span>
              <span className="ml-1 text-slate-600">
                {t('duoyinzi.gsub.lookupsCount', { count: lookups.length })}
              </span>
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
          {t('duoyinzi.gsub.legend')}
        </p>
      </aside>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 flex items-center gap-3">
          <Input
            className="max-w-xs"
            placeholder={t('duoyinzi.gsub.searchPlaceholder')}
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
            {rules.data &&
              t('duoyinzi.gsub.rulesCount', {
                count: rules.data.total,
                type: rules.data.type,
              })}
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
            {t('common.prev')}
            </Button>
            <span className="text-slate-500">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              {t('common.next')}
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
