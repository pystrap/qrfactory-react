import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { grantPro } from './fixtures'

test('expired access refreshes automatically, then login and logout work', async ({
  page,
  request,
}, testInfo) => {
  const email = `e2e-session-${Date.now()}-${testInfo.project.name}@example.com`
  const password = 'A-long-test-password-2026'
  const registered = await request.post('/api/auth/register', { data: { email, password } })
  expect(registered.status()).toBe(201)
  const session = await registered.json()
  await page.goto('/')
  await page.evaluate(
    (value) =>
      sessionStorage.setItem(
        'qrfactory.session',
        JSON.stringify({ ...value, access_token: 'expired-test-access' }),
      ),
    session,
  )
  await page.goto('/account')
  await expect(
    page.getByRole('heading', { name: 'Your account', exact: true }).first(),
  ).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(sessionStorage.getItem('qrfactory.session') || '{}').access_token,
      ),
    )
    .not.toBe('expired-test-access')
  await page.getByRole('main').getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL('/')
  expect(await page.evaluate(() => sessionStorage.getItem('qrfactory.session'))).toBeNull()
  const stale = await request.post('/api/auth/refresh', {
    data: { refresh_token: session.refresh_token },
  })
  expect(stale.status()).toBe(401)
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page).toHaveURL('/library')
  await expect(page.getByRole('heading', { name: 'My QR codes', exact: true })).toBeVisible()
})

