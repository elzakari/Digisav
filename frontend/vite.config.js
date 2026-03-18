import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        // Allows the frontend Cloudflare URL to bypass host-check security
        allowedHosts: true,
        proxy: {
            '/api': {
                // Your Backend's Cloudflare Tunnel URL
                target: 'http://localhost:3000',
                changeOrigin: true,
                // Critical: Prevents SSL handshake errors (the 400 error)
                secure: false,
                ws: true,
                configure: (proxy, _options) => {
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        // Manually set the host header to match the backend tunnel
                        proxyReq.setHeader('Host', 'derived-theta-intelligence-expressed.trycloudflare.com');
                    });
                    proxy.on('error', (err, req, res) => {
                        console.log('Vite Proxy Error:', err);
                    });
                },
            },
        },
    },
});