import { defineConfig } from 'vite';

export default defineConfig({
  // 단위 테스트 (npm test) — 브라우저 테스트(tests/e2e)는 Playwright 가 맡는다
  test: { include: ['tests/unit/**/*.test.js'] },
  base: './',
  server: { port: 5173 },
  build: {
    outDir: 'dist',
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1600, // Phaser 자체가 ~1.2MB 라서 경고 한도 상향
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined)
      }
    }
  }
});
