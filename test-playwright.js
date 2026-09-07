import { chromium } from 'playwright';
(async () => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent('<h1>Hello Playwright</h1>');
    await page.pdf({ path: 'test-pw.pdf' });
    await browser.close();
    console.log("Playwright works!");
  } catch (e) {
    console.error("Playwright failed", e);
  }
})();
