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
     const i = await Item.create({
       name: "Test Target",
       type: "feat",
       system: {
         target: { template: { type: "radius", size: "20" }, affects: { type: "creature", count: "1" } }
       }
     });
     const t1 = i.system.target;
     
     const i2 = await Item.create({
       name: "Test Target Legacy",
       type: "feat",
       system: { target: { type: "radius", value: 20 } }
     });
     const t2 = i2.system.target;
     
     await i.delete();
     await i2.delete();
     
     return { v3: t1, legacy: t2, targetTypes: Object.keys(CONFIG.DND5E.targetTypes) };
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
