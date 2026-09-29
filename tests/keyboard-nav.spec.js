import { test, expect } from '@playwright/test';

async function boot(page) {
  await page.goto('http://localhost:30000');
  await page.waitForSelector('select[name="userid"]', { timeout: 15000 });
  await page.selectOption('select[name="userid"]', { label: 'Gamemaster' });
  await page.click('button[name="join"]');
  await page.waitForNavigation({ timeout: 20000 });
  await page.waitForSelector('#ui-middle', { timeout: 30000 });
  await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 60000 });
  await page.waitForTimeout(2000);
  // Headless has no GPU: Foundry pins a permanent warning over the top of the screen.
  await page.evaluate(() => document.querySelectorAll("#notifications li").forEach(n => n.remove()));
}

async function openBuilder(page) {
  await page.evaluate(async () => {
    const { EffectCreatorApp } = await import("./modules/forge-char-creator/scripts/effect-creator.js");
    await new EffectCreatorApp().render(true);
  });
  await page.waitForSelector('.forge-effect-creator .fc-step.active');
  return page.locator('.forge-effect-creator');
}

async function closeForgeApps(page) {
  await page.evaluate(() => {
    for (const a of [...foundry.applications.instances.values()]) if (a.id?.startsWith("forge-")) a.close();
  });
}

test.describe('Keyboard navigation', () => {
  test.setTimeout(120000);

  test('builder: Alt+arrows walk steps, Ctrl+arrow still edits text, Alt+digit jumps', async ({ page }) => {
    await boot(page);
    const root = await openBuilder(page);
    await root.locator("[name='kind'][value='attack']").check();
    const active = () => root.locator(".fc-step.active").getAttribute("data-step");
    expect(await active()).toBe("basics");

    await root.locator("[data-ef='name']").click();
    await page.keyboard.type("Claw");
    await page.keyboard.press("Control+ArrowLeft");   // word jump inside the field, not a step
    expect(await active()).toBe("basics");

    await page.keyboard.press("Alt+ArrowRight");
    expect(await active()).toBe("attack");
    await expect(root.locator("[data-ef='attackType']")).toBeFocused();

    await page.keyboard.press("Alt+ArrowRight");      // save step hidden without the on-hit save
    expect(await active()).toBe("effects");

    await page.keyboard.press("Alt+1");
    expect(await active()).toBe("basics");
    await expect(root.locator(".fc-nav-btn[aria-current='step']")).toHaveText(/1\. Basics/);

    await root.locator(".fc-nav-btn", { hasText: "Review" }).click();
    expect(await active()).toBe("review");
    await closeForgeApps(page);
  });

  test('builder: Ctrl+Enter creates', async ({ page }) => {
    await boot(page);
    const root = await openBuilder(page);
    await root.locator("[name='kind'][value='passive']").check();
    const name = root.locator("[data-ef='name']");
    await name.fill("KB Create E2E");
    await name.dispatchEvent("change");
    const created = page.evaluate(() => new Promise((res, rej) => {
      const h = Hooks.on("createItem", i => {
        if (i.name !== "KB Create E2E") return;
        Hooks.off("createItem", h);
        const uuid = i.uuid;
        i.delete().then(() => res(uuid));
      });
      setTimeout(() => rej(new Error("no createItem")), 20000);
    }));
    await name.focus();
    await page.keyboard.press("Control+Enter");
    expect(await created).toContain("Item.");
    await closeForgeApps(page);
  });

  test('char wizard: steps, Alt+digit, Esc closes search without stepping', async ({ page }) => {
    await boot(page);
    await page.evaluate(async () => {
      const { CharCreatorApp } = await import("./modules/forge-char-creator/scripts/app.js");
      await new CharCreatorApp().render({ force: true });
    });
    const root = page.locator("#forge-char-creator-app");
    await page.waitForSelector("#forge-char-creator-app .fc-step.active");
    const active = () => root.locator(".fc-step.active").getAttribute("data-step");
    expect(await active()).toBe("identity");
    await expect(root.locator("#charName")).toBeFocused();

    await page.keyboard.press("Alt+3");
    expect(await active()).toBe("features");
    await expect(root.locator("#itemSearchQuery")).toBeFocused();

    await page.keyboard.type("fire");
    await page.waitForSelector("#itemSearchResults li[data-uuid]", { timeout: 15000 });
    await page.keyboard.press("Escape");
    await expect(root.locator("#itemSearchResults")).toBeHidden();
    await expect(root).toBeVisible();                   // Esc closed the dropdown, not the window
    expect(await active()).toBe("features");

    await page.keyboard.press("Alt+ArrowLeft");
    expect(await active()).toBe("stats");
    await closeForgeApps(page);
  });
});
