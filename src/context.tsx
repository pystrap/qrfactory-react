import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import Toast from 'react-bootstrap/Toast'
import ToastContainer from 'react-bootstrap/ToastContainer'
import { api, getSession, setSession } from './api'
import type { Entitlements } from './billing'
import type { User } from './types'

type AppContext = {
  user: User | null
  entitlements: Entitlements | null
  entitlementError: string
  refreshEntitlements: () => Promise<void>
  notify: (message: string) => void
  logout: () => Promise<void>
}
const Context = createContext<AppContext>(null!)
export const useApp = () => useContext(Context)
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(getSession()?.user || null)
  const [message, setMessage] = useState('')
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null)
  const [entitlementError, setEntitlementError] = useState('')
  const requestVersion = useRef(0)
  const refreshEntitlements = useCallback(async () => {
    const version = ++requestVersion.current
    try {
      const value = await api<Entitlements>('/billing/status')
      if (version === requestVersion.current) {
        setEntitlements(value)
        setEntitlementError('')
      }
    } catch (error) {
      if (version === requestVersion.current) setEntitlementError((error as Error).message)
    }
  }, [])
  useEffect(() => {
    setEntitlements(null)
    void refreshEntitlements()
    const refresh = () => {
      if (document.visibilityState === 'visible') void refreshEntitlements()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const timer = window.setInterval(refresh, 60000)
    return () => {
      ++requestVersion.current
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.clearInterval(timer)
    }
  }, [user?.id, refreshEntitlements])
  useEffect(() => {
    const sync = () => setUser(getSession()?.user || null)
    window.addEventListener('qrfactory-session', sync)
    if (getSession())
      api<User>('/auth/me')
        .then((value) => {
          const current = getSession()
          if (current) setSession({ ...current, user: value })
        })
        .catch(() => {})
    return () => window.removeEventListener('qrfactory-session', sync)
  }, [])
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      setSession(null)
      sessionStorage.removeItem('qrfactory.draft')
      setMessage('You have been signed out on this device.')
    }
  }
  return (
    <Context.Provider
      value={{
        user,
        entitlements,
        entitlementError,
        refreshEntitlements,
        notify: setMessage,
        logout,
      }}
    >
      {children}
      <ToastContainer
        position="bottom-center"
        className="p-3 position-fixed"
        style={{ zIndex: 2000 }}
      >
        <Toast show={!!message} onClose={() => setMessage('')} delay={4500} autohide>
          <Toast.Body role="status">
            {message}
            <button
              className="btn-close float-end"
              aria-label="Close notification"
              onClick={() => setMessage('')}
            />
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Context.Provider>
  )
}
