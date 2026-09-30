import { chromium } from '@playwright/test';
import { bootFoundry } from './helpers/foundry.js';
import { sweepResidue } from './helpers/sweep.js';

// Once per run: log in and delete what earlier (aborted) runs left in the test world.
export default async function globalSetup() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await bootFoundry(page);
    console.log('[global-setup] residue swept:', JSON.stringify(await sweepResidue(page)));
  } finally {
    await browser.close();
  }
}
