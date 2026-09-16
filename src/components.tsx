import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  Boxes,
  Files,
  FolderOpen,
  LayoutGrid,
  LogOut,
  Menu,
  Plus,
  QrCode,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import Alert from 'react-bootstrap/Alert'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import { useApp } from './context'

export const bytes = (size: number) =>
  size >= 1048576
    ? `${(size / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`
export const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`brand ${inverse ? 'brand-inverse' : ''}`} to="/" aria-label="QRFactory home">
      <img src="/logo.svg" width="36" height="36" alt="" />
      <span>
        qr<span className="brand-light">factory</span>
        <span className="brand-dot">®</span>
      </span>
    </Link>
  )
}
export function Header() {
  const { user } = useApp()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setOpen(false), [location])
  return (
    <header className="site-header">
      <div className="container-xl header-inner">
        <Logo />
        <nav className={`header-links ${open ? 'is-open' : ''}`} aria-label="Main navigation">
          <Link to="/create">QR generator</Link>
          <a href="/#possibilities">What can I create?</a>
          <Link to="/library">My QR codes</Link>
        </nav>
        <div className="header-actions">
          {user ? (
            <Link className="btn btn-dark btn-sm" to="/library">
              Your workspace <ArrowRight size={15} />
            </Link>
          ) : (
            <>
              <Link className="login-link" to="/login">
                Log in
              </Link>
              <Link className="btn btn-dark btn-sm" to="/register">
                Get started <ArrowRight size={15} />
              </Link>
            </>
          )}
          <button
            className="icon-button mobile-menu"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  )
}
export function Footer() {
  return (
    <footer className="site-footer container-xl">
      <Logo />
      <p>A little code. A world of possibilities.</p>
      <span>Made for your next big thing. © {new Date().getFullYear()}</span>
    </footer>
  )
}
const workspaceLinks = [
  { to: '/library', icon: LayoutGrid, text: 'My QR codes' },
  { to: '/files', icon: Files, text: 'File library' },
  { to: '/projects', icon: FolderOpen, text: 'Projects' },
  { to: '/account', icon: UserRound, text: 'My account' },
]
export function Workspace({ children }: { children: ReactNode }) {
  const { user, logout } = useApp()
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link className="btn btn-primary w-100 mb-4" to="/create">
          <Plus size={18} /> Create QR code
        </Link>
        <span className="eyebrow sidebar-label">YOUR WORKSPACE</span>
        <nav aria-label="Workspace">
          {workspaceLinks.map(({ to, icon: Icon, text }) => (
            <NavLink key={to} to={to}>
              <Icon size={19} />
              {text}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <Sparkles size={22} />
          <h6>Big ideas. Small squares.</h6>
          <p>Your next connection is just a scan away.</p>
          <Link to="/create">
            Make something new <ArrowRight size={14} />
          </Link>
        </div>
        <div className="sidebar-user">
          <span className="avatar">{(user?.full_name || user?.email || 'Y')[0].toUpperCase()}</span>
          <div>
            <strong>{user?.full_name || 'Your workspace'}</strong>
            <small>{user?.email}</small>
          </div>
          <button
            className="icon-button"
            aria-label="Sign out"
            onClick={() => void logout().catch(() => {})}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <main className="workspace-main" id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}
export function ErrorNotice({ error }: { error: string }) {
  return error ? (
    <Alert variant="danger" role="alert" className="error-notice">
      {error}
    </Alert>
  ) : null
}
export function Loading() {
  return (
    <div className="loading-state" role="status">
      <span className="spinner-border spinner-border-sm" /> Getting things ready…
    </div>
  )
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Boxes size={32} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}
export function ConfirmDelete({
  title,
  description,
  onClose,
  onConfirm,
}: {
  title: string
  description: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <Modal show onHide={() => !busy && onClose()} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{description}</p>
        <ErrorNotice error={error} />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" disabled={busy} onClick={onClose}>
          Keep it
        </Button>
        <Button
          variant="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await onConfirm()
              onClose()
            } catch (e) {
              setError((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Deleting…' : 'Delete permanently'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
export function Pagination({
  page,
  total,
  size = 12,
  onChange,
}: {
  page: number
  total: number
  size?: number
  onChange: (page: number) => void
}) {
  if (total <= size) return null
  return (
    <nav className="pagination-bar" aria-label="Pagination">
      <span>
        {(page - 1) * size + 1}–{Math.min(page * size, total)} of {total}
      </span>
      <div>
        <Button variant="light" size="sm" disabled={page === 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <span>Page {page}</span>
        <Button
          variant="light"
          size="sm"
          disabled={page * size >= total}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  )
}
export function SignInPrompt() {
  return (
    <main className="container-xl auth-required" id="main-content">
      <div className="empty-icon">
        <QrCode size={36} />
      </div>
      <span className="eyebrow">YOUR NEXT CHAPTER</span>
      <h1>A home for every QR code.</h1>
      <p>Save your creations, organize projects, share files, and see your connections grow.</p>
      <Link className="btn btn-primary" to="/register">
        Create your free account <ArrowRight size={17} />
      </Link>
      <p className="mt-3 small">
        Already here? <Link to="/login">Log in</Link>
      </p>
    </main>
  )
}
