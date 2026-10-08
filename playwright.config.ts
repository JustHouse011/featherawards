import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', timeout: 150000, fullyParallel: false, workers: 1, reporter: 'list', use: { baseURL: 'http://127.0.0.1:5173', headless: true }, webServer: { command: 'npm.cmd run dev -- --port 5173 --configLoader runner', url: 'http://127.0.0.1:5173', reuseExistingServer: true, timeout: 60000 } });
