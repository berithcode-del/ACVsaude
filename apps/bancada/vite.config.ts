import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3002',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:3002',
      },
    },
  },
});
