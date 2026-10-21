const path = require('path')
const { execSync } = require('child_process')
const { chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } })
  await page.goto('file://' + path.join(__dirname, 'icon.html'))
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path.join(__dirname, '../../build/icon.png'), omitBackground: true })
  await browser.close()
})()
