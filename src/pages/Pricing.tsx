import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, CreditCard, Sparkles } from 'lucide-react'
import Button from 'react-bootstrap/Button'
import { api, post } from '../api'
import { useApp } from '../context'
import { ErrorNotice, Loading } from '../components'
import { UsageBanner } from '../billing'

type Plan = {
  id: number
  name: string
  interval: 'week' | 'month' | 'year'
  amount: number
  currency: string
}
type Catalog = { plans: Plan[]; checkout_available: boolean }
export default function Pricing() {
  const { user, entitlements, refreshEntitlements } = useApp()
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<number | string | null>(null)
  const [pending, setPending] = useState(false)
  const [search] = useSearchParams()
  const sessionId = search.get('session_id')
  const checkoutResult = search.get('checkout')
  useEffect(() => {
    let active = true
    api<Catalog>('/billing/plans')
      .then((value) => active && setCatalog(value))
      .catch((e) => active && setError(e.message))
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    if (!user || checkoutResult !== 'success' || !sessionId) return
    let active = true
    let timer: ReturnType<typeof setTimeout>
    let tries = 0
    setPending(true)
    const confirm = async () => {
      try {
        const status = await post<{ tier: string }>('/billing/confirm', { session_id: sessionId })
        if (!active) return
        await refreshEntitlements()
        if (status.tier === 'pro') {
          setPending(false)
          return
        }
        if (++tries < 8) timer = setTimeout(confirm, 2500)
        else {
          setPending(false)
          setError(
            'Your payment is still processing. Your plan will update automatically when confirmed. Please do not purchase again.',
          )
        }
      } catch (e) {
        if (active) {
          setPending(false)
          setError((e as Error).message)
        }
      }
    }
    void confirm()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [user?.id, sessionId, checkoutResult, refreshEntitlements])
  async function start(plan: Plan) {
    setBusy(plan.id)
    setError('')
    try {
      const value = await post<{ url: string }>('/billing/checkout', { plan_id: plan.id })
      window.location.assign(value.url)
    } catch (e) {
      setError((e as Error).message)
      setBusy(null)
    }
  }
  async function manage() {
    setBusy('portal')
    setError('')
    try {
      const value = await post<{ url: string }>('/billing/portal', {})
      window.location.assign(value.url)
    } catch (e) {
      setError((e as Error).message)
      setBusy(null)
    }
  }
  const pro = entitlements?.tier === 'pro'
  return (
    <main id="main-content" className="container-xl pricing-page">
      <div className="pricing-heading">
        <span className="pill-label">
          <Sparkles size={16} /> QRFACTORY PRO
        </span>
        <h1>
          More ideas.
          <br />
          <span>Zero generation limits.</span>
        </h1>
        <p>
          From your first connection to your next big launch. Find a little space for everything you
          want to share.
        </p>
      </div>
      <UsageBanner />
      <ErrorNotice error={error} />
      {pending && (
        <div className="billing-notice" role="status">
          Confirming your subscription securely… This can take a moment.
        </div>
      )}
      {checkoutResult === 'canceled' && (
        <div className="billing-notice" role="status">
          Checkout closed. You can keep creating on your current plan.
        </div>
      )}
      {pro && (
        <div className="pro-welcome" role="status">
          <Sparkles size={30} />
          <div>
            <h2>You’re in. Make something great.</h2>
            <p>Every type is unlocked, including files. Your next QR is waiting.</p>
          </div>
          <Link className="btn btn-dark" to="/create">
            Open the studio <ArrowRight size={16} />
          </Link>
        </div>
      )}
      <div className="pricing-grid">
        <article className="plan-card free-plan">
          <span className="eyebrow">A GOOD PLACE TO START</span>
          <h2>Free</h2>
          <div className="plan-price">
            £0<small>with an account</small>
          </div>
          <p>For everyday connections.</p>
          <ul>
            <li>
              <Check /> Unlimited website QR codes
            </li>
            <li>
              <Check /> 10 other QR generations per day, combined
            </li>
            <li>
              <Check /> Text, Wi-Fi, contact, email, SMS, phone & location
            </li>
            <li>
              <Check /> PNG & SVG downloads
            </li>
            <li>
              <Check /> Your saved QR workspace
            </li>
          </ul>
          <p className="plan-note">
            File uploads and file QR codes are available with Pro. Daily allowance resets at
            midnight UTC.
          </p>
          <Link className="btn btn-outline-dark" to={user ? '/create' : '/register'}>
            {user ? 'Keep creating' : 'Create free account'} <ArrowRight size={16} />
          </Link>
        </article>
        <article className="plan-card pro-plan">
          <div className="pro-label">
            <Sparkles size={17} /> ALL THE POSSIBILITIES
          </div>
          <h2>Pro</h2>
          <p>One subscription. Every kind of connection.</p>
          <ul>
            <li>
              <Check /> Unlimited QR generations across all types
            </li>
            <li>
              <Check /> File uploads & media QR codes
            </li>
            <li>
              <Check /> Center icons & custom logo uploads
            </li>
            <li>
              <Check /> Bottom text in your colors & style
            </li>
            <li>
              <Check /> Batch QR codes from CSV & Excel
            </li>
          </ul>
          <p className="plan-note">
            Unlimited QR generations, with PNG & SVG downloads. File size, storage and batch job
            limits still apply.
          </p>
          {!catalog && !error && <Loading />}
          {catalog && (!catalog.checkout_available || catalog.plans.length === 0) && (
            <div className="billing-notice">
              Pro subscriptions are coming soon. You can start creating with a free account today.
            </div>
          )}
          <div className="plan-options">
            {catalog?.plans.map((plan) => (
              <div
                className={`plan-option ${plan.interval === 'year' ? 'annual' : ''}`}
                key={plan.id}
              >
                <div>
                  <strong>{plan.name}</strong>
                  <span>
                    {new Intl.NumberFormat(undefined, {
                      style: 'currency',
                      currency: plan.currency,
                    }).format(plan.amount / 100)}{' '}
                    / {plan.interval}
                  </span>
                </div>
                {user ? (
                  <Button
                    variant="dark"
                    disabled={
                      !!busy || pending || pro || !catalog.checkout_available || !entitlements
                    }
                    onClick={() => void start(plan)}
                  >
                    {busy === plan.id ? 'Opening checkout…' : pro ? 'Pro active' : 'Choose plan'}{' '}
                    <ArrowRight size={15} />
                  </Button>
                ) : (
                  <Link className="btn btn-dark" to="/register?next=%2Fpricing">
                    Get started <ArrowRight size={15} />
                  </Link>
                )}
              </div>
            ))}
          </div>
          <small className="renewal-note">
            Billed every week, month or year according to your choice. Renews automatically until
            canceled. Cancel future renewals through billing management; access continues until the
            paid period ends. Applicable taxes are shown at checkout.
          </small>
        </article>
      </div>
      {user && (
        <section className="billing-management">
          <div>
            <CreditCard size={25} />
            <h2>Your subscription</h2>
          </div>
          {entitlements?.subscriptions?.length ? (
            entitlements.subscriptions.map((s, i) => (
              <p key={i}>
                {s.provider === 'stripe'
                  ? 'Web subscription'
                  : s.provider === 'apple'
                    ? 'Apple App Store'
                    : 'Google Play'}{' '}
                · {s.status} · {s.cancel_at_period_end ? 'Access ends' : 'Current period ends'}{' '}
                {new Date(s.expires_at).toLocaleDateString()}
              </p>
            ))
          ) : (
            <p>You’re on the free plan. Upgrade whenever you’re ready.</p>
          )}
          {entitlements?.can_manage_stripe && (
            <Button variant="outline-dark" disabled={!!busy} onClick={() => void manage()}>
              Manage web billing <ArrowRight size={16} />
            </Button>
          )}
          {entitlements?.subscriptions?.some((s) => s.provider !== 'stripe') && (
            <p>
              Manage your mobile subscription in the Apple App Store or Google Play account used to
              purchase it.
            </p>
          )}
        </section>
      )}
      <div className="pricing-faq">
        <h2>A few things worth knowing.</h2>
        <p>
          <strong>Just trying things out?</strong> Make 20 website, text or Wi-Fi QR codes on this
          browser before signing up.
        </p>
        <p>
          <strong>Already printed your QR?</strong> Your existing codes keep working if your
          subscription ends. New uploads, replacements and file QR generations require Pro.
        </p>
        <p>
          <strong>What counts?</strong> Each successful generation or duplicate counts once.
          Downloading the same QR as PNG or SVG is included.
        </p>
      </div>
    </main>
  )
}
