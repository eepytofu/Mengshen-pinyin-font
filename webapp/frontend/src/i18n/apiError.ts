import i18n from './index'

type StructuredDetail = {
  code?: string
  message?: string
  params?: Record<string, unknown>
}
type Detail = string | StructuredDetail | undefined

// Translate an API error `detail` into a localized message. The backend
// sends { code, message, params } for known errors; we map the code to an
// errors.* key and fall back to the English message, then to statusText.
export function apiErrorMessage(detail: Detail, statusText = ''): string {
  if (detail && typeof detail === 'object' && detail.code) {
    const params: Record<string, unknown> = { ...detail.params }
    // The `role` param is itself a translatable token (base/pinyin)
    if (typeof params.role === 'string') {
      params.role = i18n.t(`errors.role.${params.role}`, params.role)
    }
    return i18n.t(`errors.${detail.code}`, {
      ...params,
      defaultValue: detail.message ?? '',
    })
  }
  if (typeof detail === 'string') return detail
  return statusText || i18n.t('errors.unknown')
}
