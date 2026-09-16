import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, FolderOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import { api, patch, post } from '../api'
import { useApp } from '../context'
import {
  ConfirmDelete,
  EmptyState,
  ErrorNotice,
  Loading,
  PageHeading,
  Pagination,
} from '../components'
import type { Page, Project } from '../types'

export default function Projects() {
  const { notify } = useApp()
  const [data, setData] = useState<Page<Project> | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Project | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    setLoading(true)
    const timer = setTimeout(
      () =>
        api<Page<Project>>(`/projects?q=${encodeURIComponent(query)}&page=${page}&page_size=12`)
          .then((value) => {
            if (live) {
              setData(value)
              setError('')
            }
          })
          .catch((e) => live && setError(e.message))
          .finally(() => live && setLoading(false)),
      200,
    )
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [query, page, reload])
  function edit(project: Project | 'new') {
    setEditing(project)
    setName(project === 'new' ? '' : project.name)
    setDescription(project === 'new' ? '' : project.description || '')
    setError('')
  }
  return (
    <>
      <PageHeading
        eyebrow="EVERYTHING IN ITS PLACE"
        title="Your projects"
        description="From a little side project to your next big launch."
        action={
          <Button onClick={() => edit('new')}>
            <Plus size={17} /> New project
          </Button>
        }
      />
      <div className="library-toolbar">
        <div className="search-field">
          <Search size={17} />
          <Form.Control
            aria-label="Search projects"
            placeholder="Find a project…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>
      <ErrorNotice error={error} />
      {loading ? (
        <Loading />
      ) : data?.items.length ? (
        <div className="project-grid">
          {data.items.map((project, index) => (
            <article className="project-card" key={project.id}>
              <div className="d-flex justify-content-between">
                <span
                  className={`project-icon ${['lavender', 'mint', 'peach', 'butter'][index % 4]}`}
                >
                  <FolderOpen size={27} />
                </span>
                <div>
                  <button
                    className="icon-button"
                    aria-label={`Edit ${project.name}`}
                    onClick={() => edit(project)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button danger-hover"
                    aria-label={`Delete ${project.name}`}
                    onClick={() => setDeleting(project)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3>{project.name}</h3>
              <p>{project.description || 'A little space for your next big idea.'}</p>
              <Link to={`/library?project=${project.id}`}>
                <span>
                  {project.qr_count} QR code{project.qr_count === 1 ? '' : 's'}
                </span>{' '}
                Open project <ArrowUpRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        !error && (
          <EmptyState
            title={query ? 'No projects found.' : 'Make a little room for your ideas.'}
            description="Keep related QR codes together in a project. Campaigns, clients, and collections welcome."
            action={
              <Button onClick={() => edit('new')}>
                <Plus size={17} /> Create a project
              </Button>
            }
          />
        )
      )}
      {data && <Pagination page={page} total={data.total} onChange={setPage} />}
      {editing && (
        <Modal show onHide={() => !busy && setEditing(null)} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              {editing === 'new' ? 'Something good starts here.' : 'A little project refresh.'}
            </Modal.Title>
          </Modal.Header>
          <Form
            onSubmit={async (event) => {
              event.preventDefault()
              setBusy(true)
              try {
                if (editing === 'new') await post('/projects', { name, description })
                else await patch(`/projects/${editing.id}`, { name, description })
                setEditing(null)
                setPage(1)
                setReload((n) => n + 1)
                notify('Project saved.')
              } catch (e) {
                setError((e as Error).message)
              } finally {
                setBusy(false)
              }
            }}
          >
            <Modal.Body>
              <Form.Group controlId="project-name" className="mb-3">
                <Form.Label>Project name</Form.Label>
                <Form.Control
                  placeholder="The next big launch"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={255}
                />
              </Form.Group>
              <Form.Group controlId="project-description">
                <Form.Label>
                  Description <span className="optional">optional</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  placeholder="What's the idea?"
                />
              </Form.Group>
              <ErrorNotice error={error} />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="light" disabled={busy} onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save project'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      )}
      {deleting && (
        <ConfirmDelete
          title="Delete this project?"
          description={`“${deleting.name}” will be removed. Its QR codes will stay in your library without a project.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api(`/projects/${deleting.id}`, { method: 'DELETE' })
            setPage(1)
            setReload((n) => n + 1)
            notify('Project deleted. Your QR codes are still in your library.')
          }}
        />
      )}
    </>
  )
}
