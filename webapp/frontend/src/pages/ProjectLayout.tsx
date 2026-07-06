import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  BookOpenText,
  FileText,
  Grid3X3,
  Package,
  ScrollText,
  SlidersHorizontal,
} from 'lucide-react'
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { Spinner } from '../components/ui'
import type { Project } from '../types'

const STEPS = [
  { path: 'fonts', label: 'フォント', icon: FileText },
  { path: 'license', label: 'ライセンス', icon: ScrollText },
  { path: 'adjust', label: '位置調整', icon: SlidersHorizontal },
  { path: 'glyphs', label: 'グリフ', icon: Grid3X3 },
  { path: 'duoyinzi', label: '多音字 / GSUB', icon: BookOpenText },
  { path: 'build', label: 'ビルド', icon: Package },
]

export function useProject(): { project: Project | undefined; projectId: string } {
  const { projectId = '' } = useParams()
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.getProject(projectId),
    enabled: Boolean(projectId),
  })
  return { project, projectId }
}

export default function ProjectLayout() {
  const navigate = useNavigate()
  const { project, projectId } = useProject()

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-surface-raised">
        <button
          className="flex items-center gap-2 border-b border-line px-5 py-4 text-left text-sm text-slate-400 hover:text-slate-200"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4" /> プロジェクト一覧
        </button>
        <div className="border-b border-line px-5 py-4">
          <p className="truncate font-semibold text-slate-100">{project.name}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {project.base_font?.family_name ?? '未設定'}
          </p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {STEPS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={`/projects/${projectId}/${path}`}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-accent/15 font-medium text-accent-hover'
                    : 'text-slate-400 hover:bg-surface-overlay hover:text-slate-200'
                }`
              }
            >
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <TaskIndicator project={project} />
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

function TaskIndicator({ project }: { project: Project }) {
  const running =
    project.tasks.prepare.status === 'running'
      ? 'テンプレート準備中…'
      : project.tasks.build.status === 'running'
        ? 'フォントビルド中…'
        : null
  if (!running) return null
  return (
    <div className="flex items-center gap-2 border-t border-line px-5 py-3 text-xs text-accent-hover">
      <Spinner /> {running}
    </div>
  )
}
