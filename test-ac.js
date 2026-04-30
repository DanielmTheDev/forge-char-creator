const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  page.on('console', msg => {
    const txt = msg.text();
    if (!txt.includes('Retrieved') && !txt.includes('Foundry VTT')) console.log(`[Browser] ${txt}`);
  });

  try {
    await page.goto('http://localhost:30000');
    await page.waitForTimeout(1000);
    
    if (page.url().includes('/setup')) {
      await page.evaluate(async () => {
         await fetch('/setup', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ action: 'launchWorld', world: 'ishait' })
         });
      });
      await page.waitForTimeout(2000);
      await page.goto('http://localhost:30000/join');
    }

    await page.waitForSelector('select[name="userid"]', { timeout: 10000 });
    await page.selectOption('select[name="userid"]', { label: 'Gamemaster' });
    await page.click('button[name="join"]');
    await page.waitForNavigation({ timeout: 15000 });

    await page.waitForSelector('#ui-middle', { timeout: 30000 });
    await page.waitForTimeout(4000);
    
    console.log('--- Testing AC Modification ---');
    const result = await page.evaluate(async () => {
      try {
        const actor = await Actor.create({
          name: "AC Test Dummy",
          type: "npc",
          system: { attributes: { ac: { flat: 10, calc: "flat" } } }
        });
        
        let ac1 = actor.system.attributes.ac.value;

        // Apply .bonus
        const effect1 = await actor.createEmbeddedDocuments("ActiveEffect", [{
          name: "Bonus + 2",
          changes: [{ key: "system.attributes.ac.bonus", mode: 2, value: "2" }]
        }]);
        let ac2 = actor.system.attributes.ac.value;
        
        // Clean and apply .value
        await effect1[0].delete();
        const effect2 = await actor.createEmbeddedDocuments("ActiveEffect", [{
          name: "Value + 3",
          changes: [{ key: "system.attributes.ac.value", mode: 2, value: "3" }]
        }]);
        let ac3 = actor.system.attributes.ac.value;

        // Clean and apply just .ac
        await effect2[0].delete();
        const effect3 = await actor.createEmbeddedDocuments("ActiveEffect", [{
          name: "AC + 4",
          changes: [{ key: "system.attributes.ac", mode: 2, value: "4" }]
        }]);
        let ac4 = actor.system.attributes.ac.value;
        
        await actor.delete();

        return { start: ac1, bonus: ac2, val: ac3, justAc: ac4 };
      } catch(e) {
        return e.message;
      }
    });
    console.log(result);
  } catch (e) {
    console.error(e);
  }
  await browser.close();
})();
