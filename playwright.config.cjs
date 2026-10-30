const {defineConfig, devices} = require('@playwright/test');
const {existsSync} = require('node:fs');

const localChromium = !process.env.CI && existsSync('/usr/bin/chromium')
  ? '/usr/bin/chromium' : undefined;

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 15_000,
  expect: {timeout: 5_000},
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome'], viewport: {width: 390, height: 844}, launchOptions: localChromium ? {executablePath: localChromium} : {}}},
    {name: 'webkit', use: {...devices['Desktop Safari'], viewport: {width: 390, height: 844}}}
  ],
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: false,
    stderr: 'ignore',
    timeout: 15_000
  }
});
