import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

(async () => {
  try {
    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();
    await page.setContent('<h1>Hello Sparticuz</h1>');
    await page.pdf({ path: 'test-sparticuz.pdf' });
    await browser.close();
    console.log("Sparticuz works!");
  } catch (e) {
    console.error("Sparticuz failed", e);
  }
})();
