import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, LogOut, ShieldCheck } from 'lucide-react'
import Button from 'react-bootstrap/Button'
import { useApp } from '../context'
import { UsageBanner, UpgradeCard } from '../billing'
import { dateLabel, PageHeading } from '../components'

export default function Account() {
  const { user, logout, entitlements } = useApp()
  const navigate = useNavigate()
  return (
    <>
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="Your account"
        description="A little corner of QRFactory, just for you."
      />
      <UsageBanner />
      {entitlements?.tier !== 'pro' && <UpgradeCard />}
      <Link className="text-button mb-4" to="/pricing">
        Manage plan & billing <ArrowRight size={16} />
      </Link>
      <div className="account-card">
        <span className="avatar large">
          {(user?.full_name || user?.email || 'Y')[0].toUpperCase()}
        </span>
        <h2>{user?.full_name || 'Your account'}</h2>
        <p>{user?.email}</p>
        <div className="account-details">
          <div>
            <span>Member since</span>
            <strong>{user && dateLabel(user.created_at)}</strong>
          </div>
          <div>
            <span>Workspace</span>
            <strong>Personal</strong>
          </div>
          <div>
            <span>Session</span>
            <strong>
              <ShieldCheck size={15} /> Signed in securely
            </strong>
          </div>
        </div>
        <Button
          variant="outline-dark"
          onClick={async () => {
            try {
              await logout()
            } finally {
              navigate('/')
            }
          }}
        >
          <LogOut size={16} /> Sign out
        </Button>
        <small className="d-block mt-3 text-muted">
          Signing out revokes your account’s current API sessions.
        </small>
      </div>
      <div className="workspace-tip">
        <ShieldCheck size={22} />
        <p>Manage who can access your content by pausing dynamic QR links in your library.</p>
        <Link to="/library">
          My QR codes <ArrowRight size={15} />
        </Link>
      </div>
    </>
  )
}
