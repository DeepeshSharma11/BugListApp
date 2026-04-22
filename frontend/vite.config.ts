import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const replaceApiUrlPlugin = () => {
  return {
    name: 'replace-api-url',
    transform(code, id) {
      if (id.endsWith('.tsx') || id.endsWith('.ts') || id.endsWith('.js') || id.endsWith('.jsx')) {
        // Replace fetch('/api/...') with fetch('http://52.207.217.229:8000/api/...')
        return code.replace(/fetch\(['"`]\/api\//g, "fetch('http://52.207.217.229:8000/api/");
      }
      return code;
    }
  }
}

export default defineConfig({
  plugins: [react(), replaceApiUrlPlugin()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
