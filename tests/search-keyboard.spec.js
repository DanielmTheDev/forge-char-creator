import { test, expect } from '@playwright/test';

test.describe('Item Search Keyboard Navigation', () => {
  test.setTimeout(120000);

  test('Should navigate search results with arrow keys and select with Enter', async ({ page }) => {

    // 1. Navigate to local Foundry instance
    await page.goto('http://localhost:30000');

    // 2. Handle optional Setup screen (if world isn't booted)
    if (page.url().includes('/setup')) {
      console.log('On setup page. Launching world...');
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

    // 3. Log in as Gamemaster
    console.log('Logging in...');
    await page.waitForSelector('select[name="userid"]', { timeout: 10000 });
    await page.selectOption('select[name="userid"]', { label: 'Gamemaster' });
    await page.click('button[name="join"]');
    await page.waitForNavigation({ timeout: 15000 });

    // 4. Wait for the Foundry Canvas and Modules to load
    console.log('Waiting for Foundry UI...');
    await page.waitForSelector('#ui-middle', { timeout: 30000 });
    await page.waitForTimeout(5000);

    // 5. Open Character Creator directly
    await page.evaluate(async () => {
       const { CharCreatorApp } = await import("./modules/forge-char-creator/scripts/app.js");
       new CharCreatorApp().render({ force: true });
    });
    await page.waitForSelector('.forge-char-creator', { timeout: 10000 });

    // 6. Type a query that matches compendium items
    const searchInput = page.locator('#itemSearchQuery');
    await searchInput.click();
    await searchInput.fill('sword');
    await page.waitForSelector('#itemSearchResults li[data-uuid]', { timeout: 15000 });

    const resultNames = await page.$$eval('#itemSearchResults li[data-uuid]', els => els.map(e => e.dataset.name));
    expect(resultNames.length).toBeGreaterThan(1);

    // 7. ArrowDown highlights the first result
    await searchInput.press('ArrowDown');
    let activeName = await page.evaluate(() => document.querySelector('#itemSearchResults li.active')?.dataset.name);
    expect(activeName).toBe(resultNames[0]);

    // 8. Second ArrowDown moves to the second result; ArrowUp moves back
    await searchInput.press('ArrowDown');
    activeName = await page.evaluate(() => document.querySelector('#itemSearchResults li.active')?.dataset.name);
    expect(activeName).toBe(resultNames[1]);

    await searchInput.press('ArrowUp');
    activeName = await page.evaluate(() => document.querySelector('#itemSearchResults li.active')?.dataset.name);
    expect(activeName).toBe(resultNames[0]);

    // 9. Enter selects the highlighted item into the bin
    await searchInput.press('Enter');
    const selectedNames = await page.$$eval('#selectedItemsBin .item-pill', els => els.map(e => e.textContent.trim()));
    expect(selectedNames.some(n => n.includes(resultNames[0]))).toBeTruthy();

    // Dropdown closed + input cleared after selection
    const dropdownHidden = await page.evaluate(() => document.getElementById('itemSearchResults').style.display === 'none');
    expect(dropdownHidden).toBeTruthy();
    expect(await searchInput.inputValue()).toBe('');

    // 10. Escape closes the dropdown
    await searchInput.fill('sword');
    await page.waitForSelector('#itemSearchResults li[data-uuid]', { timeout: 15000 });
    await searchInput.press('Escape');
    const hiddenAfterEsc = await page.evaluate(() => document.getElementById('itemSearchResults').style.display === 'none');
    expect(hiddenAfterEsc).toBeTruthy();

    console.log('Keyboard navigation assertions complete.');
  });
});
