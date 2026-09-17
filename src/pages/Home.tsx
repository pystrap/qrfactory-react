import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  Image,
  Link2,
  MousePointer2,
  ScanLine,
  Sparkles,
  Video,
  Wifi,
} from 'lucide-react'
import Accordion from 'react-bootstrap/Accordion'
import Generator from './Generator'

export default function Home() {
  return (
    <main id="main-content">
      <section className="hero container-xl">
        <div className="hero-decoration deco-left">✳</div>
        <span className="pill">
          <span className="live-dot" /> SMALL CODE. BIG POSSIBILITIES.
        </span>
        <h1>
          Make something
          <br />
          worth{' '}
          <span className="scanning-word">
            scanning.
            <svg viewBox="0 0 380 20" aria-hidden="true">
              <path d="M5 13Q150-2 370 11M25 19Q195 6 355 17" />
            </svg>
          </span>
        </h1>
        <p>
          A link, a moment, your next big idea. Turn it into a beautiful QR code.
          <br className="d-none d-md-block" /> Create in seconds. Share with everyone.
        </p>
        <div className="hero-meta">
          <span>
            <Check size={14} /> Free to generate
          </span>
          <i />
          <span>
            <Check size={14} /> No sign-up needed
          </span>
          <i />
          <span>
            <Check size={14} /> Yours to customize
          </span>
        </div>
        <div className="hero-decoration deco-right">
          <MousePointer2 size={22} />
          <span>you, making connections</span>
        </div>
      </section>
      <div className="container-xl generator-anchor">
        <Generator compact />
      </div>
      <section className="possibilities container-xl" id="possibilities">
        <div className="section-heading">
          <div>
            <span className="eyebrow">BEYOND THE EVERYDAY LINK</span>
            <h2>
              One little code.
              <br />
              So many ways to connect.
            </h2>
          </div>
          <p>
            From the café Wi-Fi to your creative portfolio,
            <br />
            there’s a QR for that.
          </p>
        </div>
        <div className="possibility-grid">
          {[
            {
              icon: Link2,
              title: 'Open a new door.',
              text: 'Your site, your shop, your next launch. One scan takes them there.',
              type: 'url',
              className: 'lavender',
              label: 'WEBSITES & LINKS',
              visual: 'your-next-big-thing.com',
            },
            {
              icon: FileText,
              title: 'Let your files travel.',
              text: 'Menus, lookbooks, and documents. Leave the attachments behind.',
              type: 'media',
              className: 'peach',
              label: 'DOCUMENTS & FILES',
              visual: 'the-good-stuff.pdf',
            },
            {
              icon: Image,
              title: 'Show. Don’t just tell.',
              text: 'Photos, films, and sounds. Make the moment a little more memorable.',
              type: 'media',
              className: 'mint',
              label: 'IMAGES, VIDEO & AUDIO',
              visual: 'a moment worth sharing',
            },
            {
              icon: Wifi,
              title: 'Make yourself at home.',
              text: 'Skip spelling out the password. Get everyone connected in a scan.',
              type: 'wifi',
              className: 'butter',
              label: 'WI-FI & MORE',
              visual: 'Good company. Great Wi-Fi.',
            },
          ].map(({ icon: Icon, title, text, type, className, label, visual }) => (
            <Link
              to={`/create?type=${type}`}
              className={`possibility-card ${className}`}
              key={title}
            >
              <div className="possibility-art">
                <div className="mini-content">
                  <Icon size={32} strokeWidth={1.6} />
                  <span>{visual}</span>
                </div>
                <span className="mini-scan">
                  <ScanLine size={28} />
                </span>
              </div>
              <span className="eyebrow">{label}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <span className="card-arrow">
                <ArrowUpRight size={21} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="how-section container-xl">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FROM IDEA TO OUT THERE</span>
            <h2>Three steps. Zero overthinking.</h2>
          </div>
          <span className="hand-note">Yes, it really is that easy. ↙</span>
        </div>
        <div className="steps-grid">
          {[
            {
              n: '01',
              title: 'Drop in your content.',
              text: 'Paste a link, add your details, or upload something worth sharing.',
            },
            {
              n: '02',
              title: 'Add a little you.',
              text: 'Choose your colors. Give it a name. Make it fit the way you do things.',
            },
            {
              n: '03',
              title: 'Send it into the world.',
              text: 'Download a crisp PNG or a print-ready SVG. Your next connection awaits.',
            },
          ].map((step) => (
            <div key={step.n}>
              <span className="step-number">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="workspace-cta container-xl">
        <div>
          <span className="pill">
            <Sparkles size={14} /> ROOM FOR YOUR NEXT BIG THING
          </span>
          <h2>
            Great connections
            <br />
            deserve a home.
          </h2>
          <p>Your QR codes, files, and projects. Together in one beautifully simple workspace.</p>
          <Link className="btn btn-lime" to="/register">
            Create your free account <ArrowRight size={17} />
          </Link>
          <span className="cta-footnote">Make it. Save it. Make something else.</span>
        </div>
        <div className="workspace-art" aria-hidden="true">
          <div className="art-card back">
            <span className="art-icon">
              <Video size={26} />
            </span>
            <strong>The launch film</strong>
            <small>Ready for its close-up</small>
          </div>
          <div className="art-card front">
            <img src="/logo.svg" width="58" height="58" alt="" />
            <strong>Your next chapter</strong>
            <small>Everything in its right place.</small>
            <span className="art-status">
              <span className="live-dot" /> Connected & ready
            </span>
          </div>
          <span className="art-spark">✳</span>
        </div>
      </section>
      <section className="faq-section container-xl">
        <div>
          <span className="eyebrow">A FEW GOOD QUESTIONS</span>
          <h2>
            Curious?
            <br />
            We like that.
          </h2>
          <p>A little clarity before you create.</p>
        </div>
        <Accordion flush>
          {[
            [
              'Do I need an account to create a QR code?',
              'Try 20 website, text or Wi-Fi QR generations on this device. A free account unlocks unlimited websites and 10 daily generations across other types. File uploads and file QR codes require Pro.',
            ],
            [
              'What’s the difference between static and dynamic?',
              'A static QR contains your content directly and keeps working without QRFactory. A dynamic QR points through a QRFactory link, so you can change its website destination, pause it, set an expiry, and see scan counts. Dynamic codes need QRFactory to remain online.',
            ],
            [
              'Can I change a file after printing my QR?',
              'Yes. With Pro, replace the file in your file library and every QR linked to it will serve the new version. Your printed QR stays the same. Anyone with its link can access the file while the code is active.',
            ],
            [
              'Which download format should I choose?',
              'PNG is great for screens, social posts, and everyday sharing. SVG stays sharp at any size, making it ideal for print. Always scan-test your final design before printing a batch.',
            ],
            [
              'What does a scan count measure?',
              'It counts requests to a dynamic QR’s public link, including repeat visits and automated link previews. It is an approximate measure of activity, not a count of unique people. We do not store scanner IP addresses.',
            ],
          ].map(([question, answer], index) => (
            <Accordion.Item eventKey={String(index)} key={question}>
              <Accordion.Header>{question}</Accordion.Header>
              <Accordion.Body>{answer}</Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      </section>
    </main>
  )
}
