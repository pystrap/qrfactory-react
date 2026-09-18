import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, Eye, EyeOff, Sparkles } from 'lucide-react'
import Form from 'react-bootstrap/Form'
import Button from 'react-bootstrap/Button'
import { post, setSession } from '../api'
import { useApp } from '../context'
import { ErrorNotice } from '../components'
import type { AuthResult } from '../types'

export default function Auth({ mode }: { mode: 'login' | 'register' }) {
  const { user, notify } = useApp()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const next = ['/pricing', '/batch'].includes(search.get('next') || '') ? search.get('next')! : ''
  const destination = next
    ? next
    : sessionStorage.getItem('qrfactory.draft')
      ? '/create'
      : '/library'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(false)
  const signup = mode === 'register'
  if (user) return <Navigate to={destination} replace />
  return (
    <main className="auth-page container-xl" id="main-content">
      <div className="auth-story">
        <span className="pill">
          <Sparkles size={14} /> YOUR IDEAS, CONNECTED
        </span>
        <h1>
          Small squares.
          <br />
          Endless
          <br />
          <em>possibilities.</em>
        </h1>
        <p>Give your ideas a place to live, and the world a way to find them.</p>
        <ul>
          {[
            'Keep every QR code in one place',
            'Unlock file sharing with Pro',
            'Update links without reprinting',
            'See how your codes are connecting',
          ].map((text) => (
            <li key={text}>
              <Check size={17} />
              {text}
            </li>
          ))}
        </ul>
        <div className="auth-orbit">
          <img src="/logo.svg" alt="QRFactory mark" />
        </div>
      </div>
      <div className="auth-form">
        <span className="eyebrow">
          {signup ? 'MAKE ROOM FOR YOUR IDEAS' : 'GOOD TO SEE YOU AGAIN'}
        </span>
        <h2>{signup ? 'Create your account' : 'Welcome back.'}</h2>
        <p>
          {signup
            ? 'Your next great connection starts here.'
            : 'Your codes, files, and projects are right here.'}
        </p>
        <Form
          key={mode}
          onSubmit={async (event) => {
            event.preventDefault()
            setError('')
            setBusy(true)
            const fields = Object.fromEntries(new FormData(event.currentTarget))
            try {
              const session = await post<AuthResult>(`/auth/${mode}`, fields)
              setSession(session)
              notify(signup ? 'Your workspace is ready. Let’s make something.' : 'Welcome back!')
              navigate(destination, {
                replace: true,
              })
            } catch (e) {
              setError((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          {signup && (
            <Form.Group className="mb-3" controlId="auth-name">
              <Form.Label>Your name</Form.Label>
              <Form.Control
                name="full_name"
                autoComplete="name"
                placeholder="Alex Morgan"
                maxLength={255}
                required
              />
            </Form.Group>
          )}
          <Form.Group className="mb-3" controlId="auth-email">
            <Form.Label>Email address</Form.Label>
            <Form.Control
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </Form.Group>
          <Form.Group className="mb-4" controlId="auth-password">
            <Form.Label>Password</Form.Label>
            <div className="password-field">
              <Form.Control
                name="password"
                type={visible ? 'text' : 'password'}
                minLength={8}
                maxLength={128}
                autoComplete={signup ? 'new-password' : 'current-password'}
                placeholder="At least 8 characters"
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label={visible ? 'Hide password' : 'Show password'}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Form.Group>
          <ErrorNotice error={error} />
          <Button className="w-100" type="submit" disabled={busy}>
            {busy ? 'One moment…' : signup ? 'Create free account' : 'Log in'}{' '}
            {!busy && <ArrowRight size={17} />}
          </Button>
        </Form>
        <p className="auth-switch">
          {signup ? 'Already have an account?' : 'New to QRFactory?'}{' '}
          <Link
            onClick={() => setError('')}
            to={`${signup ? '/login' : '/register'}${next ? `?next=${encodeURIComponent(next)}` : ''}`}
          >
            {signup ? 'Log in' : 'Create an account'}
          </Link>
        </p>
        <p className="auth-note">
          Just need a quick QR? <Link to="/">Generate without signing up.</Link>
        </p>
      </div>
    </main>
  )
}
