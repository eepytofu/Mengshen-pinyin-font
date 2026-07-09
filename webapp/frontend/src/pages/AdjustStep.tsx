import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Button, Card, Input, SliderRow, Switch } from '../components/ui'
import type { Canvas, PreviewResponse } from '../types'
import { useProject } from './ProjectLayout'

export default function AdjustStep() {
  const { project, projectId } = useProject()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [canvas, setCanvas] = useState<Canvas | null>(null)
  const [text, setText] = useState('你好中国装')
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Seed local state once the project loads
  useEffect(() => {
    if (project && !canvas) setCanvas(structuredClone(project.canvas))
  }, [project, canvas])

  const patchCanvas = useMutation({
    mutationFn: (next: Canvas) => api.patchProject(projectId, { canvas: next }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
  })

  const runPreview = useCallback(
    (nextCanvas: Canvas, nextText: string) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      api
        .preview(projectId, nextText, nextCanvas, controller.signal)
        .then(setPreview)
        .catch((e) => {
          if ((e as Error).name !== 'AbortError') console.error(e)
        })
    },
    [projectId],
  )

  // Initial preview
  useEffect(() => {
    if (canvas) runPreview(canvas, text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas === null])

  const update = (mutate: (draft: Canvas) => void) => {
    if (!canvas) return
    const next = structuredClone(canvas)
    mutate(next)
    setCanvas(next)

    clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(() => runPreview(next, text), 150)

    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => patchCanvas.mutate(next), 500)
  }

  if (!project || !canvas) return null

  return (
    <div className="flex h-full">
      <div className="w-80 shrink-0 space-y-5 overflow-y-auto border-r border-line p-6">
        <h2 className="text-lg font-bold text-slate-100">{t('adjust.title')}</h2>

        <Card title={t('adjust.canvas')}>
          <div className="space-y-4">
            <SliderRow
              label={t('adjust.width')}
              value={canvas.pinyin.width}
              min={200}
              max={1200}
              onChange={(v) => update((d) => (d.pinyin.width = v))}
            />
            <SliderRow
              label={t('adjust.height')}
              value={canvas.pinyin.height}
              min={100}
              max={600}
              step={0.1}
              onChange={(v) => update((d) => (d.pinyin.height = v))}
            />
            <SliderRow
              label={t('adjust.baseLine')}
              value={canvas.pinyin.base_line}
              min={600}
              max={1200}
              onChange={(v) => update((d) => (d.pinyin.base_line = v))}
            />
            <SliderRow
              label={t('adjust.tracking')}
              value={canvas.pinyin.tracking}
              min={0}
              max={120}
              step={0.1}
              onChange={(v) => update((d) => (d.pinyin.tracking = v))}
            />
          </div>
        </Card>

        <Card title={t('adjust.avoidOverlap')}>
          <div className="space-y-4">
            <Switch
              label={t('adjust.avoidOverlapMode')}
              checked={canvas.is_avoid_overlapping_mode}
              onChange={(v) => update((d) => (d.is_avoid_overlapping_mode = v))}
            />
            <SliderRow
              label={t('adjust.xReduction')}
              value={canvas.x_scale_reduction_for_avoid_overlapping}
              min={0}
              max={0.3}
              step={0.01}
              onChange={(v) =>
                update((d) => (d.x_scale_reduction_for_avoid_overlapping = v))
              }
            />
            <p className="text-xs leading-relaxed text-slate-500">
              {t('adjust.avoidNote')}
            </p>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={() => navigate(`/projects/${projectId}/glyphs`)}>
            {t('adjust.next')}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center gap-3">
          <Input
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              clearTimeout(previewTimer.current)
              previewTimer.current = setTimeout(
                () => runPreview(canvas, e.target.value),
                300,
              )
            }}
            placeholder={t('adjust.previewPlaceholder')}
            className="max-w-sm"
          />
          <span className="text-xs text-slate-500">{t('adjust.liveHint')}</span>
        </div>

        {preview && preview.warnings.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
            {preview.warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {preview?.items.map((item, i) => (
            <div
              key={`${item.char}-${i}`}
              className="rounded-xl border border-line bg-surface-raised p-4"
            >
              <div
                className="mx-auto w-full max-w-[160px] text-slate-100"
                dangerouslySetInnerHTML={{ __html: item.svg }}
              />
              <p className="mt-2 text-center text-xs text-slate-500">
                {item.char} <span className="text-accent-hover">{item.pinyin}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
