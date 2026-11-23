import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'serve' && !isPreview ? '/' : '/FLAIG-Projektcontrolling/',
  plugins: [react()],
  server: { port: 4173, strictPort: true },
}))
