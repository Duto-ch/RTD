import { defineConfig } from '@playwright/test';

// 브라우저 자동 테스트: 실제 빌드를 띄워 게임을 직접 조작해 본다 (npm run test:e2e)
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  workers: 1,
  fullyParallel: true, // --shard 가 테스트 단위로 나뉘게 (CI 브라우저 테스트 4대, 2026-11-26) — 한 대 안에서는 workers 1 이라 차례로
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1920, height: 1080 }, // PC 1080p (2026-11-22)
    trace: 'off',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
