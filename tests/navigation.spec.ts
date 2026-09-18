import { test, expect } from '@playwright/test'

test('navbar opens a fresh URL code even from a saved or selected File draft', async ({ page }) => {
  await page.route('**/api/billing/device', (route) =>
    route.fulfill({ json: { device_token: 'navigation-test' } }),
  )
  await page.route('**/api/billing/status', (route) =>
    route.fulfill({ json: { tier: 'guest', remaining: 20, limit: 20 } }),
  )
  await page.goto('/')
  await page.evaluate(() =>
    sessionStorage.setItem(
      'qrfactory.draft',
      JSON.stringify({
        payload_type: 'media',
        payload: {},
        media_id: 123,
        is_dynamic: true,
        title: 'Saved file',
      }),
    ),
  )
  await page.goto('/create')
  const fileTab = page
    .getByRole('group', { name: 'QR content type' })
    .getByRole('button', { name: /^File/ })
  const urlTab = page.getByRole('button', { name: 'URL', exact: true })
  await expect(fileTab).toHaveAttribute('aria-pressed', 'true')
  const openGenerator = async () => {
    const toggle = page.getByRole('button', { name: 'Toggle navigation' })
    if (await toggle.isVisible()) await toggle.click()
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'QR generator', exact: true })
      .click()
    await expect(page).toHaveURL('/create?type=url')
    await expect(urlTab).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByLabel('Your URL')).toHaveValue('')
  }
  await openGenerator()
  // Clicking the same navbar URL must also reset a type changed within the studio.
  await fileTab.click()
  await expect(fileTab).toHaveAttribute('aria-pressed', 'true')
  await openGenerator()
  await page.reload()
  await expect(urlTab).toHaveAttribute('aria-pressed', 'true')
  let sent: Record<string, unknown> | undefined
  await page.route('**/api/qr-codes/preview', async (route) => {
    sent = route.request().postDataJSON()
    await route.fulfill({
      status: 400,
      json: { detail: 'Navigation test captured the generation request.' },
    })
  })
  await page.getByLabel('Your URL').fill('https://example.com')
  await page.getByRole('button', { name: 'Generate QR Code', exact: true }).click()
  await expect.poll(() => sent?.payload_type).toBe('url')
  expect(sent?.media_id).toBeUndefined()
  expect(sent?.is_dynamic).toBe(false)
})
