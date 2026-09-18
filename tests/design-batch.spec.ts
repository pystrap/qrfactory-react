import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { grantPro } from './fixtures'

async function runWorker() {
  if (!process.env.E2E_DJANGO_PYTHON)
    throw new Error('Set E2E_DJANGO_PYTHON to the isolated test Python.')
  execFileSync(
    process.env.E2E_DJANGO_PYTHON,
    ['manage.py', 'run_qr_batches', '--once', '--settings=core.test_settings'],
    { cwd: fileURLToPath(new URL('../../django', import.meta.url)), env: process.env },
  )
}

test('Pro logo, caption, both generation buttons, and styled downloads', async ({
  page,
  request,
}, info) => {
  const registered = await request.post('/api/auth/register', {
    data: {
      email: `e2e-design-${Date.now()}-${info.project.name}@example.com`,
      password: 'A-long-test-password-2026',
    },
  })
  const session = await registered.json()
  grantPro(session.user.id)
  await page.goto('/')
  await page.evaluate(
    (value) => sessionStorage.setItem('qrfactory.session', JSON.stringify(value)),
    session,
  )
  await page.goto('/create?type=wifi')
  await page.getByLabel('Network name').fill('A very good cafe')
  await page.getByLabel('Network password').fill('GoodCoffee2026')
  await page.getByLabel('Enable center logo').check()
  await expect(page.getByRole('button', { name: 'Match QR type' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByLabel('Enable bottom text').check()
  await page.getByLabel('What should it say?').fill('Connect & enjoy')
  await page.getByLabel('Alignment', { exact: true }).selectOption('left')
  await page.getByRole('button', { name: 'Violet style' }).click()
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/qr-codes') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Generate', exact: true }).click()
  const first = await (await created).json()
  expect(first.design.logo).toBe('auto')
  expect(first.design.caption).toBe('Connect & enjoy')
  expect(first.error_correction).toBe('H')
  await expect(page.getByAltText('Your generated QR code')).toBeVisible()
  const logo = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#6350b0'
    ctx.fillRect(0, 0, 100, 100)
    ctx.fillStyle = 'white'
    ctx.font = 'bold 70px sans-serif'
    ctx.fillText('Q', 20, 75)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page
    .getByLabel('Upload center logo')
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(logo, 'base64') })
  await expect(page.getByAltText('Selected center logo')).toBeVisible()
  await page.getByLabel('What should it say?').fill('Scan for coffee')
  const generated = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/qr-codes') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Generate QR Code', exact: true }).click()
  const second = await (await generated).json()
  expect(second.design.logo).toBe('upload')
  expect(second.design.caption).toBe('Scan for coffee')
  for (const format of ['PNG', 'SVG']) {
    const waiting = page.waitForEvent('download')
    await page.getByRole('button', { name: format, exact: true }).click()
    const result = await waiting
    expect(await result.failure()).toBeNull()
    await result.saveAs(info.outputPath(`decorated.${format.toLowerCase()}`))
  }
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.screenshot({ path: info.outputPath('pro-design.png'), fullPage: true })
})

