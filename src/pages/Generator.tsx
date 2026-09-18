import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCheck,
  Copy,
  FileUp,
  Globe,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  Type,
  UserRound,
  Wifi,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import { api, ApiError, API_BASE, download } from '../api'
import { useApp } from '../context'
import { UpgradeCard, UsageBanner } from '../billing'
import DesignControls, { type QRDesign } from '../DesignControls'
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
    label: 'URL',
    icon: Link2,
    fields: [{ key: 'url', label: 'Your URL', placeholder: 'Paste a link, like yourwebsite.com' }],
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
  design?: QRDesign
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
function initialDraft(restoreSavedDraft = true): Draft {
  if (restoreSavedDraft) {
    try {
      const draft = JSON.parse(sessionStorage.getItem('qrfactory.draft') || 'null')
      if (draft?.payload_type) return draft
    } catch {
      /* Ignore an invalid old draft. */
    }
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
  const { user, notify, entitlements, refreshEntitlements } = useApp()
  const [gateError, setGateError] = useState('')
  const attempt = useRef<{ body: string; key: string } | null>(null)
  const [search] = useSearchParams()
  const [draft, setDraft] = useState<Draft>(() => {
    const requestedType = compact ? null : search.get('type')
    const type = contentTypes.find((item) => item.value === requestedType)?.value
    // Explicit type links start fresh; plain /create still resumes a signup draft.
    const d = initialDraft(!compact && !type)
    return type ? { ...d, payload_type: type } : d
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
  const loginRequired = !user && !['url', 'text', 'wifi'].includes(type.value)
  const proRequired = type.value === 'media' && entitlements?.tier !== 'pro'
  const limitReached = entitlements?.remaining === 0 && (!user || type.value !== 'url')
  const blocked = loginRequired || proRequired || limitReached
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
    if (blocked) return
    setBusy(true)
    setError('')
    setGateError('')
    try {
      const body = { ...draft, is_dynamic: draft.payload_type === 'media' || draft.is_dynamic }
      const serialized = JSON.stringify(body)
      if (attempt.current?.body !== serialized)
        attempt.current = { body: serialized, key: crypto.randomUUID() }
      const response = await api<QR | Preview>(user ? '/qr-codes' : '/qr-codes/preview', {
        method: 'POST',
        body: serialized,
        headers: { 'Idempotency-Key': attempt.current.key },
      })
      attempt.current = null
      await refreshEntitlements()
      setResult(response)
      setResultDraft(body)
      sessionStorage.removeItem('qrfactory.draft')
      if (user) notify('QR code saved to your workspace.')
    } catch (e) {
      if (
        e instanceof ApiError &&
        ['login_required', 'pro_required', 'device_limit', 'daily_limit'].includes(e.code || '')
      )
        setGateError(e.message)
      else setError((e as Error).message)
      await refreshEntitlements()
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
        await download(result.images[format], `qrfactory.${format}`)
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
          {user ? 'Saved to your workspace' : 'URL, text & Wi-Fi · 20 free generations'}
        </span>
      </div>
      <UsageBanner onContinue={remember} />
      <div className="type-tabs" role="group" aria-label="QR content type">
        {contentTypes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            aria-pressed={draft.payload_type === value}
            className={draft.payload_type === value ? 'selected' : ''}
            onClick={() => {
              update({ payload_type: value, payload: {}, is_dynamic: false, media_id: undefined })
              setError('')
              setGateError('')
            }}
          >
            <Icon size={18} />
            <span>{label}</span>
            {value === 'media' ? (
              <small className="type-badge">Pro</small>
            ) : !user && !['url', 'text', 'wifi'].includes(value) ? (
              <small className="type-badge">Sign in</small>
            ) : null}
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
          {(blocked || gateError) && (
            <UpgradeCard
              onContinue={remember}
              reason={
                gateError ||
                (limitReached
                  ? !user
                    ? 'Your 20 free device generations are all used.'
                    : 'You’ve made your 10 daily connections.'
                  : loginRequired
                    ? 'A free account opens more doors.'
                    : 'Give your files the Pro treatment.')
              }
            />
          )}
          <fieldset disabled={blocked || busy}>
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
              (proRequired ? null : (
                <div className="file-picker">
                  <label className={`upload-zone ${uploadBusy ? 'busy' : ''}`}>
                    <FileUp size={26} />
                    <strong>
                      {uploadBusy ? 'Uploading your file…' : 'Choose a file to share'}
                    </strong>
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
          </fieldset>
          <ErrorNotice error={error} />
          {!blocked && (
            <Button
              type="submit"
              className="generate-button"
              disabled={
                busy || uploadBusy || !entitlements || (type.value === 'media' && !draft.media_id)
              }
            >
              {busy ? (
                <>
                  <span className="spinner-border spinner-border-sm" /> Making your QR…
                </>
              ) : (
                <>
                  Generate QR Code <ArrowRight size={19} />
                </>
              )}
            </Button>
          )}
          <p className="generate-hint">
            {user
              ? 'Your QR is automatically saved to your workspace.'
              : 'Download your QR right away. No account needed for website, text and Wi-Fi.'}
          </p>
          <fieldset disabled={busy || uploadBusy}>
            <DesignControls
              value={draft}
              onChange={update}
              payloadType={type.value}
              onContinue={remember}
              onBusyChange={setUploadBusy}
            />
            {user && (
              <details className="save-details">
                <summary>
                  Save & manage <span className="optional">optional</span>
                </summary>
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
              </details>
            )}
          </fieldset>
          {!blocked && (
            <div className="generate-again">
              <span>Happy with your design?</span>
              <Button
                type="submit"
                variant="dark"
                disabled={
                  busy || uploadBusy || !entitlements || (type.value === 'media' && !draft.media_id)
                }
              >
                {busy ? 'Generating…' : 'Generate'} <ArrowRight size={16} />
              </Button>
            </div>
          )}
          <div className="generator-fineprint">
            <Check size={13} />{' '}
            {user
              ? 'Always yours. Ready to share.'
              : '20 free generations on this device. Downloads included.'}
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
