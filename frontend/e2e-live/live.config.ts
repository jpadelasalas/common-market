import { defineConfig } from '@playwright/test'
export default defineConfig({ testDir: '.', timeout: 180_000, expect: { timeout: 60_000 }, workers: 1, reporter: [['list']], use: { baseURL: 'https://cm-shell.pages.dev', channel: 'msedge', viewport: { width: 1440, height: 1000 } } })
