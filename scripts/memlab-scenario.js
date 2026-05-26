// scripts/memlab-scenario.js

function url() {
  const baseUrl = process.env.APP_BASE_URL || process.env.TEST_HOST || 'http://127.0.0.1:3000';
  return new URL('/app/atividades', baseUrl).toString();
}

async function action(page) {
  await page.waitForSelector('[aria-roledescription="atividade arrastável"]', { timeout: 15000 });
  await page.click('[aria-roledescription="atividade arrastável"]');
  await page.waitForSelector('#activity-details-title', { timeout: 15000 });
}

async function back(page) {
  try {
    await page.click('button[aria-label="Fechar"]');
    await page.waitForSelector('#activity-details-title', { hidden: true, timeout: 15000 });
  } catch (error) {
    throw new Error(`Failed to close the drawer or wait for it to hide: ${error.message}`);
  }
}

module.exports = { url, action, back };
