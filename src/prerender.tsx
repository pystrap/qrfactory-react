import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './context'
export { publicPages, pageMetadata, structuredData } from './seo'
export const siteUrl = import.meta.env.VITE_SITE_URL
export function render(path: string) {
  return renderToString(
    <StaticRouter location={path}>
      <AppProvider>
        <App />
      </AppProvider>
    </StaticRouter>,
  )
}
