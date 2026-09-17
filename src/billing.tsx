import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useApp } from './context'

export type Entitlements = {
  tier: 'guest' | 'free' | 'pro'
  remaining: number | null
  limit: number | null
  resets_at: string | null
  can_manage_stripe?: boolean
  subscriptions?: {
    provider: string
    status: string
    expires_at: string
    cancel_at_period_end: boolean
  }[]
}
export function UpgradeCard({ reason, onContinue }: { reason?: string; onContinue?: () => void }) {
  const { user, entitlements } = useApp()
  const guest = !user
  return (
    <div className="upgrade-card">
      <span className="upgrade-icon">
        <Sparkles size={24} />
      </span>
      <div>
        <span className="eyebrow">{guest ? 'MORE IDEAS START HERE' : 'MAKE ROOM FOR MORE'}</span>
        <h3>
          {reason ||
            (guest
              ? 'Your next connection deserves a home.'
              : 'Small square. Unlimited possibilities.')}
        </h3>
        <p>
          {guest
            ? 'Create a free account for unlimited website QR codes and 10 daily generations across text, Wi-Fi, contact, email, SMS, phone and location. File sharing is available with Pro.'
            : 'Go Pro for unlimited generations across every QR type, plus uploads for documents, photos, video and audio.'}
        </p>
        <Link className="btn btn-dark" to={guest ? '/register' : '/pricing'} onClick={onContinue}>
          {guest ? 'Create free account' : 'Explore Pro'} <ArrowRight size={16} />
        </Link>
        {guest && (
          <Link className="upgrade-secondary" to="/login" onClick={onContinue}>
            Already a member? Log in
          </Link>
        )}
        {!guest && entitlements?.resets_at && (
          <small>Free allowance resets at midnight UTC. Website QR codes stay unlimited.</small>
        )}
      </div>
    </div>
  )
}
export function UsageBanner({ onContinue }: { onContinue?: () => void }) {
  const { user, entitlements, entitlementError, refreshEntitlements } = useApp()
  if (!entitlements)
    return (
      <div className="usage-banner" role="status">
        {entitlementError || 'Checking your QR allowance…'}
        {entitlementError && (
          <button className="text-button" onClick={() => void refreshEntitlements()}>
            Try again
          </button>
        )}
      </div>
    )
  return (
    <div className={`usage-banner ${entitlements.tier === 'pro' ? 'is-pro' : ''}`}>
      <span>
        <Sparkles size={16} />{' '}
        <strong>
          {entitlements.tier === 'pro'
            ? 'QRFactory Pro'
            : user
              ? 'Your free workspace'
              : 'Try a little possibility'}
        </strong>
      </span>
      <span aria-live="polite">
        {entitlements.tier === 'pro'
          ? 'Every QR type. Unlimited generations.'
          : user
            ? `${entitlements.remaining} of 10 daily generations left · Websites unlimited`
            : `${entitlements.remaining} of 20 device generations left`}
      </span>
      {entitlements.tier !== 'pro' && (
        <Link to={user ? '/pricing' : '/register'} onClick={onContinue}>
          {user ? 'Go unlimited' : 'Unlock more for free'} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  )
}
