import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const routes = ['/', '/create', '/pricing', '/batch', '/how-it-works']
const titles = new Set()
const sitemap = await readFile('dist/sitemap.xml', 'utf8')
for (const route of routes) {
  const html = await readFile(`dist${route === '/' ? '' : route}/index.html`, 'utf8')
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1]
  assert(title, `Missing title for ${route}`)
  titles.add(title)
  assert.match(html, /<h1[\s>]/)
  assert(!html.includes('<div id="root"></div>'), `Missing rendered content for ${route}`)
  const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1]
  assert(canonical?.startsWith('https://'))
  assert(sitemap.includes(`<loc>${canonical}</loc>`))
  assert.match(html, /name="robots" content="index,follow,max-image-preview:large"/)
  assert.match(html, /name="description" content="[^"]{50,}"/)
  assert(
    JSON.parse(
      html.match(/id="qrfactory-structured-data" type="application\/ld\+json">(.*?)<\/script>/s)[1],
    )['@graph'].length === 3,
  )
}
assert.equal(titles.size, routes.length, 'Page titles must be distinct')
assert.match(await readFile('dist/200.html', 'utf8'), /name="robots" content="noindex,nofollow"/)
assert.match(await readFile('dist/robots.txt', 'utf8'), /Sitemap: https:\/\//)
assert((await readFile('dist/social.png')).byteLength > 1000)
console.log('Production HTML, metadata, sitemap, noindex shell and social image checks passed.')
