import { useState } from 'react'
import { Link } from 'react-router-dom'
import Form from 'react-bootstrap/Form'
import {
  ChevronDown,
  Heart,
  ImagePlus,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  Palette,
  Phone,
  QrCode,
  Sparkles,
  Star,
  Type,
  UserRound,
  Wifi,
  FileText,
} from 'lucide-react'
import { api } from './api'
import { useApp } from './context'
import { ErrorNotice } from './components'

export type QRDesign = {
  logo: string
  logo_data?: string
  caption: string
  caption_size?: string
  caption_style?: string
  caption_align?: string
}
export type DesignOptions = {
  fill_color: string
  back_color: string
  box_size: number
  border: number
  error_correction: string
  design?: QRDesign
}
export const defaultOptions: DesignOptions = {
  fill_color: '#1b2235',
  back_color: '#ffffff',
  box_size: 10,
  border: 4,
  error_correction: 'M',
  design: {
    logo: 'none',
    caption: '',
    caption_size: 'medium',
    caption_style: 'bold',
    caption_align: 'center',
  },
}
const icons = [
  { value: 'link', label: 'Link', icon: Link2 },
  { value: 'wifi', label: 'Wi-Fi', icon: Wifi },
  { value: 'contact', label: 'Contact', icon: UserRound },
  { value: 'mail', label: 'Email', icon: Mail },
  { value: 'message', label: 'Message', icon: MessageSquare },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'location', label: 'Location', icon: MapPin },
  { value: 'file', label: 'Document', icon: FileText },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'heart', label: 'Heart', icon: Heart },
]
const autoIcons: Record<string, string> = {
  url: 'link',
  wifi: 'wifi',
  vcard: 'contact',
  email: 'mail',
  sms: 'message',
  phone: 'phone',
  geo: 'location',
  media: 'file',
}
export default function DesignControls({
  value,
  onChange,
  payloadType = 'url',
  onContinue,
  onBusyChange,
}: {
  value: DesignOptions
  onChange: (value: Partial<DesignOptions>) => void
  payloadType?: string
  onContinue?: () => void
  onBusyChange?: (busy: boolean) => void
}) {
  const { entitlements, user } = useApp()
  const pro = entitlements?.tier === 'pro'
  const design = { ...defaultOptions.design!, ...value.design }
  const update = (change: Partial<QRDesign>) => onChange({ design: { ...design, ...change } })
  const [error, setError] = useState('')
  const [captionEnabled, setCaptionEnabled] = useState(!!value.design?.caption)
  const [uploading, setUploading] = useState(false)
  const AutoIcon = icons.find((i) => i.value === (autoIcons[payloadType] || 'message'))!.icon
  const upgrade = (
    <Link
      className="design-upgrade"
      to={user ? '/pricing' : '/register?next=%2Fpricing'}
      onClick={onContinue}
    >
      Unlock with Pro <Sparkles size={14} />
    </Link>
  )
  return (
    <section className="design-section" aria-label="Design your QR Code">
      <div className="design-heading">
        <div>
          <span className="eyebrow">MAKE IT YOURS · OPTIONAL</span>
          <h2>
            <Palette size={21} /> Design your QR Code
          </h2>
        </div>
        <span className="design-tag">A little you.</span>
      </div>
      <p className="form-description">
        Keep it classic or add your own touch. Generate again to apply your changes.
      </p>
      <div className="color-presets design-presets">
        <span>Pick a look</span>
        {[
          { name: 'Original', ink: '#1b2235', paper: '#ffffff' },
          { name: 'Violet', ink: '#5636bc', paper: '#faf7ff' },
          { name: 'Forest', ink: '#155b43', paper: '#f1fcf5' },
          { name: 'Terracotta', ink: '#813a2c', paper: '#fff8f1' },
        ].map((style) => (
          <button
            type="button"
            key={style.name}
            aria-label={`${style.name} style`}
            aria-pressed={value.fill_color === style.ink && value.back_color === style.paper}
            className={value.fill_color === style.ink ? 'active' : ''}
            style={{ background: style.paper, color: style.ink }}
            onClick={() => onChange({ fill_color: style.ink, back_color: style.paper })}
          >
            <QrCode size={24} />
            <small>{style.name}</small>
          </button>
        ))}
      </div>
      <details className="design-advanced">
        <summary>
          Custom colors & resolution <ChevronDown size={16} />
        </summary>
        <div className="design-grid">
          <Form.Group controlId="foreground">
            <Form.Label>Code color</Form.Label>
            <Form.Control
              type="color"
              value={value.fill_color}
              onChange={(e) => onChange({ fill_color: e.target.value })}
            />
          </Form.Group>
          <Form.Group controlId="background">
            <Form.Label>Background</Form.Label>
            <Form.Control
              type="color"
              value={value.back_color}
              onChange={(e) => onChange({ back_color: e.target.value })}
            />
          </Form.Group>
          <Form.Group controlId="qr-size">
            <Form.Label>Resolution</Form.Label>
            <Form.Select
              value={value.box_size}
              onChange={(e) => onChange({ box_size: Number(e.target.value) })}
            >
              <option value={10}>Standard</option>
              <option value={20}>High resolution</option>
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="qr-correction">
            <Form.Label>Error correction</Form.Label>
            <Form.Select
              value={design.logo !== 'none' || design.caption ? 'H' : value.error_correction}
              disabled={design.logo !== 'none' || !!design.caption}
              onChange={(e) => onChange({ error_correction: e.target.value })}
            >
              <option value="M">Balanced</option>
              <option value="Q">Extra resilient</option>
              <option value="H">Most resilient</option>
            </Form.Select>
          </Form.Group>
        </div>
        <small>
          Keep strong contrast. Logo and text designs automatically use the most resilient setting.
        </small>
      </details>
      <div className="pro-design-card">
        <div className="pro-design-intro">
          <span className="design-icon">
            <ImagePlus size={24} />
          </span>
          <div>
            <h3>
              Center logo <span className="pro-label">Pro</span>
            </h3>
            <p>A familiar icon. Your brand. A little recognition.</p>
          </div>
          {pro && (
            <Form.Check
              type="switch"
              id="logo-enabled"
              aria-label="Enable center logo"
              checked={design.logo !== 'none'}
              onChange={(e) => update({ logo: e.target.checked ? 'auto' : 'none', logo_data: '' })}
            />
          )}
        </div>
        {pro && design.logo !== 'none' ? (
          <div className="pro-design-controls">
            <div className="logo-choices" role="group" aria-label="Center logo icons">
              <button
                type="button"
                className={design.logo === 'auto' ? 'selected auto-icon' : 'auto-icon'}
                aria-pressed={design.logo === 'auto'}
                onClick={() => update({ logo: 'auto', logo_data: '' })}
              >
                <AutoIcon size={22} />
                <span>Match QR type</span>
              </button>
              {icons.map(({ value: icon, label, icon: Icon }) => (
                <button
                  type="button"
                  key={icon}
                  className={design.logo === icon ? 'selected' : ''}
                  aria-label={`${label} center icon`}
                  aria-pressed={design.logo === icon}
                  onClick={() => update({ logo: icon, logo_data: '' })}
                >
                  <Icon size={21} />
                </button>
              ))}
            </div>
            <label className="logo-upload">
              {design.logo === 'upload' && design.logo_data ? (
                <img src={design.logo_data} alt="Selected center logo" />
              ) : (
                <ImagePlus size={22} />
              )}
              <span>
                <strong>{uploading ? 'Preparing your logo…' : 'Upload your own logo'}</strong>
                <small>PNG, JPG or WebP · up to 2 MB / 4 megapixels</small>
              </span>
              <input
                type="file"
                aria-label="Upload center logo"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setError('')
                  setUploading(true)
                  onBusyChange?.(true)
                  try {
                    if (file.size > 2 * 1024 * 1024) throw new Error('Choose a logo under 2 MB.')
                    const form = new FormData()
                    form.append('file', file)
                    const data = await api<{ logo_data: string }>('/qr-design/logo', {
                      method: 'POST',
                      body: form,
                    })
                    update({ logo: 'upload', logo_data: data.logo_data })
                  } catch (e) {
                    setError((e as Error).message)
                  } finally {
                    setUploading(false)
                    onBusyChange?.(false)
                    e.target.value = ''
                  }
                }}
              />
            </label>
            <small>We size your logo safely and check that the finished QR can be scanned.</small>
          </div>
        ) : !pro ? (
          <div className="pro-design-teaser">
            <div className="teaser-icons" aria-hidden="true">
              <Wifi size={22} />
              <Heart size={22} />
              <ImagePlus size={22} />
            </div>
            <span>Built-in icons + your own image</span>
            {upgrade}
          </div>
        ) : null}
      </div>
      <div className="pro-design-card">
        <div className="pro-design-intro">
          <span className="design-icon">
            <Type size={24} />
          </span>
          <div>
            <h3>
              Bottom text <span className="pro-label">Pro</span>
            </h3>
            <p>Give every scan a little direction.</p>
          </div>
          {pro && (
            <Form.Check
              type="switch"
              id="caption-enabled"
              aria-label="Enable bottom text"
              checked={captionEnabled}
              onChange={(e) => {
                setCaptionEnabled(e.target.checked)
                update({ caption: e.target.checked ? 'Scan me' : '' })
              }}
            />
          )}
        </div>
        {pro && captionEnabled ? (
          <div className="pro-design-controls">
            <Form.Group controlId="qr-caption">
              <Form.Label>
                What should it say? <span className="optional">{design.caption.length}/60</span>
              </Form.Label>
              <Form.Control
                value={design.caption}
                maxLength={60}
                placeholder="Scan me"
                onChange={(e) => update({ caption: e.target.value })}
              />
            </Form.Group>
            <div className="caption-controls">
              <Form.Group controlId="caption-size">
                <Form.Label>Size</Form.Label>
                <Form.Select
                  value={design.caption_size}
                  onChange={(e) => update({ caption_size: e.target.value })}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </Form.Select>
              </Form.Group>
              <Form.Group controlId="caption-style">
                <Form.Label>Style</Form.Label>
                <Form.Select
                  value={design.caption_style}
                  onChange={(e) => update({ caption_style: e.target.value })}
                >
                  <option value="regular">Regular</option>
                  <option value="bold">Bold</option>
                </Form.Select>
              </Form.Group>
              <Form.Group controlId="caption-align">
                <Form.Label>Alignment</Form.Label>
                <Form.Select
                  value={design.caption_align}
                  onChange={(e) => update({ caption_align: e.target.value })}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </Form.Select>
              </Form.Group>
            </div>
            <div
              className="caption-example"
              style={{
                color: value.fill_color,
                background: value.back_color,
                textAlign: design.caption_align as 'left' | 'center' | 'right',
                fontWeight: design.caption_style === 'bold' ? 700 : 400,
                fontSize:
                  design.caption_size === 'small' ? 14 : design.caption_size === 'large' ? 22 : 18,
              }}
            >
              {design.caption}
            </div>
            <small>
              Added below the QR with space for easy scanning. Long text scales down to fit.
            </small>
          </div>
        ) : !pro ? (
          <div className="pro-design-teaser">
            <span className="caption-teaser">Scan for something good.</span>
            {upgrade}
          </div>
        ) : null}
      </div>
      {entitlements && !pro && (design.logo !== 'none' || design.caption) && (
        <div className="billing-notice">
          <p>This draft includes Pro styling. Upgrade to keep it, or continue with your colors.</p>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              onChange({ design: { ...defaultOptions.design! } })
              setCaptionEnabled(false)
            }}
          >
            Use free design
          </button>
        </div>
      )}
      <ErrorNotice error={error} />
    </section>
  )
}
