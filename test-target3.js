const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:30000');
  await page.waitForTimeout(1000);
  if(page.url().includes('/setup')) {
    await page.evaluate(async () => {
       await fetch('/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'launchWorld', world: 'ishait' }) });
    }).catch(()=>{});
    await page.waitForTimeout(2000);
    await page.goto('http://localhost:30000/join');
  }
  await page.waitForSelector('select[name="userid"]', { timeout: 10000 });
  await page.selectOption('select[name="userid"]', { label: 'Gamemaster' });
  await page.click('button[name="join"]');
  await page.waitForSelector('#ui-middle', { timeout: 15000 });
  await page.waitForTimeout(3000);

  const result = await page.evaluate(async () => {
     return CONFIG.DND5E.targetTypes;
  });
  console.log(result);
  await browser.close();
})();
