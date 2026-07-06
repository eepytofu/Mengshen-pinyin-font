import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Badge, Button, Card } from '../components/ui'
import type { LicenseInfo } from '../types'
import { useProject } from './ProjectLayout'

export default function LicenseStep() {
  const { project, projectId } = useProject()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const acknowledge = useMutation({
    mutationFn: ({ role, value }: { role: 'base' | 'pinyin'; value: boolean }) =>
      api.acknowledgeLicense(projectId, role, value),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
  })
  const startPrepare = useMutation({
    mutationFn: () => api.startPrepare(projectId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
  })

  if (!project) return null
  const allAcknowledged =
    project.license.base.acknowledged && project.license.pinyin.acknowledged

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-8 py-8">
      <header>
        <h2 className="text-lg font-bold text-slate-100">ライセンス確認</h2>
        <p className="mt-1 text-sm text-slate-500">
          選択したフォントの name テーブルからライセンス情報を表示しています。
          派生フォントの作成・再配布が許可されているか確認してください
          （Reserved Font Name の扱いに注意）。
        </p>
      </header>

      <LicensePanel
        title={`ベースフォント: ${project.base_font?.family_name ?? '未選択'}`}
        info={project.license.base}
        onAcknowledge={(value) => acknowledge.mutate({ role: 'base', value })}
      />
      <LicensePanel
        title={`拼音フォント: ${project.pinyin_font?.family_name ?? '未選択'}`}
        info={project.license.pinyin}
        onAcknowledge={(value) => acknowledge.mutate({ role: 'pinyin', value })}
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          続行するとバックグラウンドでテンプレート準備（otfccdump）を開始します。
        </p>
        <Button
          disabled={!allAcknowledged}
          onClick={async () => {
            if (project.tasks.prepare.status === 'idle' || project.tasks.prepare.status === 'error') {
              await startPrepare.mutateAsync()
            }
            navigate(`/projects/${projectId}/adjust`)
          }}
        >
          承認して次へ: 位置調整
        </Button>
      </div>
    </div>
  )
}

function LicensePanel({
  title,
  info,
  onAcknowledge,
}: {
  title: string
  info: LicenseInfo
  onAcknowledge: (value: boolean) => void
}) {
  const licenseUrl = info.entries.find((e) => e.name_id === 14)?.value

  return (
    <Card
      title={title}
      actions={
        info.acknowledged ? <Badge tone="success">承認済み</Badge> : <Badge tone="warning">未承認</Badge>
      }
    >
      <dl className="space-y-3">
        {info.entries
          .filter((e) => [0, 7, 13].includes(e.name_id))
          .map((entry) => (
            <div key={entry.name_id}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {entry.label}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                {entry.value}
              </dd>
            </div>
          ))}
        {info.entries.length === 0 && (
          <p className="text-sm text-slate-500">
            name テーブルにライセンス情報がありません。フォントの配布元で利用条件を確認してください。
          </p>
        )}
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        {licenseUrl ? (
          <a
            href={licenseUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm text-accent-hover hover:underline"
          >
            ライセンス全文 <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span />
        )}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={info.acknowledged}
            onChange={(e) => onAcknowledge(e.target.checked)}
            className="h-4 w-4 accent-indigo-500"
          />
          <ShieldCheck className="h-4 w-4 text-slate-500" />
          ライセンス条件を確認し、派生フォントの作成に同意します
        </label>
      </div>
    </Card>
  )
}
