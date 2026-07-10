import { useMutation, useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, Input, Spinner } from '../components/ui'
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
  const [tab, setTab] = useState<'duoyinzi' | 'gsub' | 'ivs' | 'verify'>('duoyinzi')

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-6 py-3">
        {(['duoyinzi', 'gsub', 'ivs', 'verify'] as const).map((value) => (
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
      {tab === 'duoyinzi' ? (
        <DuoyinziTab />
      ) : tab === 'gsub' ? (
        <GsubTab />
      ) : tab === 'ivs' ? (
        <IvsTab />
      ) : (
        <VerifyTab />
      )}
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
  const [mode, setMode] = useState<'rules' | 'graph'>('rules')
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

  const modeToggle = (
    <div className="flex gap-1 rounded-lg bg-surface p-0.5">
      {(['rules', 'graph'] as const).map((value) => (
        <button
          key={value}
          onClick={() => setMode(value)}
          className={`rounded-md px-3 py-1 text-xs transition-colors ${
            mode === value
              ? 'bg-accent/20 font-medium text-accent-hover'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {t(`duoyinzi.gsub.mode.${value}`)}
        </button>
      ))}
    </div>
  )

  if (mode === 'graph') {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line px-6 py-3">
          {modeToggle}
        </div>
        <GsubGraphView projectId={projectId} />
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-line p-4">
        <div className="mb-4">{modeToggle}</div>
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

// ---- GSUB rule graph ----

interface GraphRule {
  lookup: string
  rule: number
  context: string[][]
  target_at: number | null
  sub_lookup: string | null
  output_glyph: string | null
  output_reading: string | null
  ignore: boolean
}

interface GraphData {
  char: string
  glyph: string | null
  readings: string[]
  rules: GraphRule[]
}

// SVG stroke colors matching SS_COLORS order (emerald/sky/amber/rose)
const EDGE_COLORS = ['#34d399', '#38bdf8', '#fbbf24', '#fb7185']
const IGNORE_COLOR = '#f43f5e'
const DEFAULT_COLOR = '#64748b'

const ROW_H = 52
const COL_CONTEXT_W = 280
const COL_LOOKUP_X = 340
const COL_LOOKUP_W = 170
const COL_OUTPUT_X = 570
const COL_OUTPUT_W = 170

function GsubGraphView({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const [input, setInput] = useState('着')
  const [char, setChar] = useState('着')

  const graph = useQuery({
    queryKey: ['gsub-graph', projectId, char],
    queryFn: () =>
      fetchJson<GraphData>(
        `/api/projects/${projectId}/gsub/graph/${encodeURIComponent(char)}`,
      ),
    enabled: char.length === 1,
  })

  return (
    <div className="flex-1 overflow-auto px-6 py-4">
      <div className="mb-3 flex items-center gap-3">
        <Input
          className="max-w-[10rem] text-center text-lg"
          value={input}
          maxLength={1}
          placeholder={t('duoyinzi.graph.charPlaceholder')}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.length === 1) setChar(input)
          }}
        />
        <Button onClick={() => setChar(input)} disabled={input.length !== 1}>
          {t('duoyinzi.graph.show')}
        </Button>
        {graph.data && (
          <span className="text-xs text-slate-500">
            {t('duoyinzi.graph.rulesCount', { count: graph.data.rules.length })}
          </span>
        )}
        {graph.isFetching && <Spinner />}
      </div>

      <p className="mb-4 max-w-3xl text-xs leading-relaxed text-slate-600">
        {t('duoyinzi.graph.legend')}
      </p>

      {graph.data &&
        (graph.data.rules.length === 0 ? (
          <p className="text-sm text-slate-500">{t('duoyinzi.graph.noRules')}</p>
        ) : (
          <RuleGraph data={graph.data} />
        ))}
    </div>
  )
}

function RuleGraph({ data }: { data: GraphData }) {
  const { t } = useTranslation()
  const rules = data.rules

  // Middle column: unique sub-lookups (ignore rules get their own node)
  const lookupKeys: string[] = []
  for (const rule of rules) {
    const key = rule.ignore ? 'ignore' : (rule.sub_lookup ?? '—')
    if (!lookupKeys.includes(key)) lookupKeys.push(key)
  }
  // Right column: unique outputs (ignore -> keeps default)
  const outputKeys: string[] = []
  for (const rule of rules) {
    const key = rule.ignore ? '__default__' : (rule.output_reading ?? '?')
    if (!outputKeys.includes(key)) outputKeys.push(key)
  }

  const ruleY = (index: number) => index * ROW_H + ROW_H / 2
  const ruleKeyOf = (rule: GraphRule) => (rule.ignore ? 'ignore' : (rule.sub_lookup ?? '—'))
  const outputKeyOf = (rule: GraphRule) =>
    rule.ignore ? '__default__' : (rule.output_reading ?? '?')

  // Position middle/right nodes at the average of their sources, then
  // spread overlapping nodes apart
  const spread = (centers: number[]): number[] => {
    const order = centers
      .map((y, index) => ({ y, index }))
      .sort((a, b) => a.y - b.y)
    let previous = -Infinity
    const result = [...centers]
    for (const item of order) {
      const y = Math.max(item.y, previous + ROW_H * 0.85)
      result[item.index] = y
      previous = y
    }
    return result
  }

  const lookupY = spread(
    lookupKeys.map((key) => {
      const sources = rules
        .map((r, index) => ({ r, index }))
        .filter(({ r }) => ruleKeyOf(r) === key)
        .map(({ index }) => ruleY(index))
      return sources.reduce((a, b) => a + b, 0) / sources.length
    }),
  )
  const outputY = spread(
    outputKeys.map((key) => {
      const sources = rules
        .map((r, index) => ({ r, index }))
        .filter(({ r }) => outputKeyOf(r) === key)
        .map(({ index }) => ruleY(index))
      return sources.reduce((a, b) => a + b, 0) / sources.length
    }),
  )

  const colorOf = (rule: GraphRule): string => {
    if (rule.ignore) return IGNORE_COLOR
    if (rule.output_reading == null) return DEFAULT_COLOR
    const index = data.readings.indexOf(rule.output_reading)
    return index >= 0 ? EDGE_COLORS[index % EDGE_COLORS.length] : DEFAULT_COLOR
  }
  const chipColorOf = (readingIndex: number) =>
    SS_COLORS[readingIndex % SS_COLORS.length]

  const height = Math.max(
    rules.length * ROW_H,
    (lookupY[lookupY.length - 1] ?? 0) + ROW_H,
    (outputY[outputY.length - 1] ?? 0) + ROW_H,
  )
  const width = COL_OUTPUT_X + COL_OUTPUT_W

  return (
    <div className="relative" style={{ width, height }}>
      {/* edges */}
      <svg className="absolute inset-0" width={width} height={height}>
        {rules.map((rule, index) => {
          const y1 = ruleY(index)
          const y2 = lookupY[lookupKeys.indexOf(ruleKeyOf(rule))]
          const y3 = outputY[outputKeys.indexOf(outputKeyOf(rule))]
          const color = colorOf(rule)
          const dash = rule.ignore ? '5 4' : undefined
          return (
            <g key={`${rule.lookup}-${rule.rule}-${index}`} opacity={0.75}>
              <path
                d={`M ${COL_CONTEXT_W} ${y1} C ${COL_CONTEXT_W + 34} ${y1}, ${COL_LOOKUP_X - 34} ${y2}, ${COL_LOOKUP_X} ${y2}`}
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray={dash}
                fill="none"
              />
              <path
                d={`M ${COL_LOOKUP_X + COL_LOOKUP_W} ${y2} C ${COL_LOOKUP_X + COL_LOOKUP_W + 34} ${y2}, ${COL_OUTPUT_X - 34} ${y3}, ${COL_OUTPUT_X} ${y3}`}
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray={dash}
                fill="none"
              />
            </g>
          )
        })}
      </svg>

      {/* context nodes (one per rule) */}
      {rules.map((rule, index) => (
        <div
          key={`ctx-${index}`}
          className="absolute flex items-center gap-1"
          style={{ top: ruleY(index) - 16, left: 0, width: COL_CONTEXT_W, height: 32 }}
        >
          <span className="mr-1 font-mono text-[9px] text-slate-600">
            {rule.lookup.replace('lookup_', '')}
          </span>
          {rule.context.map((group, groupIndex) => (
            <span
              key={groupIndex}
              className={`rounded px-1.5 py-0.5 text-sm leading-none ${
                groupIndex === rule.target_at
                  ? rule.ignore
                    ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/50'
                    : 'bg-accent/15 text-accent-hover ring-1 ring-accent/40'
                  : 'bg-surface-overlay text-slate-400'
              }`}
              title={group.join(' ')}
            >
              {group.length > 2 ? `${group.slice(0, 2).join('')}…` : group.join('')}
            </span>
          ))}
        </div>
      ))}

      {/* lookup nodes */}
      {lookupKeys.map((key, index) => (
        <div
          key={`lk-${key}`}
          className={`absolute flex items-center justify-center rounded-lg border px-2 font-mono text-[11px] ${
            key === 'ignore'
              ? 'border-rose-500/50 bg-rose-500/10 text-rose-300'
              : 'border-line bg-surface-raised text-slate-300'
          }`}
          style={{
            top: lookupY[index] - 15,
            left: COL_LOOKUP_X,
            width: COL_LOOKUP_W,
            height: 30,
          }}
        >
          {key === 'ignore' ? t('duoyinzi.graph.ignoreNode') : key}
        </div>
      ))}

      {/* output nodes */}
      {outputKeys.map((key, index) => {
        const readingIndex = key === '__default__' ? -1 : data.readings.indexOf(key)
        return (
          <div
            key={`out-${key}`}
            className={`absolute flex items-center justify-center rounded-full border px-2 text-sm ${
              key === '__default__'
                ? 'border-line bg-surface text-slate-500'
                : readingIndex >= 0
                  ? chipColorOf(readingIndex)
                  : 'border-line bg-surface text-slate-300'
            }`}
            style={{
              top: outputY[index] - 15,
              left: COL_OUTPUT_X,
              width: COL_OUTPUT_W,
              height: 30,
            }}
          >
            {key === '__default__' ? (
              <span className="text-xs">{t('duoyinzi.graph.defaultOutput')}</span>
            ) : (
              key
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---- GSUB verification tab ----

interface SimApplied {
  lookup: string
  rule: number
  ignored?: boolean
  sub_lookup?: string
  from?: string
  to?: string
}

interface SimChar {
  char: string
  glyph: string | null
  final_glyph: string | null
  reading: string | null
  default_reading: string | null
  applied: SimApplied[]
}

interface VerifyChar {
  char: string
  expected: string
  actual: string | null
  default: string | null
  status: 'ok' | 'fallback' | 'wrong'
}

interface VerifyRow {
  phrase: string
  source: string
  status: 'ok' | 'fallback' | 'wrong'
  chars: VerifyChar[]
}

interface VerifyReport {
  total: number
  counts: { ok: number; fallback: number; wrong: number }
  results: VerifyRow[]
}

const STATUS_TONE = {
  ok: 'success',
  fallback: 'warning',
  wrong: 'error',
} as const

const STATUS_TEXT = {
  ok: 'text-emerald-400',
  fallback: 'text-amber-400',
  wrong: 'text-rose-400',
} as const

function VerifyTab() {
  const { projectId } = useProject()
  const { t } = useTranslation()
  const [text, setText] = useState('背着手')
  const [filter, setFilter] = useState<'all' | 'ok' | 'fallback' | 'wrong'>('wrong')

  const simulate = useMutation({
    mutationFn: async (value: string) => {
      const res = await fetch(`/api/projects/${projectId}/gsub/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new ApiError((body as { detail?: never }).detail, res.statusText)
      }
      return res.json() as Promise<{ text: string; chars: SimChar[] }>
    },
  })

  const verify = useMutation({
    mutationFn: () => fetchJson<VerifyReport>(`/api/projects/${projectId}/gsub/verify`),
  })

  const filtered =
    verify.data?.results.filter((r) => filter === 'all' || r.status === filter) ?? []
  const shown = filtered.slice(0, 300)

  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
      <Card title={t('duoyinzi.verify.simTitle')}>
        <p className="mb-3 text-xs leading-relaxed text-slate-600">
          {t('duoyinzi.verify.simNote')}
        </p>
        <div className="flex gap-2">
          <Input
            className="max-w-[14rem]"
            value={text}
            placeholder={t('duoyinzi.verify.simPlaceholder')}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && text.trim()) simulate.mutate(text.trim())
            }}
          />
          <Button
            disabled={!text.trim() || simulate.isPending}
            onClick={() => simulate.mutate(text.trim())}
          >
            {t('duoyinzi.verify.simRun')}
          </Button>
          {simulate.isPending && <Spinner />}
        </div>
        {simulate.isError && (
          <p className="mt-3 text-sm text-rose-400">{displayError(simulate.error)}</p>
        )}
        {simulate.data && (
          <div className="mt-4 flex flex-wrap gap-3">
            {simulate.data.chars.map((row, index) => {
              const substituted = row.applied.some((a) => a.to)
              const ignored = row.applied.some((a) => a.ignored)
              return (
                <div
                  key={`${row.char}-${index}`}
                  className={`min-w-[9rem] rounded-xl border p-3 ${
                    substituted
                      ? 'border-accent/50 bg-accent/5'
                      : ignored
                        ? 'border-rose-500/40 bg-rose-500/5'
                        : 'border-line bg-surface-raised'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl text-slate-100">{row.char}</span>
                    {row.reading ? (
                      <Badge tone={substituted ? 'accent' : 'default'}>
                        {row.reading}
                      </Badge>
                    ) : (
                      <Badge>—</Badge>
                    )}
                  </div>
                  <div className="mt-2 space-y-0.5 text-[11px] text-slate-500">
                    {row.applied.length === 0 && <p>{t('duoyinzi.verify.noRule')}</p>}
                    {row.applied.map((a, applyIndex) => (
                      <p key={applyIndex} className="font-mono">
                        {a.ignored ? (
                          <span className="text-rose-400">
                            {a.lookup.replace('lookup_', '')} #{a.rule}:{' '}
                            {t('duoyinzi.verify.ignored')}
                          </span>
                        ) : (
                          <>
                            {a.lookup.replace('lookup_', '')} #{a.rule} →{' '}
                            {a.sub_lookup?.replace('lookup_', '')}
                          </>
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card title={t('duoyinzi.verify.batchTitle')}>
        <p className="mb-3 text-xs leading-relaxed text-slate-600">
          {t('duoyinzi.verify.batchNote')}
        </p>
        <div className="flex items-center gap-3">
          <Button disabled={verify.isPending} onClick={() => verify.mutate()}>
            {verify.isPending ? t('duoyinzi.verify.running') : t('duoyinzi.verify.run')}
          </Button>
          {verify.isPending && <Spinner />}
          {verify.data && (
            <div className="flex gap-1.5">
              <button onClick={() => setFilter('all')}>
                <Badge tone={filter === 'all' ? 'accent' : 'default'}>
                  {t('duoyinzi.verify.all', { count: verify.data.total })}
                </Badge>
              </button>
              {(['ok', 'fallback', 'wrong'] as const).map((status) => (
                <button key={status} onClick={() => setFilter(status)}>
                  <Badge
                    tone={filter === status ? STATUS_TONE[status] : 'default'}
                    title={t(`duoyinzi.verify.statusHint.${status}`)}
                  >
                    {t('duoyinzi.verify.filterLabel', {
                      label: t(`duoyinzi.verify.status.${status}`),
                      count: verify.data!.counts[status],
                    })}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
        {verify.isError && (
          <p className="mt-3 text-sm text-rose-400">{displayError(verify.error)}</p>
        )}

        {verify.data && (
          <div className="mt-4 overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">{t('duoyinzi.verify.colPhrase')}</th>
                  <th className="px-4 py-2.5">{t('duoyinzi.verify.colSource')}</th>
                  <th className="px-4 py-2.5">{t('duoyinzi.verify.colDetail')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((row) => (
                  <tr key={row.phrase} className="align-top">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Badge
                          tone={STATUS_TONE[row.status]}
                          title={t(`duoyinzi.verify.statusHint.${row.status}`)}
                        >
                          {t(`duoyinzi.verify.status.${row.status}`)}
                        </Badge>
                        <span className="text-lg text-slate-100">{row.phrase}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                      {row.source}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-2">
                        {row.chars.map((c, charIndex) => (
                          <span
                            key={charIndex}
                            className="rounded-md bg-surface px-2 py-1 text-xs"
                            title={t('duoyinzi.verify.expectedActual', {
                              expected: c.expected,
                              actual: c.actual ?? '—',
                            })}
                          >
                            <span className="mr-1 text-base text-slate-200">
                              {c.char}
                            </span>
                            {c.status === 'ok' ? (
                              <span className={STATUS_TEXT.ok}>{c.actual}</span>
                            ) : (
                              <span className={STATUS_TEXT[c.status]}>
                                {c.expected} → {c.actual ?? '—'}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > shown.length && (
              <p className="border-t border-line px-4 py-2 text-xs text-slate-500">
                {t('duoyinzi.verify.truncated', {
                  shown: shown.length,
                  total: filtered.length,
                })}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
