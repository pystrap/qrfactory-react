import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { grantPro } from './fixtures'

test('guest account gates, persistent device allowance, and Pro discovery', async ({
  page,
}, info) => {
  await page.goto('/create?type=vcard')
  await expect(
    page.getByRole('heading', { name: 'A free account opens more doors.' }),
  ).toBeVisible()
  await expect(page.getByLabel('First name')).toBeDisabled()
  await page.getByRole('button', { name: 'Website', exact: true }).click()
  await expect(page.getByText('20 of 20 device generations left')).toBeVisible()
  const token = await page.evaluate(() => localStorage.getItem('qrfactory.device'))
  expect(token).toBeTruthy()
  await page.getByLabel('Your website link').fill('https://example.com/one')
  await page.getByRole('button', { name: 'Generate QR Code', exact: true }).click()
  await expect(page.getByText('19 of 20 device generations left')).toBeVisible()
  for (const format of ['PNG', 'SVG']) {
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: format, exact: true }).click()
    await download
  }
  await page.reload()
  await expect(page.getByText('19 of 20 device generations left')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('qrfactory.device'))).toBe(token)
  await page.goto('/pricing')
  await expect(
    page.getByRole('heading', { name: 'More ideas. Zero generation limits.' }),
  ).toBeVisible()
  await expect(page.getByText('Pro subscriptions are coming soon.', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  const audit = await new AxeBuilder({ page }).analyze()
  expect(audit.violations.filter((v) => ['serious', 'critical'].includes(v.impact || ''))).toEqual(
    [],
  )
  await page.screenshot({ path: info.outputPath('pricing.png'), fullPage: true })
})

test('free combined daily limit, website exception, Pro upgrade and file unlock', async ({
  page,
  request,
}, info) => {
  const response = await request.post('/api/auth/register', {
    data: {
      email: `e2e-billing-${Date.now()}-${info.project.name}@example.com`,
      password: 'A-long-test-password-2026',
    },
  })
  expect(response.ok()).toBeTruthy()
  const session = await response.json()
  await page.goto('/')
  await page.evaluate(
    (value) => sessionStorage.setItem('qrfactory.session', JSON.stringify(value)),
    session,
  )
  await page.goto('/create?type=media')
  await expect(
    page.getByRole('heading', { name: 'Give your files the Pro treatment.' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Explore Pro' }).click()
  await expect(page).toHaveURL('/pricing')
  const headers = { Authorization: `Bearer ${session.access_token}` }
  for (let i = 0; i < 10; i++) {
    const result = await request.post('/api/qr-codes', {
      headers,
      data: { text: `Allowance ${i}` },
    })
    expect(result.status()).toBe(200)
  }
  await page.goto('/create?type=text')
  await expect(
    page.getByRole('heading', { name: 'You’ve made your 10 daily connections.' }),
  ).toBeVisible()
  await expect(page.getByLabel('Your message')).toBeDisabled()
  await page.screenshot({ path: info.outputPath('daily-limit.png'), fullPage: true })
  await page.getByRole('button', { name: 'Website', exact: true }).click()
  await page.getByLabel('Your website link').fill('https://example.com/still-free')
  await page.getByRole('button', { name: 'Generate QR Code' }).click()
  await expect(page.getByText('Saved in your workspace')).toBeVisible()
  grantPro(session.user.id)
  await page.goto('/create?type=media')
  await expect(page.getByText('Every QR type. Unlimited generations.')).toBeVisible()
  await expect(page.getByLabel('Upload a file', { exact: true })).toBeEnabled()
  await page.screenshot({ path: info.outputPath('pro-files.png'), fullPage: true })
})

test('weekly monthly yearly checkout selection and verified Pro return', async ({
  page,
  request,
}, info) => {
  const response = await request.post('/api/auth/register', {
    data: {
      email: `e2e-checkout-${Date.now()}-${info.project.name}@example.com`,
      password: 'A-long-test-password-2026',
    },
  })
  const session = await response.json()
  await page.goto('/')
  await page.evaluate(
    (value) => sessionStorage.setItem('qrfactory.session', JSON.stringify(value)),
    session,
  )
  await page.route('**/api/billing/plans', (route) =>
    route.fulfill({
      json: {
        checkout_available: true,
        plans: ['week', 'month', 'year'].map((interval, i) => ({
          id: i + 1,
          name: `Pro ${interval}`,
          interval,
          amount: [299, 999, 7999][i],
          currency: 'gbp',
        })),
      },
    }),
  )
  let selected = 0
  await page.route('**/api/billing/checkout', (route) => {
    selected = route.request().postDataJSON().plan_id
    return route.fulfill({
      json: { url: 'http://localhost:5173/pricing?checkout=success&session_id=cs_test_browser' },
    })
  })
  await page.route('**/api/billing/confirm', async (route) => {
    expect(route.request().postDataJSON().session_id).toBe('cs_test_browser')
    grantPro(session.user.id)
    await route.fulfill({ json: { tier: 'pro' } })
  })
  await page.goto('/pricing')
  await expect(page.getByRole('button', { name: 'Choose plan' })).toHaveCount(3)
  await page.screenshot({ path: info.outputPath('configured-plans.png'), fullPage: true })
  await page.getByRole('button', { name: 'Choose plan' }).nth(1).click()
  await expect(
    page.getByRole('heading', { name: 'You’re in. Make something great.' }),
  ).toBeVisible()
  expect(selected).toBe(2)
  await expect(page.getByRole('button', { name: 'Pro active' })).toHaveCount(3)
  await expect(page.getByRole('button', { name: 'Pro active' }).first()).toBeDisabled()
})
