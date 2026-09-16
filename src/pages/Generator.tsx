import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  FileUp,
  Globe,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  Palette,
  Phone,
  QrCode,
  ShieldCheck,
  Sparkles,
  Type,
  UserRound,
  Wifi,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import { api, API_BASE, download, post } from '../api'
import { useApp } from '../context'
import { bytes, ErrorNotice } from '../components'
import type { Asset, Page, Preview, Project, QR, Usage } from '../types'

type Field = {
  key: string
  label: string
  placeholder?: string
  input?: string
  optional?: boolean
}
export const contentTypes: { value: string; label: string; icon: LucideIcon; fields: Field[] }[] = [
  {
    value: 'url',
    label: 'Website',
    icon: Link2,
    fields: [
      { key: 'url', label: 'Your website link', placeholder: 'Paste a link, like yourwebsite.com' },
    ],
  },
  {
    value: 'text',
    label: 'Text',
    icon: Type,
    fields: [
      {
        key: 'text',
        label: 'Your message',
        placeholder: 'A little note, a big idea, or anything in between…',
        input: 'textarea',
      },
    ],
  },
  {
    value: 'wifi',
    label: 'Wi-Fi',
    icon: Wifi,
    fields: [
      { key: 'ssid', label: 'Network name', placeholder: 'The good Wi-Fi' },
      { key: 'password', label: 'Network password', input: 'password', optional: true },
    ],
  },
  {
    value: 'vcard',
    label: 'Contact',
    icon: UserRound,
    fields: [
      { key: 'first_name', label: 'First name' },
      { key: 'last_name', label: 'Last name' },
      { key: 'phone', label: 'Phone number', input: 'tel', optional: true },
      { key: 'email', label: 'Email', input: 'email', optional: true },
      { key: 'organization', label: 'Organization', optional: true },
      { key: 'url', label: 'Website', optional: true },
    ],
  },
  { value: 'media', label: 'File', icon: FileUp, fields: [] },
  {
    value: 'email',
    label: 'Email',
    icon: Mail,
    fields: [
      { key: 'to', label: 'Email address', input: 'email', placeholder: 'hello@yourbusiness.com' },
      { key: 'subject', label: 'Subject', optional: true },
      { key: 'body', label: 'Message', input: 'textarea', optional: true },
    ],
  },
  {
    value: 'sms',
    label: 'SMS',
    icon: MessageSquare,
    fields: [
      { key: 'phone', label: 'Phone number', input: 'tel', placeholder: '+44 7700 900000' },
      { key: 'message', label: 'Message', optional: true },
    ],
  },
  {
    value: 'phone',
    label: 'Phone',
    icon: Phone,
    fields: [{ key: 'phone', label: 'Phone number', input: 'tel', placeholder: '+44 7700 900000' }],
  },
  {
    value: 'geo',
    label: 'Location',
    icon: MapPin,
    fields: [
      { key: 'latitude', label: 'Latitude', input: 'number', placeholder: '51.5072' },
      { key: 'longitude', label: 'Longitude', input: 'number', placeholder: '-0.1276' },
      { key: 'query', label: 'Location label', optional: true },
    ],
  },
]
type Draft = {
  payload_type: string
  payload: Record<string, string | boolean>
  title: string
  fill_color: string
  back_color: string
  image_format: string
  error_correction: string
  box_size: number
  border: number
  is_dynamic: boolean
  media_id?: number
  project_id?: number | null
}
function initialDraft(): Draft {
  try {
    const draft = JSON.parse(sessionStorage.getItem('qrfactory.draft') || 'null')
    if (draft?.payload_type) return draft
  } catch {
    /* Ignore an invalid old draft. */
  }
  return {
    payload_type: 'url',
    payload: {},
    title: '',
    fill_color: '#1b2235',
    back_color: '#ffffff',
    image_format: 'png',
    error_correction: 'M',
    box_size: 10,
    border: 4,
    is_dynamic: false,
  }
}
export default function Generator({ compact = false }: { compact?: boolean }) {
  const { user, notify } = useApp()
  const [search] = useSearchParams()
  const [draft, setDraft] = useState<Draft>(() => {
    const d = initialDraft()
    const type = search.get('type')
    return type && contentTypes.some((t) => t.value === type)
      ? { ...d, payload_type: type, payload: {} }
      : d
  })
  const [result, setResult] = useState<QR | Preview | null>(null)
  const [resultDraft, setResultDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [downloadBusy, setDownloadBusy] = useState(false)
  const [error, setError] = useState('')
  const [assets, setAssets] = useState<Asset[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [usage, setUsage] = useState<Usage | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const previewRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (result && window.matchMedia('(max-width: 767px)').matches) {
      previewRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' })
    }
  }, [result])
  const type = contentTypes.find((t) => t.value === draft.payload_type) || contentTypes[0]
  const update = (values: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...values }))
  const remember = () => sessionStorage.setItem('qrfactory.draft', JSON.stringify(draft))
  useEffect(() => {
    if (!user) return
    let active = true
    Promise.all([
      api<Page<Asset>>('/media-assets?page_size=100'),
      api<Page<Project>>('/projects?page_size=100'),
      api<Usage>('/media-assets/usage'),
    ])
      .then(([files, folders, limits]) => {
        if (active) {
          setAssets(files.items)
          setProjects(folders.items)
          setUsage(limits)
        }
      })
      .catch((e) => active && setError(e.message))
    return () => {
      active = false
    }
  }, [user])
  async function generate(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const body = { ...draft, is_dynamic: draft.payload_type === 'media' || draft.is_dynamic }
      const response = user
        ? await post<QR>('/qr-codes', body)
        : await post<Preview>('/qr-codes/preview', body)
      setResult(response)
      setResultDraft(body)
      sessionStorage.removeItem('qrfactory.draft')
      if (user) notify('QR code saved to your workspace.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function downloadQR(format: string) {
    if (!result || !resultDraft) return
    setDownloadBusy(true)
    try {
      if ('id' in result)
        await download(
          `${API_BASE}/qr-codes/${result.id}/download?image_format=${format}`,
          `qrfactory-${result.id}.${format}`,
          true,
        )
      else {
        const preview =
          format === result.image_format
            ? result
            : await post<Preview>('/qr-codes/preview', { ...resultDraft, image_format: format })
        await download(preview.image_data_url, `qrfactory.${format}`)
      }
      notify(`${format.toUpperCase()} downloaded. Ready for the real world.`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDownloadBusy(false)
    }
  }
  return (
    <section
      className={`generator ${compact ? 'generator-home' : ''}`}
      aria-label="QR code generator"
    >
      <div className="generator-topline">
        <span>
          <span className="live-dot" /> A GOOD IDEA STARTS HERE
        </span>
        <span>
          <ShieldCheck size={14} />{' '}
          {user ? 'Saved to your workspace' : 'Free to create. No sign-up needed.'}
        </span>
      </div>
      <div className="type-tabs" role="group" aria-label="QR content type">
        {contentTypes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            aria-pressed={draft.payload_type === value}
            className={draft.payload_type === value ? 'selected' : ''}
            onClick={() => {
              update({ payload_type: value, payload: {}, is_dynamic: false, media_id: undefined })
              setError('')
            }}
          >
            <Icon size={18} />
            <span>{label}</span>
            {value === 'media' && <i />}
          </button>
        ))}
      </div>
      <div className="generator-body">
        <Form className="generator-form" onSubmit={generate}>
          <div className="step-label">
            <span>01</span>
            <h2>
              {type.value === 'media'
                ? 'Give your file a shortcut.'
                : 'Start with what you want to share.'}
            </h2>
          </div>
          <p className="form-description">
            {type.value === 'url'
              ? 'A website, your latest project, or that thing everyone needs to see.'
              : type.value === 'media'
                ? 'One upload. One QR code. A whole new way to share.'
                : 'Add your details. We’ll turn them into something scannable.'}
          </p>
          <div className={`payload-fields ${type.fields.length > 1 ? 'multi-field' : ''}`}>
            {type.fields.map((field) => (
              <Form.Group
                key={`${type.value}-${field.key}`}
                controlId={`payload-${field.key}`}
                className={field.input === 'textarea' ? 'full-width' : ''}
              >
                <Form.Label>
                  {field.label}
                  {field.optional && <span className="optional"> optional</span>}
                </Form.Label>
                <Form.Control
                  as={field.input === 'textarea' ? 'textarea' : 'input'}
                  type={field.input === 'textarea' ? undefined : field.input || 'text'}
                  step={field.input === 'number' ? 'any' : undefined}
                  style={field.input === 'textarea' ? { minHeight: 100 } : undefined}
                  placeholder={field.placeholder}
                  value={String(draft.payload[field.key] || '')}
                  maxLength={field.input === 'number' ? undefined : 2500}
                  required={!field.optional}
                  onChange={(e) =>
                    update({ payload: { ...draft.payload, [field.key]: e.target.value } })
                  }
                />
              </Form.Group>
            ))}
          </div>
          {type.value === 'wifi' && (
            <div className="wifi-options">
              <Form.Group controlId="wifi-security">
                <Form.Label>Security</Form.Label>
                <Form.Select
                  value={String(draft.payload.security || 'WPA')}
                  onChange={(e) =>
                    update({ payload: { ...draft.payload, security: e.target.value } })
                  }
                >
                  <option>WPA</option>
                  <option>WEP</option>
                  <option value="nopass">Open network</option>
                </Form.Select>
              </Form.Group>
              <Form.Check
                id="wifi-hidden"
                label="Hidden network"
                checked={!!draft.payload.hidden}
                onChange={(e) =>
                  update({ payload: { ...draft.payload, hidden: e.target.checked } })
                }
              />
            </div>
          )}
          {type.value === 'media' &&
            (!user ? (
              <div className="upload-signin">
                <FileUp size={30} />
                <h3>A little space for your files.</h3>
                <p>
                  Sign in to host documents, photos, video, and audio. Keep the same QR code when
                  you replace a file.
                </p>
                <Link to="/register" className="btn btn-primary btn-sm" onClick={remember}>
                  Create free account <ArrowRight size={15} />
                </Link>
                <Link className="small" to="/login" onClick={remember}>
                  Already have an account? Log in
                </Link>
              </div>
            ) : (
              <div className="file-picker">
                <label className={`upload-zone ${uploadBusy ? 'busy' : ''}`}>
                  <FileUp size={26} />
                  <strong>{uploadBusy ? 'Uploading your file…' : 'Choose a file to share'}</strong>
                  <span>
                    Documents, images, video & audio · up to{' '}
                    {bytes(usage?.max_upload_bytes || 26214400)}
                  </span>
                  <input
                    type="file"
                    aria-label="Upload a file"
                    disabled={uploadBusy}
                    accept={
                      usage?.allowed_extensions.join(',') ||
                      '.pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.webp,.mp4,.webm,.mp3,.wav'
                    }
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (usage && file.size > usage.max_upload_bytes) {
                        setError(`Please choose a file under ${bytes(usage.max_upload_bytes)}.`)
                        return
                      }
                      setUploadBusy(true)
                      setError('')
                      try {
                        const form = new FormData()
                        form.append('file', file)
                        const asset = await api<Asset>('/media-assets', {
                          method: 'POST',
                          body: form,
                        })
                        setAssets((previous) => [asset, ...previous])
                        update({ media_id: asset.id, title: draft.title || asset.title })
                        notify('File uploaded. Generate its QR code below.')
                      } catch (err) {
                        setError((err as Error).message)
                      } finally {
                        setUploadBusy(false)
                        e.target.value = ''
                      }
                    }}
                  />
                </label>
                {assets.length > 0 && (
                  <Form.Group controlId="existing-file">
                    <Form.Label>Or use a file from your library</Form.Label>
                    <Form.Select
                      required
                      value={draft.media_id || ''}
                      onChange={(e) => update({ media_id: Number(e.target.value) })}
                    >
                      <option value="">Choose an uploaded file</option>
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.title} · {bytes(asset.size)}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                )}
                <small className="text-muted">
                  Anyone with the generated link can access this file. You can pause sharing any
                  time.
                </small>
              </div>
            ))}
          <details className="style-details">
            <summary>
              <span>
                <Palette size={17} /> Make it yours <small>Colors & options</small>
              </span>
              <ChevronDown size={16} />
            </summary>
            <div className="style-options">
              <div className="color-presets">
                <span>Quick styles</span>
                {[
                  { name: 'Original', ink: '#1b2235', paper: '#ffffff' },
                  { name: 'Violet', ink: '#5636bc', paper: '#faf7ff' },
                  { name: 'Forest', ink: '#155b43', paper: '#f1fcf5' },
                  { name: 'Terracotta', ink: '#813a2c', paper: '#fff8f1' },
                ].map((style) => (
                  <button
                    type="button"
                    key={style.name}
                    title={style.name}
                    aria-label={`${style.name} style`}
                    className={draft.fill_color === style.ink ? 'active' : ''}
                    style={{ background: style.paper, color: style.ink }}
                    onClick={() => update({ fill_color: style.ink, back_color: style.paper })}
                  >
                    <QrCode size={24} />
                  </button>
                ))}
              </div>
              <div className="row g-3">
                <Form.Group className="col-6" controlId="foreground">
                  <Form.Label>Code color</Form.Label>
                  <Form.Control
                    type="color"
                    value={draft.fill_color}
                    onChange={(e) => update({ fill_color: e.target.value })}
                  />
                </Form.Group>
                <Form.Group className="col-6" controlId="background">
                  <Form.Label>Background</Form.Label>
                  <Form.Control
                    type="color"
                    value={draft.back_color}
                    onChange={(e) => update({ back_color: e.target.value })}
                  />
                </Form.Group>
                <Form.Group className="col-6" controlId="qr-size">
                  <Form.Label>Resolution</Form.Label>
                  <Form.Select
                    value={draft.box_size}
                    onChange={(e) => update({ box_size: Number(e.target.value) })}
                  >
                    <option value={10}>Standard</option>
                    <option value={20}>High resolution</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="col-6" controlId="qr-correction">
                  <Form.Label>Error correction</Form.Label>
                  <Form.Select
                    value={draft.error_correction}
                    onChange={(e) => update({ error_correction: e.target.value })}
                  >
                    <option value="M">Balanced · M</option>
                    <option value="Q">Extra resilient · Q</option>
                    <option value="H">Most resilient · H</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <small>Keep strong contrast and test a scan before printing.</small>
            </div>
          </details>
          {user && (
            <div className="save-options">
              <Form.Group controlId="qr-title">
                <Form.Label>
                  Name your QR <span className="optional">optional</span>
                </Form.Label>
                <Form.Control
                  value={draft.title}
                  maxLength={255}
                  placeholder="Something memorable"
                  onChange={(e) => update({ title: e.target.value })}
                />
              </Form.Group>
              {projects.length > 0 && (
                <Form.Group controlId="qr-project">
                  <Form.Label>Project</Form.Label>
                  <Form.Select
                    value={draft.project_id || ''}
                    onChange={(e) =>
                      update({ project_id: e.target.value ? Number(e.target.value) : null })
                    }
                  >
                    <option value="">No project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              )}
              {type.value === 'url' && (
                <div className="dynamic-option">
                  <Form.Check
                    type="switch"
                    id="dynamic-toggle"
                    label="Make this a dynamic QR"
                    checked={draft.is_dynamic}
                    onChange={(e) => update({ is_dynamic: e.target.checked })}
                  />
                  <small>Change the destination later, pause sharing, and track scans.</small>
                </div>
              )}
            </div>
          )}
          <ErrorNotice error={error} />
          {!(type.value === 'media' && !user) && (
            <Button
              type="submit"
              className="generate-button"
              disabled={busy || uploadBusy || (type.value === 'media' && !draft.media_id)}
            >
              {busy ? (
                <>
                  <span className="spinner-border spinner-border-sm" /> Making your QR…
                </>
              ) : (
                <>
                  {user ? 'Generate & save QR code' : 'Generate QR code'} <ArrowRight size={19} />
                </>
              )}
            </Button>
          )}
          <div className="generator-fineprint">
            <Check size={13} />{' '}
            {user ? 'Always yours. Ready to share.' : 'No account. No fuss. Just your QR.'}
          </div>
        </Form>
        <aside ref={previewRef} className="preview-panel">
          <div className="preview-top">
            <span>YOUR LITTLE BIG CONNECTION</span>
            <span className="preview-status">
              {result ? (
                <>
                  <span className="live-dot" /> Ready
                </>
              ) : (
                'Live studio'
              )}
            </span>
          </div>
          <div className="qr-stage">
            <div className={`qr-paper ${result ? 'has-result' : ''}`}>
              {result ? (
                <img
                  src={'id' in result ? result.url : result.image_data_url}
                  alt="Your generated QR code"
                />
              ) : (
                <div
                  className="qr-placeholder"
                  role="img"
                  aria-label="Your QR code will appear here"
                >
                  <span className="finder one" />
                  <span className="finder two" />
                  <span className="finder three" />
                  <div className="placeholder-center">
                    <Sparkles size={25} />
                  </div>
                  <div className="placeholder-grid" />
                </div>
              )}
              <span className="paper-caption">
                {result ? 'AIM CAMERA. MAKE CONNECTION.' : 'A LITTLE SQUARE OF POSSIBILITY.'}
              </span>
            </div>
            <div className="floating-note">
              <span className="tiny-spark">✳</span>
              {result ? 'Made by you.' : 'Your next big thing.'}
            </div>
          </div>
          <h3 aria-live="polite">
            {result ? 'Ready for the real world.' : 'Good things come in squares.'}
          </h3>
          <p>
            {result
              ? 'Download it. Print it. Put it out there.'
              : 'Your QR code will appear here. A tiny shortcut to something great.'}
          </p>
          <div className="download-buttons">
            <Button
              variant="dark"
              disabled={!result || downloadBusy}
              onClick={() => void downloadQR('png')}
            >
              <ArrowDownToLine size={17} /> PNG
            </Button>
            <Button
              variant="outline-dark"
              disabled={!result || downloadBusy}
              onClick={() => void downloadQR('svg')}
            >
              <ArrowDownToLine size={17} /> SVG
            </Button>
          </div>
          <span className="download-caption">
            {downloadBusy ? 'Preparing your download…' : 'PNG for everyday. SVG for any size.'}
          </span>
          {result && (
            <button
              className="text-button mt-3"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(result.data)
                  notify('Encoded content copied.')
                } catch {
                  notify('Clipboard is unavailable in this browser.')
                }
              }}
            >
              <Copy size={14} /> Copy encoded content
            </button>
          )}
          {result && !user ? (
            <div className="retain-card">
              <Sparkles size={21} />
              <div>
                <h4>This one’s a keeper.</h4>
                <p>Save your QR code and give your next ideas a home.</p>
                <Link
                  to="/register"
                  onClick={() =>
                    sessionStorage.setItem('qrfactory.draft', JSON.stringify(resultDraft))
                  }
                >
                  Save with a free account <ArrowRight size={14} />
                </Link>
                <Link
                  className="retain-login"
                  to="/login"
                  onClick={() =>
                    sessionStorage.setItem('qrfactory.draft', JSON.stringify(resultDraft))
                  }
                >
                  Already a member? Log in
                </Link>
              </div>
            </div>
          ) : result && 'id' in result ? (
            <Link className="saved-card" to="/library">
              <CheckCheck size={20} />
              <span>
                Saved in your workspace<small>Manage, organize, and share</small>
              </span>
              <ArrowRight size={18} />
            </Link>
          ) : (
            <div className="preview-bottom">
              <Globe size={15} /> Made to work wherever life takes you.
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
