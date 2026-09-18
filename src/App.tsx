import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { Header, Footer, SignInPrompt, Workspace } from './components'
import { useApp } from './context'
import Home from './pages/Home'
import Pricing from './pages/Pricing'
import Batch from './pages/Batch'
import HowItWorks from './pages/HowItWorks'
import Generator from './pages/Generator'
import Auth from './pages/Auth'
import Library from './pages/Library'
import Files from './pages/Files'
import Projects from './pages/Projects'
import Account from './pages/Account'
import SharedContent from './pages/SharedContent'
import type { ReactNode } from 'react'
import { updateMetadata } from './seo'

function Protected({ children }: { children: ReactNode }) {
  const { user } = useApp()
  return user ? <Workspace>{children}</Workspace> : <SignInPrompt />
}
export default function App() {
  const location = useLocation()
  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
    updateMetadata(location.pathname)
  }, [location.pathname, location.hash])
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/create"
          element={
            <main id="main-content" className="container-xl create-page">
              <div className="page-heading">
                <div>
                  <span className="eyebrow">THE QR STUDIO</span>
                  <h1>What will you connect?</h1>
                  <p>Pick your content. Make it yours. Share it everywhere.</p>
                </div>
              </div>
              <Generator />
            </main>
          }
        />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/batch" element={<Batch />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route
          path="/library"
          element={
            <Protected>
              <Library />
            </Protected>
          }
        />
        <Route
          path="/files"
          element={
            <Protected>
              <Files />
            </Protected>
          }
        />
        <Route
          path="/projects"
          element={
            <Protected>
              <Projects />
            </Protected>
          }
        />
        <Route
          path="/account"
          element={
            <Protected>
              <Account />
            </Protected>
          }
        />
        <Route path="/share/:id" element={<SharedContent />} />
        <Route
          path="*"
          element={
            <main id="main-content" className="empty-state">
              <h1>This page wandered off.</h1>
              <p>Let’s get you back to making connections.</p>
              <Link className="btn btn-primary" to="/">
                Back to home
              </Link>
            </main>
          }
        />
      </Routes>
      {!['/library', '/files', '/projects', '/account'].includes(location.pathname) && <Footer />}
    </>
  )
}
