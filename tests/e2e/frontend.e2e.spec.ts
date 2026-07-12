import { test, expect } from '@playwright/test'

// 前台骨架冒烟(阶段3):无前缀 → 重定向到默认 locale、首页标题/H1、/en 本地化、内页重定向保留路径。
// playwright webServer 自动拉起 pnpm dev @ :3000(需可用 DB)。
test.describe('前台骨架', () => {
  test('/ 重定向到 /zh 并渲染中文首页', async ({ page }) => {
    await page.goto('http://localhost:3000/')
    await expect(page).toHaveURL(/\/zh$/)
    await expect(page).toHaveTitle(/GRAIN/)
    await expect(page.locator('h1.slogan')).toHaveText('制造注意力')
  })

  test('/en 渲染英文首页', async ({ page }) => {
    await page.goto('http://localhost:3000/en')
    await expect(page.locator('h1.slogan')).toHaveText('Make Them Look')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('无前缀内页重定向保留子路径', async ({ page }) => {
    await page.goto('http://localhost:3000/work')
    await expect(page).toHaveURL(/\/zh\/work$/)
  })

  test('语言切换保留当前子路径', async ({ page }) => {
    await page.goto('http://localhost:3000/zh/work')
    await page.getByRole('link', { name: /切换语言/ }).click()
    await expect(page).toHaveURL(/\/en\/work$/)
  })
})
