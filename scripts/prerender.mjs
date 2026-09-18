import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import {
  render,
  siteUrl,
  publicPages,
  pageMetadata,
  structuredData,
} from '../.prerender/prerender.js'
const url = new URL(siteUrl || '')
if (
  url.protocol !== 'https:' ||
  ['localhost', '127.0.0.1'].includes(url.hostname) ||
  url.pathname !== '/' ||
  url.search ||
  url.hash ||
  url.username ||
  url.password
)
  throw new Error('Set VITE_SITE_URL to the public HTTPS origin before building SEO pages.')
const origin = url.origin
const escape = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
const template = await readFile('dist/index.html', 'utf8')
for (const path of Object.keys(publicPages)) {
  const data = pageMetadata(path)
  const title = `${data.title} | QRFactory`
  const tags = `<title>${escape(title)}</title>
    <meta name="description" content="${escape(data.description)}" />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <link rel="canonical" href="${origin}${path}" />
    <meta property="og:title" content="${escape(title)}" />
    <meta property="og:description" content="${escape(data.description)}" />
    <meta property="og:url" content="${origin}${path}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="QRFactory" />
    <meta property="og:image" content="${origin}/social.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escape(title)}" />
    <meta name="twitter:description" content="${escape(data.description)}" />
    <meta name="twitter:image" content="${origin}/social.png" />
    <script id="qrfactory-structured-data" type="application/ld+json">${JSON.stringify(structuredData(origin, path)).replaceAll('<', '\\u003c')}</script>`
  const html = template
    .replace(/<title>.*?<\/title>/s, '')
    .replace(
      /<meta\s+(?:name="(?:description|robots|twitter:[^"]*)"|property="og:[^"]*")[^>]*>/gs,
      '',
    )
    .replace('</head>', `${tags}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${render(path)}</div>`)
  const directory = `dist${path === '/' ? '' : path}`
  await mkdir(directory, { recursive: true })
  await writeFile(`${directory}/index.html`, html)
}
// Private routes use the original shell with an immediate noindex directive.
await writeFile(
  'dist/200.html',
  template.replace('</head>', '<meta name="robots" content="noindex,nofollow" /></head>'),
)
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`)
await writeFile(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(
    publicPages,
  )
    .map((path) => `<url><loc>${origin}${path}</loc></url>`)
    .join('')}</urlset>\n`,
)
await rm('.prerender', { recursive: true, force: true })
console.log(
  `Prerendered ${Object.keys(publicPages).length} public pages, sitemap and robots.txt for ${origin}.`,
)
