import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000'
  return {
    plugins: [react()],
    ssr: {
      noExternal: true,
      external: ['react', 'react-dom', 'react-dom/server', 'react-router-dom'],
    },
    server: {
      port: Number(env.VITE_DEV_PORT || 5173),
      strictPort: true,
      proxy: { '/api': { target, changeOrigin: true }, '/media': { target, changeOrigin: true } },
    },
  }
})
