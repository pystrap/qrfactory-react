export const publicPages: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Free QR Code Generator for Websites, Wi-Fi & More',
    description:
      'Create and download QR codes for websites, text and Wi-Fi. Save codes with a free account, or add logos, captions, file sharing and batch generation with Pro.',
  },
  '/create': {
    title: 'QR Code Studio — Create & Design Your QR Code',
    description:
      'Generate a QR code for a link, text, Wi-Fi, contact, email, phone, location or file. Customize colors, add Pro logos and captions, and download PNG or SVG.',
  },
  '/pricing': {
    title: 'QRFactory Pricing — Free & Pro QR Code Plans',
    description:
      'Start with free QR codes. Explore Pro for unlimited generation, file QR codes, custom logos, bottom text and bulk CSV or Excel generation.',
  },
  '/batch': {
    title: 'Batch QR Code Generator from CSV & Excel',
    description:
      'Create thousands of QR codes from a CSV or Excel spreadsheet with QRFactory Pro. Add your logo and colors, then download Excel with QR images and individual PNGs.',
  },
  '/how-it-works': {
    title: 'How QRFactory Works — QR Codes, Design & Batch Guide',
    description:
      'Learn how to create, customize and download QR codes, add a logo or caption, generate QR codes in bulk, manage dynamic links, and choose a free or Pro plan.',
  },
}
const privateTitles: Record<string, string> = {
  '/library': 'My QR codes',
  '/files': 'File library',
  '/projects': 'Projects',
  '/account': 'My account',
  '/login': 'Sign in',
  '/register': 'Create an account',
}
export function pageMetadata(path: string) {
  return {
    ...(publicPages[path] || {
      title: privateTitles[path] || 'Shared content',
      description: 'Your QRFactory workspace and shared content.',
    }),
    index: !!publicPages[path],
  }
}
export function structuredData(origin: string, path: string) {
  const website = {
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    name: 'QRFactory',
    url: `${origin}/`,
  }
  const application = {
    '@type': 'WebApplication',
    '@id': `${origin}/#application`,
    name: 'QRFactory',
    url: `${origin}/`,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires a modern web browser',
    description: publicPages['/'].description,
    featureList: [
      'Website and text QR codes',
      'Wi-Fi and contact QR codes',
      'PNG and SVG downloads',
      'Custom center logos and captions with Pro',
      'CSV and Excel batch QR generation with Pro',
    ],
  }
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
      ...(path === '/'
        ? []
        : [
            {
              '@type': 'ListItem',
              position: 2,
              name: publicPages[path]?.title || 'QRFactory',
              item: `${origin}${path}`,
            },
          ]),
    ],
  }
  return { '@context': 'https://schema.org', '@graph': [website, application, breadcrumb] }
}
export function updateMetadata(path: string) {
  const origin = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '')
  const data = pageMetadata(path)
  document.title = `${data.title} | QRFactory`
  const meta = (key: string, value: string, property = false) => {
    const attr = property ? 'property' : 'name'
    let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute(attr, key)
      document.head.appendChild(el)
    }
    el.content = value
  }
  meta('description', data.description)
  meta('robots', data.index ? 'index,follow,max-image-preview:large' : 'noindex,nofollow')
  meta('og:title', document.title, true)
  meta('og:description', data.description, true)
  meta('og:type', 'website', true)
  meta('og:site_name', 'QRFactory', true)
  meta('og:url', `${origin}${path}`, true)
  meta('og:image', `${origin}/social.png`, true)
  meta('twitter:card', 'summary_large_image')
  meta('twitter:title', document.title)
  meta('twitter:description', data.description)
  meta('twitter:image', `${origin}/social.png`)
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = `${origin}${path}`
  document.getElementById('qrfactory-structured-data')?.remove()
  if (data.index) {
    const script = document.createElement('script')
    script.id = 'qrfactory-structured-data'
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(structuredData(origin, path))
    document.head.appendChild(script)
  }
}