test('batch spreadsheet preview, design, background processing and ZIP download', async ({
  page,
  request,
}, info) => {
  const registered = await request.post('/api/auth/register', {
    data: {
      email: `e2e-batch-${Date.now()}-${info.project.name}@example.com`,
      password: 'A-long-test-password-2026',
    },
  })
  const session = await registered.json()
  grantPro(session.user.id)
  await page.goto('/')
  await page.evaluate(
    (value) => sessionStorage.setItem('qrfactory.session', JSON.stringify(value)),
    session,
  )
  await page.goto('/batch')
  const sample = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Excel sample' }).click()
  expect((await sample).suggestedFilename()).toContain('.xlsx')
  await page.getByLabel('Upload batch spreadsheet').setInputFiles({
    name: 'our-links.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'dAtA,Campaign\nhttps://example.com/one,Summer\nHello from the cafe,Autumn\n',
    ),
  })
  await expect(page.getByText('2 rows ready')).toBeVisible()
  await page.getByLabel('Enable center logo').check()
  await page.getByLabel('Enable bottom text').check()
  await page.getByLabel('What should it say?').fill('Scan & discover')
  const queued = page.waitForResponse(
    (response) => response.url().endsWith('/api/batches') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Generate 2 QR codes' }).click()
  const response = await queued
  expect(response.status()).toBe(202)
  await runWorker()
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByText('2 ready · 0 row errors', { exact: false })).toBeVisible()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download ZIP' }).click()
  const result = await downloading
  expect(await result.failure()).toBeNull()
  await result.saveAs(info.outputPath('batch.zip'))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  )
  await page.screenshot({ path: info.outputPath('batch-completed.png'), fullPage: true })
  await page.getByRole('button', { name: 'Delete files' }).click()
  await expect(page.getByText('expired', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download ZIP' })).toHaveCount(0)
})

test('public discovery, guide, SEO and responsive layout', async ({ page }, info) => {
  for (const route of ['/batch', '/how-it-works', '/']) {
    await page.goto(route)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'index,follow,max-image-preview:large',
    )
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`${route === '/' ? '/' : route}$`),
    )
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
    ).toEqual([])
    await page.screenshot({
      path: info.outputPath(`public-${route.replaceAll('/', '') || 'home'}.png`),
      fullPage: true,
    })
  }
  await expect(page.getByRole('button', { name: 'Website', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: 'Contact Sign in' })).toBeVisible()
  const button = await page
    .getByRole('button', { name: 'Generate QR Code', exact: true })
    .boundingBox()
  const heading = await page.getByRole('heading', { name: 'Design your QR Code' }).boundingBox()
  expect(button!.y).toBeLessThan(heading!.y)
  await page.goto('/login')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow')
})

test('batch signup returns to the requested tool', async ({ page }, info) => {
  await page.goto('/batch')
  await page.getByRole('link', { name: 'Create an account', exact: true }).click()
  await page.getByLabel('Your name').fill('Batch Creator')
  await page
    .getByLabel('Email address')
    .fill(`e2e-batch-signup-${Date.now()}-${info.project.name}@example.com`)
  await page.getByLabel('Password', { exact: true }).fill('A-long-test-password-2026')
  await page.getByRole('button', { name: 'Create free account' }).click()
  await expect(page).toHaveURL('/batch')
  await expect(page.getByRole('link', { name: 'Explore Pro', exact: true })).toBeVisible()
})

test('free account can remove Pro styling from a restored draft', async ({
  page,
  request,
}, info) => {
  const response = await request.post('/api/auth/register', {
    data: {
      email: `e2e-restored-${Date.now()}-${info.project.name}@example.com`,
      password: 'A-long-test-password-2026',
    },
  })
  const session = await response.json()
  await page.goto('/')
  await page.evaluate((value) => {
    sessionStorage.setItem('qrfactory.session', JSON.stringify(value))
    sessionStorage.setItem(
      'qrfactory.draft',
      JSON.stringify({
        payload_type: 'url',
        payload: { url: 'https://example.com/restored' },
        title: '',
        fill_color: '#5636bc',
        back_color: '#faf7ff',
        image_format: 'png',
        error_correction: 'M',
        box_size: 10,
        border: 4,
        is_dynamic: false,
        design: { logo: 'auto', caption: 'Scan me' },
      }),
    )
  }, session)
  await page.goto('/create')
  await page.getByRole('button', { name: 'Use free design' }).click()
  const created = page.waitForResponse(
    (r) => r.url().endsWith('/api/qr-codes') && r.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Generate', exact: true }).click()
  const saved = await created
  expect(saved.status()).toBe(200)
  const data = await saved.json()
  expect(data.design.logo).toBe('none')
  expect(data.design.caption).toBe('')
  expect(data.fill_color).toBe('#5636bc')
})
