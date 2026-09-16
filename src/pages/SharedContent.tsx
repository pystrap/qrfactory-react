import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowDownToLine, ArrowUpRight, FileText, LockKeyhole } from 'lucide-react'
import { api } from '../api'
import { bytes, Loading } from '../components'

type Shared = {
  title: string
  destination_url: string | null
  file: { name: string; size: number; content_type: string; url: string } | null
}
export default function SharedContent() {
  const { id } = useParams()
  const [content, setContent] = useState<Shared | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    setContent(null)
    setError('')
    api<Shared>(`/public-links/${id}`)
      .then((data) => live && setContent(data))
      .catch((e) => live && setError(e.message))
    return () => {
      live = false
    }
  }, [id])
  return (
    <main id="main-content" className="shared-page container-xl">
      {error ? (
        <div className="shared-card">
          <div className="empty-icon">
            <LockKeyhole size={30} />
          </div>
          <h1>This connection is unavailable.</h1>
          <p role="alert">{error}</p>
          <Link className="btn btn-primary" to="/">
            Create your own QR code
          </Link>
        </div>
      ) : !content ? (
        <Loading />
      ) : (
        <div className="shared-card">
          <span className="pill">A LITTLE SOMETHING, SHARED WITH YOU</span>
          <h1>{content.title}</h1>
          {content.file ? (
            <>
              <div className="shared-preview">
                {content.file.content_type.startsWith('image/') ? (
                  <img src={content.file.url} alt={content.title} />
                ) : content.file.content_type.startsWith('video/') ? (
                  <video controls preload="metadata" src={content.file.url}>
                    Your browser cannot play this video. Download it below.
                  </video>
                ) : content.file.content_type.startsWith('audio/') ? (
                  <audio controls preload="metadata" src={content.file.url}>
                    Download the audio below.
                  </audio>
                ) : (
                  <FileText size={80} strokeWidth={1.2} />
                )}
              </div>
              <p>
                {content.file.name} <span className="text-muted">· {bytes(content.file.size)}</span>
              </p>
              <a className="btn btn-primary" href={`${content.file.url}?download=1`}>
                <ArrowDownToLine size={18} /> Download file
              </a>
              <small className="shared-disclosure">
                Shared by a QRFactory user. Only open files from people you trust.
              </small>
            </>
          ) : (
            <>
              <p>A new connection is one click away.</p>
              <a className="btn btn-primary" href={content.destination_url || '/'} rel="noreferrer">
                Open website <ArrowUpRight size={18} />
              </a>
            </>
          )}
          <div className="shared-footer">
            Make your own little connection. <Link to="/">Try QRFactory →</Link>
          </div>
        </div>
      )}
    </main>
  )
}
