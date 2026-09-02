import { defineConfig } from 'vite';

// `--mode singlefile` builds one self-contained HTML page: everything in one chunk, no code
// splitting, and tools/singlefile.mjs then folds the CSS, the script and the character model into
// dist/my-house.html so the file runs straight off the filesystem.
export default defineConfig(({ mode }) => {
  const single = mode === 'singlefile';
  return {
    base: './',
    server: { port: 5173, host: true },
    build: {
      target: 'es2022',
      sourcemap: false,
      chunkSizeWarningLimit: 8000,
      outDir: single ? 'dist-single' : 'dist',
      rollupOptions: {
        output: single
          ? { inlineDynamicImports: true, entryFileNames: 'bundle.js', assetFileNames: 'bundle.[ext]' }
          : {
              manualChunks(id: string) {
                if (id.includes('@dimforge/rapier3d-compat')) return 'rapier';
                if (id.includes('node_modules/three')) return 'three';
                return undefined;
              },
            },
      },
    },
    optimizeDeps: { exclude: ['@dimforge/rapier3d-compat'] },
  };
});
