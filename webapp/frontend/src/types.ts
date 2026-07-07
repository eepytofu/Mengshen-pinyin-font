export interface PinyinCanvas {
  width: number
  height: number
  base_line: number
  tracking: number
}

export interface Canvas {
  pinyin: PinyinCanvas
  hanzi: { width: number; height: number }
  is_avoid_overlapping_mode: boolean
  x_scale_reduction_for_avoid_overlapping: number
}

export interface FontRef {
  source: string
  path: string
  original_filename: string
  sha256: string
  family_name: string
  units_per_em: number
  glyph_count: number
}

export interface LicenseEntry {
  name_id: number
  label: string
  value: string
}

export interface LicenseInfo {
  entries: LicenseEntry[]
  acknowledged: boolean
  acknowledged_at: string | null
  font_sha256: string | null
}

export interface TaskState {
  status: 'idle' | 'running' | 'done' | 'error'
  stage: string | null
  progress: number
  error: string | null
  started_at?: string | null
  finished_at?: string | null
}

export interface ReadingOverride {
  mode: 'replace' | 'append'
  pronunciations: string[]
}

export interface Project {
  id: string
  name: string
  created_at: string
  updated_at: string
  step: string
  base_font: FontRef | null
  pinyin_font: FontRef | null
  license: { base: LicenseInfo; pinyin: LicenseInfo }
  canvas: Canvas
  glyph_overrides: {
    readings: Record<string, ReadingOverride>
    excluded_characters: string[]
  }
  output: { family_name: string; style_name: string; version: string }
  artifacts: Record<string, string>
  tasks: { prepare: TaskState; build: TaskState }
}

export interface PreviewItem {
  char: string
  pinyin: string
  svg: string
}

export interface PreviewResponse {
  items: PreviewItem[]
  warnings: string[]
}

export interface GlyphEntry {
  name: string
  font: 'base' | 'pinyin' | 'output'
  char: string | null
  codepoints: string[]
  advance_width: number
  category: string
  overridden: boolean
  // Only on category 'pronunciation' (built-font .ssNN variants)
  label?: string
  variant?: string
  variant_label?: string
  reading?: string | null
}

export interface GlyphPage {
  total: number
  page: number
  size: number
  glyphs: GlyphEntry[]
}

export interface IvsSequence {
  selector: string
  glyph_suffix: string
  reading: string | null
  description: string
}

export interface GlyphDetail extends GlyphEntry {
  readings: string[]
  tables: { id: string; label: string }[]
  ivs: IvsSequence[]
}
