import { apiBlob } from './http-client'

// Giấy tờ chỉ phát qua endpoint có phân quyền, nên tải bằng token rồi mở blob. Tab được mở ngay trong lúc bấm để không bị chặn popup.
export async function openDocumentInNewTab(contentPath: string) {
  const tab = window.open('', '_blank')
  try {
    const url = URL.createObjectURL(await apiBlob(contentPath))
    if (tab) tab.location.href = url
    else window.location.assign(url)
  } catch (error) {
    tab?.close()
    throw error
  }
}