test('guest generation, PNG/SVG downloads, and responsive landing', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Make something worth scanning.' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('landing.png'), fullPage: true })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy()
  await page.getByLabel('Your URL').fill('https://example.com/my-first-qr')
  await page.getByRole('button', { name: 'Generate QR Code', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ready for the real world.' })).toBeVisible()
  await expect(page.getByAltText('Your generated QR code')).toHaveAttribute(
    'src',
    /^data:image\/png/,
  )
  for (const format of ['PNG', 'SVG']) {
    const downloading = page.waitForEvent('download')
    await page.getByRole('button', { name: format, exact: true }).click()
    const file = await downloading
    expect(file.suggestedFilename()).toBe(`qrfactory.${format.toLowerCase()}`)
  }
  await expect(page.getByText('This one’s a keeper.')).toBeVisible()
  await page.getByRole('button', { name: 'Wi-Fi', exact: true }).click()
  await page.getByLabel('Network name').fill('Cafe Guest')
  await page.getByLabel('Network password').fill('my-guest-wifi')
  await page.getByRole('button', { name: 'Generate QR Code', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ready for the real world.' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('generated.png'), fullPage: true })
  expect(errors).toEqual([])
})

test('guest draft signup, saved QR management, projects, files, and public sharing', async ({
  page,
  request,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const run = `${Date.now()}-${testInfo.project.name}`
  const email = `e2e-${run}@example.com`
  const projectIds: number[] = [],
    qrIds: number[] = [],
    assetIds: number[] = []
  let token = ''
  page.on('response', async (response) => {
    if (!response.ok() || response.request().method() !== 'POST') return
    try {
      const data = await response.json()
      if (/\/api\/qr-codes$/.test(response.url()) || /\/duplicate$/.test(response.url()))
        qrIds.push(data.id)
      if (/\/api\/projects$/.test(response.url())) projectIds.push(data.id)
      if (/\/api\/media-assets$/.test(response.url())) assetIds.push(data.id)
    } catch {
      /* Downloads are not JSON. */
    }
  })
  try {
    await page.goto('/')
    await page.getByLabel('Your URL').fill('https://example.com/guest-draft')
    await page.getByRole('button', { name: 'Generate QR Code', exact: true }).click()
    await page.getByRole('link', { name: 'Save with a free account' }).click()
    await page.getByLabel('Your name').fill('Alex Browser Test')
    await page.getByLabel('Email address').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('A-long-test-password-2026')
    await page.getByRole('button', { name: 'Create free account' }).click()
    await expect(page).toHaveURL('/create')
    token = await page.evaluate(
      () => JSON.parse(sessionStorage.getItem('qrfactory.session')!).access_token,
    )
    await expect(page.getByLabel('Your URL')).toHaveValue('https://example.com/guest-draft')
    await page.locator('summary').filter({ hasText: 'Save & manage' }).click()
    await page.getByLabel('Name your QR').fill('Guest draft saved')
    await page.getByRole('button', { name: 'Generate QR Code' }).click()
    await expect(page.getByText('Saved in your workspace')).toBeVisible()
    await page.getByRole('link', { name: 'Saved in your workspace' }).click()
    await expect(page.getByRole('button', { name: 'Guest draft saved', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Add favorite', exact: true }).click()
    await page.getByRole('button', { name: 'Favorites', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Guest draft saved', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Actions for Guest draft saved' }).click()
    await page.getByText('Duplicate', { exact: true }).click()
    await page.getByRole('button', { name: 'Favorites', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Guest draft saved copy', exact: true }),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Projects', exact: true }).click()
    await page.getByRole('button', { name: 'New project' }).click()
    await page.getByLabel('Project name').fill('Launch collection')
    await page.getByRole('button', { name: 'Save project' }).click()
    await expect(page.getByRole('heading', { name: 'Launch collection' })).toBeVisible()
    await page.goto('/create')
    await page.getByLabel('Your URL').fill('https://example.com/before')
    await page.locator('summary').filter({ hasText: 'Save & manage' }).click()
    await page.getByLabel('Name your QR').fill('Dynamic launch')
    await page.getByLabel('Project', { exact: true }).selectOption({ label: 'Launch collection' })
    await page.getByLabel('Make this a dynamic QR').check()
    await page.getByRole('button', { name: 'Generate QR Code' }).click()
    await page.getByRole('link', { name: 'Saved in your workspace' }).click()
    await page.getByRole('button', { name: 'Dynamic launch', exact: true }).click()
    await page.getByLabel('Website destination').fill('https://example.com/after')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('https://example.com/after', { exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('workspace.png'), fullPage: true })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy()
    await page.getByRole('button', { name: 'Dynamic launch', exact: true }).click()
    await page.getByLabel('Sharing is active').uncheck()
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('Paused / expired', { exact: true })).toBeVisible()
    const fixtureUser = await page.evaluate(
      () => JSON.parse(sessionStorage.getItem('qrfactory.session')!).user.id,
    )
    grantPro(fixtureUser)
    await page.goto('/create?type=media')
    await page.getByLabel('Upload a file', { exact: true }).setInputFiles({
      name: 'launch.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7\nBrowser test document'),
    })
    await expect(page.getByLabel('Or use a file from your library')).toHaveValue(/\d+/)
    await page.locator('summary').filter({ hasText: 'Save & manage' }).click()
    await page.getByLabel('Name your QR').fill('Launch document')
    await page.getByRole('button', { name: 'Generate QR Code' }).click()
    await page.getByRole('link', { name: 'Saved in your workspace' }).click()
    await expect(page.getByRole('button', { name: 'Launch document', exact: true })).toBeVisible()
    const codesResponse = await request.get('/api/qr-codes', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const codes = (await codesResponse.json()).items
    const mediaCode = codes.find((code: { title: string }) => code.title === 'Launch document')
    await page.getByRole('link', { name: 'File library', exact: true }).click()
    await page.getByRole('button', { name: 'Replace launch', exact: true }).click()
    await page.getByLabel('Upload or replace file').setInputFiles({
      name: 'updated.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7\nUpdated document'),
    })
    await expect(page.getByText('updated.pdf', { exact: false })).toBeVisible()
    await page.goto(`/share/${mediaCode.public_id}`)
    await expect(page.getByRole('heading', { name: 'Launch document' })).toBeVisible()
    await expect(page.getByText('updated.pdf', { exact: false })).toBeVisible()
    const downloading = page.waitForEvent('download')
    await page.getByRole('link', { name: 'Download file' }).click()
    expect((await downloading).suggestedFilename()).toBe('updated.pdf')
    await page.goto('/library')
    await page.getByLabel('Search QR codes').fill('Guest draft saved copy')
    await page.getByRole('button', { name: 'Actions for Guest draft saved copy' }).click()
    await page.getByText('Delete', { exact: true }).click()
    await page.getByRole('button', { name: 'Delete permanently' }).click()
    await expect(page.getByText('No matches just yet.')).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    if (token) {
      const headers = { Authorization: `Bearer ${token}` }
      for (const id of qrIds) await request.delete(`/api/qr-codes/${id}`, { headers })
      for (const id of assetIds) await request.delete(`/api/media-assets/${id}`, { headers })
      for (const id of projectIds) await request.delete(`/api/projects/${id}`, { headers })
    }
  }
})

test('validation, sign-in errors, and unavailable shared content', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('not-an-account@example.com')
  await page.getByLabel('Password', { exact: true }).fill('incorrect-password')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Invalid email or password')
  await page.goto('/share/00000000-0000-0000-0000-000000000000')
  await expect(page.getByRole('heading', { name: 'This connection is unavailable.' })).toBeVisible()
  await page.goto('/create?type=media')
  await expect(
    page.getByRole('heading', { name: 'A free account opens more doors.' }),
  ).toBeVisible()
  await page.goto('/library')
  await expect(page.getByRole('heading', { name: 'A home for every QR code.' })).toBeVisible()
})

test('public landing and login have no serious accessibility violations', async ({ page }) => {
  for (const path of ['/', '/login']) {
    await page.goto(path)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
    ).toEqual([])
  }
})

test('real uploaded image previews and WebM video plays through a public QR link', async ({
  page,
  request,
}, testInfo) => {
  const account = await request.post('/api/auth/register', {
    data: {
      email: `e2e-media-${Date.now()}-${testInfo.project.name}@example.com`,
      password: 'A-long-test-password-2026',
      full_name: 'Media Browser Test',
    },
  })
  expect(account.ok()).toBeTruthy()
  const session = await account.json()
  grantPro(session.user.id)
  const headers = { Authorization: `Bearer ${session.access_token}` }
  const assets: number[] = [],
    codes: number[] = []
  try {
    await page.goto('/')
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#6d4aff'
      ctx.fillRect(0, 0, 100, 100)
      return canvas.toDataURL('image/png').split(',')[1]
    })
    const webm = await page.evaluate(async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 160
      canvas.height = 100
      const ctx = canvas.getContext('2d')!
      const stream = canvas.captureStream(10)
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
      const chunks: Blob[] = []
      const done = new Promise<string>((resolve) => {
        recorder.ondataavailable = (event) => chunks.push(event.data)
        recorder.onstop = async () => {
          const array = new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer())
          resolve(btoa(Array.from(array, (byte) => String.fromCharCode(byte)).join('')))
        }
      })
      recorder.start()
      let frame = 0
      const interval = setInterval(() => {
        ctx.fillStyle = ++frame % 2 ? '#6d4aff' : '#ccf4a5'
        ctx.fillRect(0, 0, 160, 100)
      }, 100)
      await new Promise((resolve) => setTimeout(resolve, 1200))
      clearInterval(interval)
      recorder.stop()
      stream.getTracks().forEach((track) => track.stop())
      return done
    })
    for (const item of [
      { name: 'image.png', mime: 'image/png', data: png },
      { name: 'video.webm', mime: 'video/webm', data: webm },
    ]) {
      const upload = await request.post('/api/media-assets', {
        headers,
        multipart: {
          file: { name: item.name, mimeType: item.mime, buffer: Buffer.from(item.data, 'base64') },
        },
      })
      expect(upload.status()).toBe(201)
      const asset = await upload.json()
      assets.push(asset.id)
      const generated = await request.post('/api/qr-codes', {
        headers,
        data: { payload_type: 'media', media_id: asset.id, title: item.name },
      })
      expect(generated.status()).toBe(200)
      const code = await generated.json()
      codes.push(code.id)
      await page.goto(`/api/public-links/${code.public_id}/visit`)
      await expect(page.getByRole('heading', { name: item.name, exact: true })).toBeVisible()
      if (item.mime.startsWith('image/')) {
        await expect(page.getByAltText(item.name)).toBeVisible()
        expect(
          await page
            .getByAltText(item.name)
            .evaluate((image: HTMLImageElement) => image.naturalWidth),
        ).toBe(100)
      } else {
        const video = page.locator('video')
        await expect(video).toBeVisible()
        await video.evaluate(async (element: HTMLVideoElement) => {
          element.muted = true
          await element.play()
        })
        await expect
          .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
          .toBeGreaterThan(0)
      }
      const analytics = await request.get(`/api/qr-codes/${code.id}/analytics`, { headers })
      expect((await analytics.json()).total_scans).toBe(1)
    }
  } finally {
    for (const id of codes) await request.delete(`/api/qr-codes/${id}`, { headers })
    for (const id of assets) await request.delete(`/api/media-assets/${id}`, { headers })
  }
})
