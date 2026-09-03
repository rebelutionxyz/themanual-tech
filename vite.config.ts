import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // SHELL_PKG1 — the ONE shell lives in the monorepo, not in this app.
      '@honeycomb/shell': path.resolve(__dirname, '../shared/shell/src'),
      // The shared package has no node_modules of its own; its bare imports
      // resolve to THIS app's copies (one React, one lucide, one supabase).
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'lucide-react': path.resolve(__dirname, './node_modules/lucide-react'),
      '@supabase/supabase-js': path.resolve(__dirname, './node_modules/@supabase/supabase-js'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
    host: true,
    fs: { allow: [path.resolve(__dirname, '..')] },
  },
  preview: {
    port: 3000,
    host: true,
    allowedHosts: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
});
