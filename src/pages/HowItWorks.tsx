import { Link } from 'react-router-dom'
import { ArrowRight, Check, Layers, Palette, ScanLine } from 'lucide-react'
import { contentTypes } from './Generator'

const uses: Record<string, string> = {
  url: 'Paste a website link. A scan opens it in a browser. Signed-in users can also make a dynamic link and change its destination later.',
  text: 'Add a note, reference, instructions or any short text. The content is stored directly in the QR code.',
  wifi: 'Enter the network name, password and security type. Compatible phones can join without typing the password. Choose Open network if no password is needed.',
  vcard:
    'Enter a first and last name, then optionally add a phone number, email, organization and website. A scan offers a contact card to save.',
  media:
    'Upload a document, image, audio or video file with Pro. Generate a shareable QR, replace the file later, or pause access from your workspace.',
  email:
    'Set the recipient and optionally a subject and message. A scan prepares an email in a compatible mail app; it does not send it automatically.',
  sms: 'Add a phone number and optional message. A scan prepares a text message for the person scanning to send.',
  phone:
    'Enter a phone number including the country code. A scan offers to call it on a compatible phone.',
  geo: 'Enter latitude and longitude, with an optional location label. A scan opens the coordinates in a compatible maps app.',
}
export default function HowItWorks() {
  return (
    <main id="main-content" className="container-xl guide-page">
      <div className="guide-heading">
        <span className="pill">
          <ScanLine size={16} /> THE LITTLE GUIDE TO BIG CONNECTIONS
        </span>
        <h1>
          From idea
          <br />
          to <em>first scan.</em>
        </h1>
        <p>Everything you can make with QRFactory, and how to make it yours.</p>
        <Link className="btn btn-dark" to="/create">
          Make a QR code <ArrowRight size={17} />
        </Link>
      </div>
      <nav className="guide-nav" aria-label="Guide sections">
        <a href="#start">Get started</a>
        <a href="#types">QR types</a>
        <a href="#design">Design</a>
        <a href="#batch">Batch generation</a>
        <a href="#workspace">Your workspace</a>
        <a href="#plans">Plans & limits</a>
      </nav>
      <section id="start" className="guide-section">
        <span className="eyebrow">01 · START SIMPLE</span>
        <h2>Your first QR, in a few moments.</h2>
        <div className="guide-steps">
          {[
            [
              'Choose what to share',
              'The generator starts with URL. Paste your link, or choose another type and fill in the labeled fields.',
            ],
            [
              'Generate your QR',
              'Select Generate QR Code above the design section. Your code appears in the preview. If you’re signed in, it is saved to your workspace automatically.',
            ],
            [
              'Download and share',
              'Choose PNG for everyday use or SVG for layouts and printing. Try a scan with your phone before putting the QR out into the world.',
            ],
          ].map(([title, text], index) => (
            <article key={title}>
              <span className="step-number">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <p>
          Want a different look? Open Design your QR Code, make your changes, and use the smaller
          Generate button below the controls. Each successful generation counts toward your plan’s
          allowance; downloading an existing result does not.
        </p>
      </section>
      <section id="types" className="guide-section">
        <span className="eyebrow">02 · WHAT WILL YOU CONNECT?</span>
        <h2>One tool. Nine ways to share.</h2>
        <div className="guide-type-grid">
          {contentTypes.map(({ value, label, icon: Icon }) => (
            <article key={value}>
              <div>
                <Icon size={23} />
                <h3>{label}</h3>
                {value === 'media' ? (
                  <span className="pro-label">Pro</span>
                ) : !['url', 'text', 'wifi'].includes(value) ? (
                  <span className="guide-badge">Sign in</span>
                ) : null}
              </div>
              <p>{uses[value]}</p>
              <Link to={`/create?type=${value}`}>
                Create {label.toLowerCase()} QR <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
        <p>
          The action offered after a scan depends on the camera or scanning app. Review links and
          destinations before sharing.
        </p>
      </section>
      <section id="design" className="guide-section">
        <span className="eyebrow">03 · MAKE IT YOURS</span>
        <h2>
          <Palette size={26} /> A small square. Your style.
        </h2>
        <div className="guide-columns">
          <article>
            <h3>Colors & quality</h3>
            <p>
              Choose a quick palette or pick your own code and background colors. Keep the code dark
              and the background light. High resolution gives you a larger PNG; SVG keeps the QR
              pattern sharp when resized.
            </p>
            <p>
              Keep the clear margin around the QR. Print it large enough for its scanning distance
              and content, and test at the actual size.
            </p>
          </article>
          <article>
            <h3>
              Center logos <span className="pro-label">Pro</span>
            </h3>
            <p>
              Switch on Center logo to start with an icon matching your QR type. Choose another icon
              or upload a PNG, JPG or WebP logo under 2 MB and 4 megapixels.
            </p>
            <p>
              We clean and resize your image, protect the QR’s margin and use high error correction.
              Each decorated code must pass a scan check before we return it. Complex designs may
              use a smaller logo to stay readable.
            </p>
          </article>
          <article>
            <h3>
              Bottom text <span className="pro-label">Pro</span>
            </h3>
            <p>
              Add a short phrase such as “Scan the menu” or “Connect to Wi-Fi”, up to 60 characters.
              Choose the size, regular or bold style, and alignment.
            </p>
            <p>
              The caption uses your chosen colors and sits below the QR’s clear margin. Long text
              shrinks to fit; shorten it if it becomes hard to read. In SVG downloads, the QR
              pattern is vector while logos and captions are embedded images.
            </p>
          </article>
        </div>
      </section>
      <section id="batch" className="guide-section guide-batch">
        <span className="eyebrow">04 · MAKE MORE, WITH LESS REPETITION</span>
        <h2>
          <Layers size={27} /> Thousands of QR codes. One sheet.{' '}
          <span className="pro-label">Pro</span>
        </h2>
        <ol className="guide-batch-steps">
          <li>
            <strong>Choose a type and download a sample.</strong> CSV and Excel templates show the
            headers for each QR type. Batches support websites, text, Wi-Fi, contacts, email, SMS,
            phone and location. File QR codes aren’t included.
          </li>
          <li>
            <strong>Add your rows.</strong> Use Data or Text as the website/text column header, in
            any capitalization. A single column can also be used; auto-detect treats valid links as
            websites and other values as text. For a Phone template, its Phone column creates phone
            codes. Multi-column templates keep additional information alongside the QR.
          </li>
          <li>
            <strong>Prepare your spreadsheet.</strong> Save a UTF-8 CSV or XLSX file. We read the
            first worksheet, with a header row and up to 32 columns. Paste formulas as values, and
            format phone numbers as text so the country code and leading zeros stay intact.
          </li>
          <li>
            <strong>Upload, preview and design.</strong> Check the first rows, select your colors,
            and optionally add a logo or caption. Auto icons match each row’s QR type. Submit the
            batch and follow its progress. You can leave the page while it runs.
          </li>
          <li>
            <strong>Download your results.</strong> The ZIP includes an Excel sheet with a QR image
            beside each successful row, a CSV with image filenames, and the individual PNGs. Rows
            that need fixing remain in both sheets with an error message. Correct those rows and
            submit them again.
          </li>
        </ol>
        <p>
          The default limit is 5,000 rows and 10 MB per upload, with two active jobs at a time.
          There is no daily Pro generation allowance. The batch page shows the current limits.
          Downloads are normally kept for seven days, with 1 GB of private batch storage per
          account; delete old files when you need room.
        </p>
        <p>
          Batch QR codes are static: their data is stored directly in the image. They are not added
          individually to your QR library, and they do not offer destination editing or scan
          analytics. Downloaded codes continue to work after the batch download expires.
        </p>
        <Link className="btn btn-dark" to="/batch">
          Open batch generator <ArrowRight size={17} />
        </Link>
      </section>
      <section id="workspace" className="guide-section">
        <span className="eyebrow">05 · A HOME FOR YOUR IDEAS</span>
        <h2>Save it. Find it. Share it again.</h2>
        <div className="guide-columns">
          <article>
            <h3>Your QR library</h3>
            <p>
              Signed-in individual generations are saved automatically. Give codes a name, organize
              them into projects, mark favorites, search your library, duplicate a code or download
              it again. A duplicate counts as a new generation.
            </p>
          </article>
          <article>
            <h3>Dynamic links & files</h3>
            <p>
              For websites, switch on Make this a dynamic QR under Save & manage before generating.
              The QR points through QRFactory, so you can edit its destination later. File QR codes
              use a managed link too. Dynamic links can be paused and show scan counts in your
              workspace.
            </p>
            <p>
              Anyone with a file’s share link can access it while sharing is enabled. Share only
              files you intend recipients to see. Replacing a file keeps its QR link; deleting or
              pausing a managed link stops access through it.
            </p>
          </article>
          <article>
            <h3>Your account & billing</h3>
            <p>
              Manage your account in the workspace. Web Pro subscriptions offer weekly, monthly and
              yearly billing; the Plans page shows current prices and availability. Existing
              subscribers can open the billing portal there to manage their subscription.
            </p>
            <p>
              If Pro ends, you return to the free generation allowance. Your previously downloaded
              static QR codes keep their encoded data. Hosted files and dynamic links depend on the
              service and the sharing settings remaining active.
            </p>
          </article>
        </div>
      </section>
      <section id="plans" className="guide-section">
        <span className="eyebrow">06 · ROOM TO GROW</span>
        <h2>Start free. Go further when you’re ready.</h2>
        <div className="guide-plans">
          <article>
            <h3>Without an account</h3>
            <p>
              20 successful generations per browser/device identity across website, text and Wi-Fi.
              Create a free account when you reach that limit.
            </p>
          </article>
          <article>
            <h3>Free account</h3>
            <p>
              Unlimited website QR codes, plus 10 successful generations per day shared across text,
              Wi-Fi, contact, email, SMS, phone and location. The daily allowance resets at midnight
              UTC. File QR codes require Pro.
            </p>
          </article>
          <article>
            <h3>Pro</h3>
            <p>
              Unlimited generations across every QR type, file uploads, center logos, bottom text
              and batch generation. Upload size, private storage and batch job limits still apply.
            </p>
            <Link to="/pricing">
              See plans & pricing <ArrowRight size={15} />
            </Link>
          </article>
        </div>
        <p>
          <Check size={16} /> Downloading a QR you already generated does not use another
          generation.
        </p>
      </section>
      <div className="guide-finish">
        <h2>Your next connection starts here.</h2>
        <Link className="btn btn-primary" to="/create">
          Generate a QR code <ArrowRight size={17} />
        </Link>
      </div>
    </main>
  )
}
