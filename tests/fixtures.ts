import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export function grantPro(userId: number) {
  if (!process.env.E2E_DJANGO_PYTHON)
    throw new Error(
      'Set E2E_DJANGO_PYTHON to your local test environment Python. Use core.test_settings for the backend.',
    )
  execFileSync(
    process.env.E2E_DJANGO_PYTHON,
    ['manage.py', 'prepare_browser_account', String(userId), '--settings=core.test_settings'],
    {
      cwd: fileURLToPath(new URL('../../django', import.meta.url)),
      env: process.env,
    },
  )
}
