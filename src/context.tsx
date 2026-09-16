import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Toast from 'react-bootstrap/Toast'
import ToastContainer from 'react-bootstrap/ToastContainer'
import { api, getSession, setSession } from './api'
import type { User } from './types'

type AppContext = {
  user: User | null
  notify: (message: string) => void
  logout: () => Promise<void>
}
const Context = createContext<AppContext>(null!)
export const useApp = () => useContext(Context)
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(getSession()?.user || null)
  const [message, setMessage] = useState('')
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
    <Context.Provider value={{ user, notify: setMessage, logout }}>
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
