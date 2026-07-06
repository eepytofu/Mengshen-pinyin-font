import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, RotateCcw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, Input, Spinner } from '../components/ui'
import type { PreviewResponse, ReadingOverride } from '../types'
import { useProject } from './ProjectLayout'

interface ReadingState {
  char: string
  readings: string[]
  override: ReadingOverride | null
}

async function fetchReading(projectId: string, char: string): Promise<ReadingState> {
  const res = await fetch(
    `/api/projects/${projectId}/readings/${encodeURIComponent(char)}`,
  )
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export default function ReadingsStep() {
  const { project, projectId } = useProject()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const [char, setChar] = useState(params.get('char') ?? '')
  const [input, setInput] = useState(char)
  const [newReading, setNewReading] = useState('')
  const [mode, setMode] = useState<'replace' | 'append'>('replace')
  const [error, setError] = useState('')

  const reading = useQuery({
    queryKey: ['reading', projectId, char],
    queryFn: () => fetchReading(projectId, char),
    enabled: char.length === 1,
  })

  const preview = useQuery({
    queryKey: ['reading-preview', projectId, char, reading.data?.readings],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: char, canvas: null }),
      })
      return res.json() as Promise<PreviewResponse>
    },
    enabled: char.length === 1 && reading.isSuccess,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['reading', projectId, char] })
    queryClient.invalidateQueries({ queryKey: ['project', projectId] })
  }

  const save = useMutation({
    mutationFn: async (override: ReadingOverride) => {
      const res = await fetch(
        `/api/projects/${projectId}/readings/${encodeURIComponent(char)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(override),
        },
      )
      if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
      return res.json()
    },
    onSuccess: () => {
      setError('')
      setNewReading('')
      invalidate()
    },
    onError: (e) => setError((e as Error).message),
  })

  const remove = useMutation({
    mutationFn: async () => {
      await fetch(`/api/projects/${projectId}/readings/${encodeURIComponent(char)}`, {
        method: 'DELETE',
      })
    },
    onSuccess: invalidate,
  })

  useEffect(() => {
    const fromParam = params.get('char')
    if (fromParam) {
      setChar(fromParam)
      setInput(fromParam)
    }
  }, [params])

  if (!project) return null

  const overrides = Object.entries(project.glyph_overrides.readings)

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-8 py-8">
      <header>
        <h2 className="text-lg font-bold text-slate-100">読み（拼音）の追加・変更</h2>
        <p className="mt-1 text-sm text-slate-500">
          文字ごとの読みを置換または追加できます。先頭の読みがデフォルト表示になり、
          2番目以降は IVS / ssXX で切り替えられます。変更は次回ビルドから反映されます。
        </p>
      </header>

      <Card title="文字を選択">
        <div className="flex gap-3">
          <Input
            className="max-w-[8rem] text-center text-2xl"
            value={input}
            maxLength={1}
            placeholder="中"
            onChange={(e) => setInput(e.target.value)}
          />
          <Button onClick={() => setChar(input)} disabled={input.length !== 1}>
            表示
          </Button>
        </div>
      </Card>

      {char && reading.data && (
        <Card
          title={`「${char}」の読み`}
          actions={
            reading.data.override ? (
              <Badge tone="accent">
                オーバーライド ({reading.data.override.mode})
              </Badge>
            ) : (
              <Badge>ベースデータ</Badge>
            )
          }
        >
          <div className="flex gap-6">
            <div className="w-32 shrink-0">
              {preview.data?.items[0] ? (
                <div
                  className="text-slate-100"
                  dangerouslySetInnerHTML={{ __html: preview.data.items[0].svg }}
                />
              ) : (
                <div className="flex h-32 items-center justify-center">
                  <Spinner />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap gap-2">
                {reading.data.readings.map((r, i) => (
                  <Badge key={r} tone={i === 0 ? 'success' : 'accent'}>
                    {i === 0 && '★ '}
                    {r}
                  </Badge>
                ))}
                {reading.data.readings.length === 0 && (
                  <span className="text-sm text-slate-500">読みが登録されていません</span>
                )}
              </div>

              <div className="space-y-2 border-t border-line pt-4">
                <div className="flex gap-2">
                  <Input
                    className="max-w-[10rem]"
                    placeholder="zhōng"
                    value={newReading}
                    onChange={(e) => setNewReading(e.target.value)}
                  />
                  <select
                    className="rounded-lg border border-line bg-surface px-2 text-sm text-slate-300"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as 'replace' | 'append')}
                  >
                    <option value="replace">置換（この読みのみに）</option>
                    <option value="append">追加（既存の読みに足す）</option>
                  </select>
                  <Button
                    disabled={!newReading.trim()}
                    onClick={() => {
                      const pronunciations =
                        mode === 'replace'
                          ? [newReading.trim(), ...reading.data!.readings.filter((r) => r !== newReading.trim())]
                          : [newReading.trim()]
                      save.mutate({ mode, pronunciations })
                    }}
                  >
                    <span className="flex items-center gap-1">
                      <Plus className="h-4 w-4" /> 適用
                    </span>
                  </Button>
                </div>
                <p className="text-xs text-slate-600">
                  置換はデフォルトの読みを差し替えます（既存の読みは後ろに残ります）。
                </p>
                {error && <p className="text-sm text-rose-400">{error}</p>}
                {reading.data.override && (
                  <Button variant="ghost" onClick={() => remove.mutate()}>
                    <span className="flex items-center gap-1">
                      <RotateCcw className="h-4 w-4" /> ベースデータに戻す
                    </span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {overrides.length > 0 && (
        <Card title={`オーバーライド一覧 (${overrides.length})`}>
          <ul className="divide-y divide-line">
            {overrides.map(([overrideChar, override]) => (
              <li key={overrideChar} className="flex items-center gap-3 py-2">
                <button
                  className="text-xl text-slate-100 hover:text-accent-hover"
                  onClick={() => {
                    setChar(overrideChar)
                    setInput(overrideChar)
                  }}
                >
                  {overrideChar}
                </button>
                <Badge tone="accent">{override.mode}</Badge>
                <span className="flex-1 text-sm text-slate-400">
                  {override.pronunciations.join(', ')}
                </span>
                <button
                  className="text-slate-600 hover:text-rose-400"
                  onClick={async () => {
                    await fetch(
                      `/api/projects/${projectId}/readings/${encodeURIComponent(overrideChar)}`,
                      { method: 'DELETE' },
                    )
                    queryClient.invalidateQueries({ queryKey: ['project', projectId] })
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
