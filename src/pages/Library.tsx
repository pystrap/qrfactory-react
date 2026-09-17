import { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  Check,
  Copy,
  Heart,
  Link2,
  MoreHorizontal,
  Plus,
  QrCode,
  Search,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import Dropdown from 'react-bootstrap/Dropdown'
import { api, ApiError, API_BASE, download, patch } from '../api'
import { useApp } from '../context'
import { UpgradeCard, UsageBanner } from '../billing'
import {
  ConfirmDelete,
  dateLabel,
  EmptyState,
  ErrorNotice,
  Loading,
  PageHeading,
  Pagination,
} from '../components'
import type { Analytics, Page, Project, QR, Summary } from '../types'
import { contentTypes } from './Generator'

export default function Library() {
  const { user, notify, refreshEntitlements } = useApp()
  const [gateError, setGateError] = useState('')
  const duplicateKeys = useRef(new Map<number, string>())
  async function duplicate(code: QR) {
    const key = duplicateKeys.current.get(code.id) || crypto.randomUUID()
    duplicateKeys.current.set(code.id, key)
    await api(`/qr-codes/${code.id}/duplicate`, {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: '{}',
    })
    duplicateKeys.current.delete(code.id)
    await refreshEntitlements()
  }
  const [params] = useSearchParams()
  const [data, setData] = useState<Page<QR> | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [project, setProject] = useState(params.get('project') || '')
  const [favorite, setFavorite] = useState(false)
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<QR | null>(null)
  const [deleting, setDeleting] = useState<QR | null>(null)
  const [pending, setPending] = useState<number | null>(null)
  useEffect(() => {
    let active = true
    api<Summary>('/qr-codes/summary')
      .then((value) => active && setSummary(value))
      .catch((e) => active && setError(e.message))
    api<Page<Project>>('/projects?page_size=100')
      .then((value) => active && setProjects(value.items))
      .catch((e) => active && setError(e.message))
    return () => {
      active = false
    }
  }, [reload])
  useEffect(() => {
    let active = true
    setLoading(true)
    const timer = setTimeout(() => {
      const filters = new URLSearchParams({ page: String(page), page_size: '12' })
      if (query) filters.set('q', query)
      if (type) filters.set('payload_type', type)
      if (project) filters.set('project_id', project)
      if (favorite) filters.set('favorite', 'true')
      api<Page<QR>>(`/qr-codes?${filters}`)
        .then((value) => {
          if (active) {
            setData(value)
            setError('')
          }
        })
        .catch((e) => active && setError(e.message))
        .finally(() => active && setLoading(false))
    }, 250)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query, type, project, favorite, page, reload])
  const refresh = () => setReload((value) => value + 1)
  async function act(code: QR, task: () => Promise<unknown>, success: string) {
    setPending(code.id)
    setGateError('')
    try {
      await task()
      notify(success)
      refresh()
    } catch (e) {
      if (e instanceof ApiError && ['daily_limit', 'pro_required'].includes(e.code || ''))
        setGateError(e.message)
      else setError((e as Error).message)
      await refreshEntitlements()
    } finally {
      setPending(null)
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="YOUR CREATIVE CORNER"
        title="My QR codes"
        description={`Good to see you${user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}. What will you connect today?`}
        action={
          <Link className="btn btn-primary" to="/create">
            <Plus size={17} /> Create QR code
          </Link>
        }
      />
      <UsageBanner />
      {gateError && <UpgradeCard reason={gateError} />}
      <div className="stats-grid">
        {[
          { label: 'Total QR codes', value: summary?.total, icon: QrCode, color: 'lavender' },
          { label: 'Dynamic codes', value: summary?.dynamic, icon: Link2, color: 'mint' },
          { label: 'Total scans', value: summary?.scans, icon: BarChart3, color: 'peach' },
          { label: 'Favorites', value: summary?.favorites, icon: Heart, color: 'butter' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div className="stat-card" key={label}>
            <span className={`stat-icon ${color}`}>
              <Icon size={20} />
            </span>
            <span>
              {label}
              <strong>{value ?? '—'}</strong>
            </span>
          </div>
        ))}
      </div>
      <div className="library-toolbar">
        <div className="search-field">
          <Search size={17} />
          <Form.Control
            aria-label="Search QR codes"
            placeholder="Find a QR code…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Form.Select
          aria-label="Filter content type"
          value={type}
          onChange={(e) => {
            setType(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All types</option>
          {contentTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Form.Select>
        <Form.Select
          aria-label="Filter project"
          value={project}
          onChange={(e) => {
            setProject(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Form.Select>
        <Button
          variant={favorite ? 'primary' : 'light'}
          className="favorite-filter"
          aria-pressed={favorite}
          onClick={() => {
            setFavorite(!favorite)
            setPage(1)
          }}
        >
          <Heart size={16} fill={favorite ? 'currentColor' : 'none'} /> Favorites
        </Button>
      </div>
      <ErrorNotice error={error} />
      {loading ? (
        <Loading />
      ) : data?.items.length ? (
        <div className="qr-grid">
          {data.items.map((code) => {
            const paused =
              code.is_dynamic &&
              (!code.is_active || (!!code.expires_at && new Date(code.expires_at) <= new Date()))
            return (
              <article className="qr-card" key={code.id}>
                <div className={`qr-card-image ${code.is_dynamic ? 'qr-dynamic-bg' : ''}`}>
                  <button
                    className="qr-preview-button"
                    onClick={() => setSelected(code)}
                    aria-label={`Manage ${code.title || 'Untitled QR'}`}
                  >
                    <img
                      src={code.url}
                      alt={`QR code for ${code.title || code.payload_type}`}
                      loading="lazy"
                    />
                  </button>
                  <span className={`code-badge ${paused ? 'paused' : ''}`}>
                    {paused ? 'Paused / expired' : code.is_dynamic ? 'Dynamic' : 'Static'}
                  </span>
                  <button
                    className={`icon-button favorite-button ${code.is_favorite ? 'is-favorite' : ''}`}
                    aria-label={code.is_favorite ? 'Remove favorite' : 'Add favorite'}
                    disabled={pending === code.id}
                    onClick={() =>
                      void act(
                        code,
                        () => patch(`/qr-codes/${code.id}`, { is_favorite: !code.is_favorite }),
                        code.is_favorite ? 'Removed from favorites.' : 'Added to favorites.',
                      )
                    }
                  >
                    <Heart size={18} fill={code.is_favorite ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <div className="qr-card-content">
                  <div>
                    <span className="content-type">
                      {contentTypes.find((t) => t.value === code.payload_type)?.label ||
                        code.payload_type}
                    </span>
                    <Dropdown align="end">
                      <Dropdown.Toggle
                        as="button"
                        className="icon-button no-caret"
                        aria-label={`Actions for ${code.title || 'Untitled QR'}`}
                      >
                        <MoreHorizontal size={19} />
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        <Dropdown.Item onClick={() => setSelected(code)}>
                          <Settings2 size={15} /> Manage QR code
                        </Dropdown.Item>
                        <Dropdown.Item
                          disabled={pending === code.id}
                          onClick={() =>
                            void act(code, () => duplicate(code), 'A fresh copy is ready.')
                          }
                        >
                          <Copy size={15} /> Duplicate
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => setDeleting(code)} className="text-danger">
                          <Trash2 size={15} /> Delete
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>
                  <button className="qr-title-button" onClick={() => setSelected(code)}>
                    {code.title || 'Untitled QR code'}
                  </button>
                  <p className="qr-destination">
                    {code.destination_url ||
                      (code.payload_type === 'media'
                        ? 'A file worth sharing'
                        : code.payload_type === 'wifi'
                          ? 'Wi-Fi network'
                          : code.data)}
                  </p>
                  <div className="qr-card-footer">
                    <span>
                      {code.is_dynamic ? (
                        <>
                          <BarChart3 size={13} /> {code.scan_count} scans
                        </>
                      ) : (
                        dateLabel(code.created_at)
                      )}
                    </span>
                    <button
                      className="text-button"
                      disabled={pending === code.id}
                      onClick={() =>
                        void act(
                          code,
                          () =>
                            download(
                              `${API_BASE}/qr-codes/${code.id}/download?image_format=png`,
                              `qrfactory-${code.id}.png`,
                              true,
                            ),
                          'Your download is ready.',
                        )
                      }
                    >
                      <ArrowDownToLine size={15} /> Download
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        !error && (
          <EmptyState
            title={
              query || favorite || project || type
                ? 'No matches just yet.'
                : 'Your first connection starts here.'
            }
            description={
              query || favorite || project || type
                ? 'Try another search or clear your filters.'
                : 'Create a QR code and give your ideas a shortcut to the world.'
            }
            action={
              <Link className="btn btn-primary" to="/create">
                <Plus size={17} /> Create QR code
              </Link>
            }
          />
        )
      )}
      {data && <Pagination page={page} total={data.total} onChange={setPage} />}
      <div className="workspace-tip">
        <Sparkles size={19} />
        <p>
          <strong>Print once. Keep things fresh.</strong> Dynamic website codes let you update your
          destination without changing the QR.
        </p>
        <Link to="/create?type=url">
          Try it <ArrowUpRight size={15} />
        </Link>
      </div>
      {selected && (
        <QRDetails
          code={selected}
          projects={projects}
          onClose={() => {
            setSelected(null)
            requestAnimationFrame(() =>
              document.getElementById('main-content')?.focus({ preventScroll: true }),
            )
          }}
          onSaved={refresh}
        />
      )}
      {deleting && (
        <ConfirmDelete
          title="Delete this QR code?"
          description={`“${deleting.title || 'Untitled QR code'}” will leave your library. Its hosted image and dynamic link will stop working. Downloaded static codes cannot be revoked.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api(`/qr-codes/${deleting.id}`, { method: 'DELETE' })
            setPage(1)
            refresh()
            notify('QR code deleted.')
          }}
        />
      )}
    </>
  )
}

function QRDetails({
  code,
  projects,
  onClose,
  onSaved,
}: {
  code: QR
  projects: Project[]
  onClose: () => void
  onSaved: () => void
}) {
  const { notify } = useApp()
  const [title, setTitle] = useState(code.title || '')
  const [project, setProject] = useState(String(code.project_id || ''))
  const [destination, setDestination] = useState(code.destination_url)
  const [active, setActive] = useState(code.is_active)
  const [expiry, setExpiry] = useState(
    code.expires_at
      ? new Date(
          new Date(code.expires_at).getTime() -
            new Date(code.expires_at).getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(0, 16)
      : '',
  )
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    api<Analytics>(`/qr-codes/${code.id}/analytics`)
      .then((value) => live && setAnalytics(value))
      .catch((e) => live && setError(e.message))
    return () => {
      live = false
    }
  }, [code.id])
  return (
    <Modal show onHide={() => !busy && onClose()} restoreFocus={false} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Make it work for you.</Modal.Title>
      </Modal.Header>
      <Form
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          try {
            const data: Record<string, unknown> = {
              title,
              project_id: project ? Number(project) : null,
            }
            if (code.is_dynamic) {
              data.is_active = active
              if (
                expiry !==
                (code.expires_at
                  ? new Date(
                      new Date(code.expires_at).getTime() -
                        new Date(code.expires_at).getTimezoneOffset() * 60000,
                    )
                      .toISOString()
                      .slice(0, 16)
                  : '')
              )
                data.expires_at = expiry ? new Date(expiry).toISOString() : null
              if (code.payload_type === 'url') data.destination_url = destination
            }
            await patch(`/qr-codes/${code.id}`, data)
            onSaved()
            notify('Changes saved. Your QR stays the same.')
            onClose()
          } catch (e) {
            setError((e as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        <Modal.Body>
          <div className="details-layout">
            <div className="details-preview">
              <img src={code.url} alt="QR code preview" />
              <div className="d-flex gap-2 justify-content-center">
                {['png', 'svg'].map((format) => (
                  <Button
                    key={format}
                    size="sm"
                    variant="light"
                    onClick={() =>
                      void download(
                        `${API_BASE}/qr-codes/${code.id}/download?image_format=${format}`,
                        `qrfactory-${code.id}.${format}`,
                        true,
                      ).catch((e) => setError(e.message))
                    }
                  >
                    <ArrowDownToLine size={14} />
                    {format.toUpperCase()}
                  </Button>
                ))}
              </div>
              <small>Created {dateLabel(code.created_at)}</small>
            </div>
            <div className="details-fields">
              <Form.Group controlId="edit-title">
                <Form.Label>QR code name</Form.Label>
                <Form.Control
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={255}
                />
              </Form.Group>
              <Form.Group controlId="edit-project">
                <Form.Label>Project</Form.Label>
                <Form.Select value={project} onChange={(e) => setProject(e.target.value)}>
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              {code.is_dynamic && (
                <>
                  {code.payload_type === 'url' && (
                    <Form.Group controlId="edit-destination">
                      <Form.Label>Website destination</Form.Label>
                      <Form.Control
                        type="url"
                        required
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                      />
                      <Form.Text>Update the link. Keep the printed QR.</Form.Text>
                    </Form.Group>
                  )}
                  <Form.Check
                    type="switch"
                    id="edit-active"
                    label={active ? 'Sharing is active' : 'Sharing is paused'}
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  <Form.Group controlId="edit-expiry">
                    <Form.Label>
                      Expiry <span className="optional">optional · your local time</span>
                    </Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                    />
                  </Form.Group>
                  {code.share_url && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(code.share_url!)
                          notify('Share link copied.')
                        } catch {
                          setError('Clipboard access is unavailable.')
                        }
                      }}
                    >
                      <Copy size={14} /> Copy permanent link
                    </button>
                  )}
                  {code.payload_type === 'media' && (
                    <Link className="small" to="/files">
                      Replace the shared file in your file library <ArrowUpRight size={14} />
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
          {code.is_dynamic && analytics && (
            <div className="analytics-panel">
              <div>
                <span className="eyebrow">LAST 30 DAYS</span>
                <strong>
                  {analytics.total_scans} <small>total scans</small>
                </strong>
              </div>
              <div
                className="scan-chart"
                role="img"
                aria-label="Daily scan activity over the last 30 days"
              >
                {analytics.days.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.count} scans`}
                    style={{
                      height: `${Math.max(4, (day.count / Math.max(1, ...analytics.days.map((d) => d.count))) * 100)}%`,
                    }}
                  />
                ))}
              </div>
              <small>
                Link visits, including repeat visits and previews. No scanner IP addresses stored.
              </small>
            </div>
          )}
          <ErrorNotice error={error} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? (
              'Saving…'
            ) : (
              <>
                <Check size={16} /> Save changes
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
