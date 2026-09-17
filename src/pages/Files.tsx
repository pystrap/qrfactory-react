import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownToLine,
  FileText,
  FileUp,
  Image,
  Music2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Video,
} from 'lucide-react'
import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import { api, API_BASE, download, patch } from '../api'
import { useApp } from '../context'
import { UpgradeCard } from '../billing'
import {
  bytes,
  ConfirmDelete,
  dateLabel,
  EmptyState,
  ErrorNotice,
  Loading,
  PageHeading,
  Pagination,
} from '../components'
import type { Asset, Page, Usage } from '../types'

export default function Files() {
  const { notify, entitlements } = useApp()
  const [files, setFiles] = useState<Page<Asset> | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState<Asset | null>(null)
  const [renaming, setRenaming] = useState<Asset | null>(null)
  const [replacing, setReplacing] = useState<Asset | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  useEffect(() => {
    let live = true
    setLoading(true)
    const timer = setTimeout(
      () =>
        Promise.all([
          api<Page<Asset>>(
            `/media-assets?page_size=12&page=${page}&q=${encodeURIComponent(query)}`,
          ),
          api<Usage>('/media-assets/usage'),
        ])
          .then(([assets, limits]) => {
            if (live) {
              setFiles(assets)
              setUsage(limits)
              setError('')
            }
          })
          .catch((e) => live && setError(e.message))
          .finally(() => live && setLoading(false)),
      200,
    )
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [reload, query, page])
  async function upload(file: File) {
    if (entitlements?.tier !== 'pro') {
      setError('Upgrade to Pro to upload or replace files.')
      return
    }
    if (usage && file.size > usage.max_upload_bytes) {
      setError(`Choose a file smaller than ${bytes(usage.max_upload_bytes)}.`)
      return
    }
    setBusy(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', file)
      await api(replacing ? `/media-assets/${replacing.id}` : '/media-assets', {
        method: replacing ? 'PATCH' : 'POST',
        body,
      })
      notify(
        replacing
          ? 'File replaced. Existing QR links now serve the new version.'
          : 'File uploaded. Create a QR to start sharing it.',
      )
      setReload((n) => n + 1)
      setPage(1)
      setReplacing(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const chooseUpload = () => {
    setReplacing(null)
    input.current?.click()
  }
  return (
    <>
      {entitlements?.tier !== 'pro' && (
        <UpgradeCard reason="Give your files a shortcut with Pro." />
      )}
      <PageHeading
        eyebrow="YOUR CONTENT, CONNECTED"
        title="File library"
        description="A home for the things you want to put out there."
        action={
          <Button onClick={chooseUpload} disabled={busy || entitlements?.tier !== 'pro'}>
            <FileUp size={17} />
            {busy ? 'Uploading…' : 'Upload a file'}
          </Button>
        }
      />
      <input
        ref={input}
        className="visually-hidden"
        type="file"
        aria-label="Upload or replace file"
        accept={usage?.allowed_extensions.join(',')}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
          e.target.value = ''
        }}
      />
      <div className="file-library-top">
        <button
          className="upload-zone library-dropzone"
          disabled={busy || entitlements?.tier !== 'pro'}
          onClick={chooseUpload}
        >
          <span className="upload-icon">
            <FileUp size={24} />
          </span>
          <strong>
            {busy ? 'Uploading your next big thing…' : 'Give your content a little more reach.'}
          </strong>
          <span>
            Choose a document, image, video, or audio file · up to{' '}
            {bytes(usage?.max_upload_bytes || 26214400)}
          </span>
        </button>
        <div className="storage-card">
          <span className="eyebrow">A LITTLE ROOM TO GROW</span>
          <h3>
            {usage ? bytes(usage.used_bytes) : '—'}{' '}
            <span>of {usage ? bytes(usage.limit_bytes) : '—'}</span>
          </h3>
          <div className="storage-track">
            <span
              style={{
                width: `${usage ? Math.min(100, (usage.used_bytes / usage.limit_bytes) * 100) : 0}%`,
              }}
            />
          </div>
          <p>Replace a file and every linked QR updates with it.</p>
        </div>
      </div>
      <div className="library-toolbar">
        <div className="search-field">
          <Search size={17} />
          <Form.Control
            aria-label="Search files"
            placeholder="Find a file…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <span className="text-muted small ms-auto">{files?.total || 0} files in your library</span>
      </div>
      <ErrorNotice error={error} />
      {loading ? (
        <Loading />
      ) : files?.items.length ? (
        <div className="file-list">
          {files.items.map((asset) => {
            const Icon = asset.content_type.startsWith('image/')
              ? Image
              : asset.content_type.startsWith('video/')
                ? Video
                : asset.content_type.startsWith('audio/')
                  ? Music2
                  : FileText
            return (
              <article className="file-row" key={asset.id}>
                <span className="file-type-icon lavender">
                  <Icon size={25} />
                </span>
                <div className="file-info">
                  <h3>{asset.title}</h3>
                  <p>
                    {asset.original_name} · {bytes(asset.size)}
                    <span> · {dateLabel(asset.created_at)}</span>
                  </p>
                </div>
                <span className="file-links">
                  {asset.qr_count} linked QR{asset.qr_count === 1 ? '' : 's'}
                </span>
                <div className="file-actions">
                  <button
                    className="icon-button"
                    aria-label={`Download ${asset.title}`}
                    onClick={() =>
                      void download(
                        `${API_BASE}/media-assets/${asset.id}/download`,
                        asset.original_name,
                        true,
                      ).catch((e) => setError(e.message))
                    }
                  >
                    <ArrowDownToLine size={17} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Rename ${asset.title}`}
                    onClick={() => {
                      setRenaming(asset)
                      setName(asset.title)
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Replace ${asset.title}`}
                    disabled={busy}
                    onClick={() => setReplacing(asset)}
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    className="icon-button danger-hover"
                    aria-label={`Delete ${asset.title}`}
                    onClick={() => setDeleting(asset)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        !error && (
          <EmptyState
            title="Good things are on their way."
            description="Upload a file, then create a file QR to share it with a scan."
            action={
              <Button onClick={chooseUpload}>
                <FileUp size={17} /> Upload your first file
              </Button>
            }
          />
        )
      )}
      {files && <Pagination page={page} total={files.total} onChange={setPage} />}
      <div className="workspace-tip">
        <FileText size={20} />
        <p>
          Files become public to anyone with an active QR link. Create a file QR to start sharing.
        </p>
        <Link to="/create?type=media">Create file QR →</Link>
      </div>
      {replacing && (
        <Modal show onHide={() => !busy && setReplacing(null)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Same QR. Fresh content.</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              Replace “{replacing.title}” with a new file. All {replacing.qr_count} linked QR codes
              will immediately serve the replacement.
            </p>
            <ErrorNotice error={error} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" disabled={busy} onClick={() => setReplacing(null)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => input.current?.click()}>
              {busy ? 'Replacing…' : 'Choose replacement'}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
      {renaming && (
        <Modal show onHide={() => !busy && setRenaming(null)} centered>
          <Modal.Header closeButton>
            <Modal.Title>A more memorable name.</Modal.Title>
          </Modal.Header>
          <Form
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              try {
                await patch(`/media-assets/${renaming.id}`, { title: name })
                setRenaming(null)
                setReload((n) => n + 1)
                notify('File renamed.')
              } catch (err) {
                setError((err as Error).message)
              } finally {
                setBusy(false)
              }
            }}
          >
            <Modal.Body>
              <Form.Group controlId="file-name">
                <Form.Label>File name</Form.Label>
                <Form.Control
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={255}
                />
              </Form.Group>
              <ErrorNotice error={error} />
            </Modal.Body>
            <Modal.Footer>
              <Button type="submit" disabled={busy}>
                Save name
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      )}
      {deleting && (
        <ConfirmDelete
          title="Delete this file?"
          description={
            deleting.qr_count
              ? 'This file is used by QR codes. Delete those codes first, or replace the file to preserve their links.'
              : `“${deleting.title}” will be permanently removed from your library and storage.`
          }
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api(`/media-assets/${deleting.id}`, { method: 'DELETE' })
            setPage(1)
            setReload((n) => n + 1)
            notify('File deleted.')
          }}
        />
      )}
    </>
  )
}
