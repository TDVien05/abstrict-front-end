import { defineConfig, loadEnv } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    // Các file trong e2e/ chạy bằng Playwright, không phải Vitest.
    test: { exclude: [...configDefaults.exclude, 'e2e/**'] },
    server: {
      proxy: {
        '/api': {
          changeOrigin: true,
          target: env.VITE_API_PROXY_TARGET || 'https://abstrict.api.vientruong.site',
        },
      },
    },
  }
})
