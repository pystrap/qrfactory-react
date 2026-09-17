export type User = { id: number; email: string; full_name: string | null; created_at: string }
export type AuthResult = { access_token: string; refresh_token: string; user: User }
export type Page<T> = { items: T[]; total: number; page: number; page_size: number }
export type QR = {
  id: number
  title: string | null
  payload_type: string
  payload: Record<string, unknown>
  data: string
  url: string
  image_format: string
  fill_color: string
  back_color: string
  error_correction: string
  box_size: number
  border: number
  is_favorite: boolean
  is_dynamic: boolean
  is_active: boolean
  destination_url: string
  share_url: string | null
  public_id: string | null
  media_id: number | null
  project_id: number | null
  expires_at: string | null
  scan_count: number
  created_at: string
}
export type Preview = {
  images: Record<string, string>
  image_data_url: string
  data: string
  image_format: string
  saved: false
}
export type Project = { id: number; name: string; description: string | null; qr_count: number }
export type Asset = {
  id: number
  title: string
  original_name: string
  content_type: string
  size: number
  qr_count: number
  created_at: string
}
export type Usage = {
  used_bytes: number
  limit_bytes: number
  max_upload_bytes: number
  allowed_extensions: string[]
}
export type Summary = {
  total: number
  favorites: number
  dynamic: number
  scans: number
  projects: number
}
export type Analytics = {
  total_scans: number
  is_dynamic: boolean
  days: { date: string; count: number }[]
}
