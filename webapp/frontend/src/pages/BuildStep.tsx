import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CircleAlert, Download, Hammer } from 'lucide-react'
import { api } from '../api'
import { Badge, Button, Card, Input, Progress, Spinner } from '../components/ui'
import type { TaskState } from '../types'
import { useProject } from './ProjectLayout'

export default function BuildStep() {
  const { project, projectId } = useProject()
  const queryClient = useQueryClient()

  const health = useQuery({ queryKey: ['health'], queryFn: api.health })

  const anyRunning =
    project?.tasks.prepare.status === 'running' ||
    project?.tasks.build.status === 'running'

  // Poll while a task is running
  useQuery({
    queryKey: ['project', projectId, 'poll'],
    queryFn: async () => {
      const fresh = await api.getProject(projectId)
      queryClient.setQueryData(['project', projectId], fresh)
      return fresh
    },
    refetchInterval: 1000,
    enabled: Boolean(anyRunning),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['project', projectId] })

  const startPrepare = useMutation({
    mutationFn: () => api.startPrepare(projectId),
    onSuccess: invalidate,
  })
  const startBuild = useMutation({
    mutationFn: () => api.startBuild(projectId),
    onSuccess: invalidate,
  })
  const patchOutput = useMutation({
    mutationFn: (family_name: string) =>
      api.patchProject(projectId, {
        output: { ...project!.output, family_name },
      }),
    onSuccess: invalidate,
  })

  if (!project) return null

  const toolsOk = health.data ? health.data.missing_tools.length === 0 : true
  const licensesOk =
    project.license.base.acknowledged && project.license.pinyin.acknowledged
  const prepareDone = project.tasks.prepare.status === 'done'
  const buildDone = project.tasks.build.status === 'done'

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-8 py-8">
      <header>
        <h2 className="text-lg font-bold text-slate-100">フォント出力</h2>
        <p className="mt-1 text-sm text-slate-500">
          全 16,000 字超へ拼音を合成し、GSUB（多音字切替）を組み込んだ TTF を生成します。
        </p>
      </header>

      <Card title="チェックリスト">
        <ul className="space-y-2">
          <CheckItem ok={toolsOk} label="otfccdump / otfccbuild / jq が利用可能" />
          <CheckItem ok={Boolean(project.base_font && project.pinyin_font)} label="フォント選択済み" />
          <CheckItem ok={licensesOk} label="両フォントのライセンス承認済み" />
          <CheckItem ok={prepareDone} label="テンプレート準備完了" />
        </ul>
      </Card>

      <Card title="出力設定">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-slate-500">フォントファミリー名</label>
            <Input
              defaultValue={project.output.family_name}
              onBlur={(e) => {
                if (e.target.value !== project.output.family_name) {
                  patchOutput.mutate(e.target.value)
                }
              }}
            />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs text-slate-500">バージョン</label>
            <Input defaultValue={project.output.version} disabled />
          </div>
        </div>
        {project.base_font?.source.startsWith('builtin:') && (
          <p className="mt-2 text-xs text-slate-500">
            プリセットビルドでは Mengshen 公式の name テーブルが使われます。
          </p>
        )}
      </Card>

      <TaskCard
        title="1. テンプレート準備（otfccdump）"
        task={project.tasks.prepare}
        actionLabel="準備を実行"
        onStart={() => startPrepare.mutate()}
        disabled={!licensesOk || !toolsOk || anyRunning}
      />
      <TaskCard
        title="2. フォントビルド（otfccbuild）"
        task={project.tasks.build}
        actionLabel="ビルドを実行"
        onStart={() => startBuild.mutate()}
        disabled={!prepareDone || !toolsOk || anyRunning}
        icon={<Hammer className="h-4 w-4" />}
      />

      {buildDone && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-100">
                {project.output.family_name}.ttf
              </p>
              <p className="text-xs text-slate-500">ビルド完了 — ダウンロードできます</p>
            </div>
            <a href={`/api/projects/${projectId}/download`} download>
              <Button>
                <span className="flex items-center gap-2">
                  <Download className="h-4 w-4" /> ダウンロード
                </span>
              </Button>
            </a>
          </div>
        </Card>
      )}
    </div>
  )
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? (
        <Check className="h-4 w-4 text-emerald-400" />
      ) : (
        <CircleAlert className="h-4 w-4 text-amber-400" />
      )}
      <span className={ok ? 'text-slate-300' : 'text-slate-500'}>{label}</span>
    </li>
  )
}

function TaskCard({
  title,
  task,
  actionLabel,
  onStart,
  disabled,
  icon,
}: {
  title: string
  task: TaskState
  actionLabel: string
  onStart: () => void
  disabled: boolean
  icon?: React.ReactNode
}) {
  return (
    <Card
      title={title}
      actions={
        task.status === 'done' ? (
          <Badge tone="success">完了</Badge>
        ) : task.status === 'running' ? (
          <Badge tone="accent">実行中: {task.stage}</Badge>
        ) : task.status === 'error' ? (
          <Badge tone="error">エラー</Badge>
        ) : (
          <Badge>未実行</Badge>
        )
      }
    >
      {task.status === 'running' && (
        <div className="mb-3 flex items-center gap-3">
          <Spinner />
          <Progress value={task.progress} />
        </div>
      )}
      {task.status === 'error' && (
        <p className="mb-3 break-all rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {task.error}
        </p>
      )}
      {task.status !== 'running' && (
        <Button variant={task.status === 'done' ? 'ghost' : 'primary'} disabled={disabled} onClick={onStart}>
          <span className="flex items-center gap-2">
            {icon}
            {task.status === 'done' ? `再実行` : actionLabel}
          </span>
        </Button>
      )}
    </Card>
  )
}
