import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  envPrefix: 'OUTCOME_CLIENT_',
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  test: { environment: 'node', include: ['src/**/*.test.ts', 'src/**/*.test.tsx'] },
})
