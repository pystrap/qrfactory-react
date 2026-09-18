import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(
  `<html><head><style>body{margin:0;background:#f8f6f1;color:#272431;font-family:Arial,sans-serif}.card{width:1200px;height:630px;box-sizing:border-box;padding:65px 75px;position:relative;overflow:hidden}.brand{font-size:30px;font-weight:bold;letter-spacing:-1px}.badge{display:inline-block;padding:12px 18px;background:#ebe1fa;border-radius:30px;color:#68508d;font-size:15px;margin-top:45px}h1{font-size:73px;line-height:1.07;letter-spacing:-4px;margin:22px 0}em{font-family:Georgia,serif;font-weight:normal;color:#7450ae}p{font-size:20px;color:#6d607a;line-height:1.6}.qr{position:absolute;right:85px;top:153px;width:285px;height:285px;background:white;padding:26px;border-radius:28px;box-shadow:0 24px 80px #5943711a;transform:rotate(7deg)}.qr img{width:100%;height:100%}.label{position:absolute;right:80px;top:465px;background:#dfedc0;padding:16px 22px;border-radius:12px;transform:rotate(-6deg);color:#526343}</style></head><body><div class="card"><div class="brand">▦ qrfactory®</div><span class="badge">SMALL CODE. BIG POSSIBILITIES.</span><h1>Make something<br />worth <em>scanning.</em></h1><p>Create. Customize. Share.<br />QR codes for your next big thing.</p><div class="qr"><img src="data:image/svg+xml;base64,${(await readFile('public/logo.svg')).toString('base64')}" /></div><span class="label">A little code. A world of possibilities.</span></div></body></html>`,
)
await page.screenshot({ path: 'public/social.png' })
await browser.close()
