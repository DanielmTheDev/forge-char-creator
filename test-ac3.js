const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  try {
    await page.goto('http://localhost:30000');
    await page.waitForTimeout(1000);
    await page.evaluate(async () => {
       await fetch('/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'launchWorld', world: 'ishait' }) });
    }).catch(()=>{});
    await page.goto('http://localhost:30000/join');
    await page.waitForSelector('select[name="userid"]', { timeout: 10000 });
    await page.selectOption('select[name="userid"]', { label: 'Gamemaster' });
    await page.click('button[name="join"]');
    await page.waitForSelector('#ui-middle', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    const result = await page.evaluate(async () => {
      const actor = await Actor.create({
        name: "AC Test Dummy", type: "npc",
        system: { attributes: { ac: { flat: 10, calc: "flat" } } }
      });
      const effect1 = await actor.createEmbeddedDocuments("ActiveEffect", [{
        name: "Bonus", changes: [{ key: "system.attributes.ac.bonus", mode: 2, value: "2" }]
      }]);
      const acBonusObj = actor.system.attributes.ac;
      await actor.delete();
      return { bonusObj: acBonusObj };
    });
    console.log(result);
  } catch(e) {}
  await browser.close();
})();
