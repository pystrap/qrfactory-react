import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { api, API_BASE, download } from '../api'
import { useApp } from '../context'
import { bytes, ErrorNotice } from '../components'
import DesignControls, { defaultOptions, type DesignOptions } from '../DesignControls'
import { contentTypes } from './Generator'
import type { Page } from '../types'

type BatchConfig = {
  max_rows: number
  max_upload_bytes: number
  retention_days: number
  max_active: number
  storage_bytes: number
  schemas: Record<string, string[]>
}
type Job = {
  id: string
  name: string
  status: string
  total: number
  processed: number
  succeeded: number
  failed: number
  error: string
  expires_at: string
  created_at: string
}
type Inspection = { headers: string[]; total: number; preview: string[][] }
export default function Batch() {
  const { user, entitlements, notify } = useApp()
  const pro = entitlements?.tier === 'pro'
  const [config, setConfig] = useState<BatchConfig | null>(null)
  const [kind, setKind] = useState('auto')
  const [file, setFile] = useState<File | null>(null)
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [options, setOptions] = useState<DesignOptions>(defaultOptions)
  const [jobs, setJobs] = useState<Job[]>([])
  const [busy, setBusy] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const [inspecting, setInspecting] = useState(false)
  const [error, setError] = useState('')
  const [jobsError, setJobsError] = useState('')
  const [jobBusy, setJobBusy] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const attempt = useRef<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const jobsRef = useRef<HTMLElement>(null)
  useEffect(() => {
    api<BatchConfig>('/batches/config')
      .then(setConfig)
      .catch((e) => setError(e.message))
  }, [])
  const refresh = useCallback(async () => {
    if (!user) return
    try {
      const result = await api<Page<Job>>(`/batches?page=${page}&page_size=10`)
      setJobs(result.items)
      setTotal(result.total)
      setJobsError('')
    } catch (e) {
      setJobsError((e as Error).message)
    }
  }, [user, page])
  useEffect(() => {
    void refresh()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 4000)
    return () => clearInterval(timer)
  }, [refresh])
  useEffect(() => {
    attempt.current = null
    setInspection(null)
    if (!file || !pro) return
    let active = true
    const form = new FormData()
    form.append('file', file)
    form.append('payload_type', kind)
    setInspecting(true)
    setError('')
    api<Inspection>('/batches/inspect', { method: 'POST', body: form })
      .then((data) => {
        if (active) setInspection(data)
      })
      .catch((e) => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setInspecting(false)
      })
    return () => {
      active = false
    }
  }, [file, kind, pro])
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!file || !inspection || !pro || busy) return
    setBusy(true)
    setError('')
    attempt.current ||= crypto.randomUUID()
    const form = new FormData()
    form.append('file', file)
    form.append('payload_type', kind)
    form.append('options', JSON.stringify(options))
    try {
      await api<Job>('/batches', {
        method: 'POST',
        body: form,
        headers: { 'Idempotency-Key': attempt.current },
      })
      attempt.current = null
      setFile(null)
      setInspection(null)
      if (fileInput.current) fileInput.current.value = ''
      setPage(1)
      await refresh()
      notify('Your batch is queued. You can leave this page while it runs.')
      jobsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function jobAction(job: Job, action: 'download' | 'cancel' | 'delete') {
    setJobBusy(job.id)
    setJobsError('')
    try {
      if (action === 'download')
        await download(
          `${API_BASE}/batches/${job.id}/download`,
          `qrfactory-batch-${job.id}.zip`,
          true,
        )
      else {
        await api(`/batches/${job.id}${action === 'cancel' ? '/cancel' : ''}`, {
          method: action === 'cancel' ? 'POST' : 'DELETE',
        })
        await refresh()
      }
    } catch (e) {
      setJobsError((e as Error).message)
    } finally {
      setJobBusy('')
    }
  }
  return (
    <main id="main-content" className="container-xl batch-page">
      <div className="batch-heading">
        <span className="pill">
          <Layers size={15} /> A WHOLE SHEET OF POSSIBILITIES <span className="pro-label">Pro</span>
        </span>
        <h1>
          Big ideas.
          <br />
          <em>By the batch.</em>
        </h1>
        <p>One spreadsheet. Thousands of QR codes. Your colors, your logo, your time back.</p>
      </div>
      <div className="batch-benefits">
        <span>
          <Check size={16} /> CSV & Excel uploads
        </span>
        <span>
          <Check size={16} /> Up to {config?.max_rows.toLocaleString() || '5,000'} rows per batch
        </span>
        <span>
          <Check size={16} /> No daily generation limit
        </span>
      </div>
      {!pro && (
        <div className="batch-upgrade">
          <div>
            <Sparkles size={24} />
            <h2>A little less repetition. A lot more Pro.</h2>
            <p>
              Make codes for menus, labels, contacts or an entire campaign. Get a spreadsheet with
              QR images in each row, plus every PNG ready to use.
            </p>
          </div>
          <Link className="btn btn-dark" to={user ? '/pricing' : '/register?next=%2Fbatch'}>
            {user ? 'Explore Pro' : 'Create an account'} <ArrowRight size={17} />
          </Link>
          {!user && <Link to="/login?next=%2Fbatch">Already a member? Sign in</Link>}
        </div>
      )}
      <div className="batch-layout">
        <Form onSubmit={submit} className="batch-form glossy-panel">
          <div className="step-label">
            <span>01</span>
            <h2>Start with your sheet.</h2>
          </div>
          <p className="form-description">
            Use one row per QR. Your original columns stay with it.
          </p>
          <Form.Group controlId="batch-type">
            <Form.Label>What are you sharing?</Form.Label>
            <Form.Select
              disabled={busy}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value)
              }}
            >
              <option value="auto">Auto-detect · websites & text</option>
              {contentTypes
                .filter((t) => t.value !== 'media')
                .map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
            </Form.Select>
          </Form.Group>
          <div className="batch-template">
            <FileSpreadsheet size={24} />
            <div>
              <strong>Start with a sample</strong>
              <p>{config?.schemas[kind]?.join(' · ') || 'Data or Text column'}</p>
              <div>
                {['csv', 'xlsx'].map((extension) => (
                  <button
                    key={extension}
                    type="button"
                    className="text-button"
                    onClick={async () => {
                      try {
                        await download(
                          `${API_BASE}/batches/template?type=${kind}&file_format=${extension}`,
                          `qrfactory-${kind}-sample.${extension}`,
                        )
                      } catch (e) {
                        setError((e as Error).message)
                      }
                    }}
                  >
                    <ArrowDownToLine size={14} /> {extension === 'xlsx' ? 'Excel' : 'CSV'} sample
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="batch-tip">
            {['auto', 'url', 'text'].includes(kind)
              ? 'Use Data or Text as the header (any capitalization). Any single-column sheet also works. Auto-detect turns valid links into website codes and everything else into text.'
              : 'Use the sample headers above. Extra columns are kept in your results. Paste formula results as values, and format phone numbers as text.'}
          </p>
          <label className={`upload-zone batch-upload ${!pro ? 'is-locked' : ''}`}>
            <FileSpreadsheet size={30} />
            <strong>
              {inspecting ? 'Checking your sheet…' : file ? file.name : 'Choose your spreadsheet'}
            </strong>
            <span>CSV or XLSX · up to {bytes(config?.max_upload_bytes || 10485760)}</span>
            <input
              ref={fileInput}
              type="file"
              aria-label="Upload batch spreadsheet"
              accept=".csv,.xlsx"
              disabled={!pro || busy || !config}
              onChange={(e) => {
                setFile(e.target.files?.[0] || null)
              }}
            />
          </label>
          {inspection && (
            <div className="sheet-preview">
              <strong>
                <Check size={16} /> {inspection.total.toLocaleString()} rows ready
              </strong>
              <div className="table-responsive" tabIndex={0} aria-label="Spreadsheet preview">
                <table className="table">
                  <thead>
                    <tr>
                      {inspection.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inspection.preview.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, c) => (
                          <td key={c}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <small>
                First {inspection.preview.length} rows. Each row is validated during generation.
              </small>
            </div>
          )}
          <fieldset disabled={busy || logoBusy}>
            <DesignControls
              value={options}
              onChange={(change) => {
                setOptions((old) => ({ ...old, ...change }))
                attempt.current = null
              }}
              payloadType={kind}
              onBusyChange={setLogoBusy}
            />
          </fieldset>
          <ErrorNotice error={error} />
          <Button
            type="submit"
            className="generate-button"
            disabled={!pro || !inspection || busy || logoBusy || inspecting}
          >
            {busy
              ? 'Adding your batch…'
              : `Generate ${inspection ? inspection.total.toLocaleString() : 'batch'} QR codes`}{' '}
            <ArrowRight size={18} />
          </Button>
          <p className="generate-hint">
            {config?.max_active || 2} batches can run at once. Downloads stay available for{' '}
            {config?.retention_days || 7} days.
          </p>
        </Form>
        <aside className="batch-explainer">
          <div className="batch-art" aria-hidden="true">
            <div>
              <span>Your spreadsheet</span>
              {['Website', 'Contact', 'Wi-Fi'].map((text, i) => (
                <div key={text}>
                  <span>0{i + 1}</span>
                  <span>{text}</span>
                  <span className="sheet-qr">▦</span>
                  <Check size={15} />
                </div>
              ))}
            </div>
            <span className="hand-note">A QR for every row. ↗</span>
          </div>
          <h2>Upload. Design. Done.</h2>
          <ol>
            <li>
              <strong>Choose your content.</strong> Download a sample or bring your own CSV or Excel
              sheet. We read its first worksheet.
            </li>
            <li>
              <strong>Make it yours.</strong> Choose a palette, add a center icon or upload your
              logo. Add a short caption if you like.
            </li>
            <li>
              <strong>Get the whole set.</strong> Download a ZIP with an Excel sheet containing QR
              images, a CSV with image filenames, and all the PNGs.
            </li>
          </ol>
          <p>
            Invalid rows stay in your results with a helpful error. Fix those rows and upload them
            again.
          </p>
          <p>
            Batch codes contain their content directly. They don’t appear individually in your QR
            library and don’t include dynamic links or file uploads.
          </p>
          <Link to="/how-it-works#batch">
            Read the batch guide <ArrowRight size={15} />
          </Link>
        </aside>
      </div>
      {user && (
        <section className="batch-jobs" ref={jobsRef} aria-label="Your batches">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR RECENT RUNS</span>
              <h2>Good things in progress.</h2>
            </div>
            <button className="text-button" onClick={() => void refresh()}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
          <ErrorNotice error={jobsError} />
          {!jobs.length ? (
            <p>No batches yet. Your first one starts above.</p>
          ) : (
            jobs.map((job) => (
              <article key={job.id} className="batch-job">
                <FileSpreadsheet size={24} />
                <div className="batch-job-info">
                  <h3>{job.name}</h3>
                  <p>
                    {job.total.toLocaleString()} rows ·{' '}
                    <span className={`job-status status-${job.status}`}>{job.status}</span>
                  </p>
                  {['queued', 'running'].includes(job.status) && (
                    <>
                      <progress
                        max={job.total}
                        value={job.processed}
                        aria-label={`Progress for ${job.name}`}
                      />
                      <small>
                        {job.processed.toLocaleString()} of {job.total.toLocaleString()} processed.
                        You can leave this page.
                      </small>
                    </>
                  )}
                  {job.status === 'completed' && (
                    <small>
                      {job.succeeded.toLocaleString()} ready · {job.failed} row errors · Download by{' '}
                      {new Date(job.expires_at).toLocaleDateString()}
                    </small>
                  )}
                  {job.error && <p className="text-danger">{job.error}</p>}
                </div>
                <div className="batch-job-actions">
                  {job.status === 'completed' && new Date(job.expires_at) > new Date() && (
                    <Button
                      variant="dark"
                      disabled={!!jobBusy}
                      onClick={() => void jobAction(job, 'download')}
                    >
                      <ArrowDownToLine size={16} /> Download ZIP
                    </Button>
                  )}
                  {['queued', 'running'].includes(job.status) ? (
                    <button
                      className="text-button"
                      disabled={!!jobBusy}
                      onClick={() => void jobAction(job, 'cancel')}
                    >
                      <X size={16} /> Cancel
                    </button>
                  ) : (
                    job.status !== 'expired' && (
                      <button
                        className="text-button"
                        disabled={!!jobBusy}
                        onClick={() => void jobAction(job, 'delete')}
                      >
                        <Trash2 size={15} /> Delete files
                      </button>
                    )
                  )}
                </div>
              </article>
            ))
          )}
          {total > 10 && (
            <div className="batch-pagination">
              <Button
                variant="outline-dark"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span>
                Page {page} of {Math.ceil(total / 10)}
              </span>
              <Button
                variant="outline-dark"
                disabled={page * 10 >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
