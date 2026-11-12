import { defineConfig } from '@playwright/test';

// 브라우저 자동 테스트: 실제 빌드를 띄워 게임을 직접 조작해 본다 (npm run test:e2e)
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 544, height: 960 },
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
