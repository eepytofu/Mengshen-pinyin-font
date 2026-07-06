import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Upload } from 'lucide-react'
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type BuiltinFont } from '../api'
import { Badge, Button, Card } from '../components/ui'
import type { FontRef } from '../types'
import { useFontFace } from '../useFontFace'
import { useProject } from './ProjectLayout'

export default function FontsStep() {
  const { project, projectId } = useProject()
  const navigate = useNavigate()

  const { data: builtins } = useQuery({
    queryKey: ['builtin-fonts'],
    queryFn: api.builtinFonts,
  })

  if (!project) return null
  const bothSelected = project.base_font && project.pinyin_font

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-8 py-8">
      <header>
        <h2 className="text-lg font-bold text-slate-100">フォント選択</h2>
        <p className="mt-1 text-sm text-slate-500">
          漢字のベースフォントと、拼音表示に使う英字フォントを選びます。
        </p>
      </header>

      <FontPicker
        role="base"
        title="ベースフォント（漢字）"
        current={project.base_font}
        builtins={builtins?.fonts}
        projectId={projectId}
        confirmNeeded={
          project.license.base.acknowledged ||
          project.tasks.prepare.status === 'done'
        }
      />
      <FontPicker
        role="pinyin"
        title="拼音フォント（英字）"
        current={project.pinyin_font}
        builtins={builtins?.fonts}
        projectId={projectId}
        confirmNeeded={
          project.license.pinyin.acknowledged ||
          project.tasks.prepare.status === 'done'
        }
      />

      <div className="flex justify-end">
        <Button
          disabled={!bothSelected}
          onClick={() => navigate(`/projects/${projectId}/license`)}
        >
          次へ: ライセンス確認
        </Button>
      </div>
    </div>
  )
}

function FontPicker({
  role,
  title,
  current,
  builtins,
  projectId,
  confirmNeeded,
}: {
  role: 'base' | 'pinyin'
  title: string
  current: FontRef | null
  builtins?: Record<string, BuiltinFont>
  projectId: string
  confirmNeeded: boolean
}) {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['project', projectId] })

  // Changing an already-acknowledged/prepared font resets the license
  // acknowledgment and templates — don't let a stray click do that
  const confirmChange = (nextLabel: string) =>
    !confirmNeeded ||
    confirm(
      `フォントを「${nextLabel}」に変更すると、ライセンス承認と` +
        '準備済みテンプレートがリセットされます。変更しますか？',
    )

  const selectBuiltin = useMutation({
    mutationFn: (style: string) => api.selectBuiltin(projectId, role, style),
    onSuccess: invalidate,
  })
  const upload = useMutation({
    mutationFn: (file: File) => api.uploadFont(projectId, role, file),
    onSuccess: invalidate,
  })

  return (
    <Card title={title}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {builtins &&
          Object.values(builtins).map((builtin) => (
            <BuiltinCard
              key={builtin.style}
              builtin={builtin}
              role={role}
              selected={current?.source === `builtin:${builtin.style}`}
              onSelect={() => {
                const name =
                  (role === 'base' ? builtin.base_family : builtin.pinyin_family) ??
                  builtin.label
                if (current?.source === `builtin:${builtin.style}`) return
                if (confirmChange(name)) selectBuiltin.mutate(builtin.style)
              }}
            />
          ))}

        <button
          onClick={() => fileInput.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 transition-colors ${
            current?.source === 'upload'
              ? 'border-accent bg-accent/10'
              : 'border-line hover:border-slate-500'
          }`}
        >
          <Upload className="h-5 w-5 text-slate-500" />
          <span className="text-xs text-slate-400">TTF/OTF をアップロード</span>
          <input
            ref={fileInput}
            type="file"
            accept=".ttf,.otf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file && confirmChange(file.name)) upload.mutate(file)
            }}
          />
        </button>
      </div>

      {upload.isError && (
        <p className="mt-3 text-sm text-rose-400">{(upload.error as Error).message}</p>
      )}

      {current && <SelectedFontInfo current={current} role={role} projectId={projectId} />}
    </Card>
  )
}

function BuiltinCard({
  builtin,
  role,
  selected,
  onSelect,
}: {
  builtin: BuiltinFont
  role: 'base' | 'pinyin'
  selected: boolean
  onSelect: () => void
}) {
  // Show the family name of the font actually used for this role,
  // rendered in that font (base and pinyin differ within a preset)
  const family = useFontFace(`/api/builtin-fonts/${builtin.style}/${role}/file`)
  const name =
    (role === 'base' ? builtin.base_family : builtin.pinyin_family) ?? builtin.label
  return (
    <button
      onClick={onSelect}
      className={`rounded-lg border p-4 text-left transition-colors ${
        selected ? 'border-accent bg-accent/10' : 'border-line hover:border-slate-500'
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <span
          className="text-sm font-medium text-slate-200"
          style={family ? { fontFamily: family, fontSize: '1rem' } : undefined}
        >
          {name}
        </span>
        {selected && <Check className="h-4 w-4 shrink-0 text-accent-hover" />}
      </div>
      <span className="text-xs text-slate-500">同梱プリセット ・ {builtin.label}</span>
    </button>
  )
}

function SelectedFontInfo({
  current,
  role,
  projectId,
}: {
  current: FontRef
  role: 'base' | 'pinyin'
  projectId: string
}) {
  // sha256 busts the browser cache when the same path gets a new upload
  const family = useFontFace(
    `/api/projects/${projectId}/fonts/${role}/file?v=${current.sha256.slice(0, 12)}`,
  )
  return (
    <div className="mt-4 flex items-center gap-3 rounded-lg bg-surface px-4 py-3">
      <div className="flex-1">
        <p
          className="font-medium text-slate-200"
          style={family ? { fontFamily: family, fontSize: '1.25rem' } : { fontSize: '0.875rem' }}
        >
          {current.family_name}
        </p>
        <p className="text-xs text-slate-500">
          {current.original_filename} ・ {current.glyph_count.toLocaleString()} グリフ ・
          upem {current.units_per_em}
        </p>
      </div>
      <Badge tone={current.source === 'upload' ? 'accent' : 'default'}>
        {current.source === 'upload' ? 'アップロード' : 'プリセット'}
      </Badge>
    </div>
  )
}
