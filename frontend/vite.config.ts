import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
        timeout: 30000,
        proxyTimeout: 30000,
        configure: (proxy) => {
          proxy.on('error', (err, req) => {
            console.log('🔴 PROXY ERROR:', err.message);
            console.log('🔴 For request:', req?.method, req?.url);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('📤 SENDING TO BACKEND:', req.method, req.url);
            // Set keepalive to prevent hanging connections
            proxyReq.setHeader('Connection', 'keep-alive');
            // Add a specific timeout for requests
            proxyReq.setTimeout(30000, () => {
              console.log('⏰ PROXY REQUEST TIMEOUT for:', req.url);
              proxyReq.destroy(new Error('Request timeout'));
            });
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('📥 RESPONSE FROM BACKEND:', proxyRes.statusCode, req.url);
            console.log('📥 Response time:', Date.now());
          });
          proxy.on('close', () => {
            console.log('🔌 PROXY CONNECTION CLOSED');
          });
          proxy.on('proxyReqError', (err, req) => {
            console.log('🔴 PROXY REQUEST ERROR:', err.message);
          });
          proxy.on('proxyResError', (err, req) => {
            console.log('🔴 PROXY RESPONSE ERROR:', err.message);
          });
        },
      },
    },
  },
})
