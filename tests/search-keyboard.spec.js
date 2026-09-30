import { test, expect } from './helpers/fixtures.js';
import { openWizard } from './helpers/foundry.js';

test.describe('Item Search Keyboard Navigation', () => {
  test.setTimeout(120000);

  test('Should navigate search results with arrow keys and select with Enter', async ({ gmPage: page }) => {


    // 5. Open Character Creator directly
    await openWizard(page); // first render can take >10 s (compendium indexes)
    await page.locator('.forge-char-creator .fc-nav-btn', { hasText: 'Features' }).click();

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
