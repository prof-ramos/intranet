// scripts/memlab-scenario.js

function url() {
  const baseUrl = process.env.APP_BASE_URL || process.env.TEST_HOST || 'http://127.0.0.1:3000';
  return new URL('/app/atividades', baseUrl).toString();
}

async function action(page) {
  try {
    console.log('--- memlab action start ---');
    console.log('Waiting for draggable card selector...');
    await page.waitForSelector('[aria-roledescription="atividade arrastável"]', { timeout: 15000 });
    console.log('Clicking the draggable card...');
    await page.click('[aria-roledescription="atividade arrastável"]');
    console.log('Waiting for activity details title selector (#activity-details-title)...');
    await page.waitForSelector('#activity-details-title', { timeout: 15000 });
    console.log('--- memlab action completed successfully ---');
  } catch (error) {
    console.error('--- memlab action failed ---');
    console.error(error.message);
    throw error;
  }
}

async function back(page) {
  try {
    console.log('--- memlab back start ---');
    console.log('Clicking close button...');
    await page.click('button[aria-label="Fechar"]');
    console.log('Waiting for activity details title selector to hide...');
    await page.waitForSelector('#activity-details-title', { hidden: true, timeout: 15000 });
    console.log('--- memlab back completed successfully ---');
  } catch (error) {
    console.error('--- memlab back failed ---');
    console.error(error.message);
    throw new Error(`Failed to close the drawer or wait for it to hide: ${error.message}`, {
      cause: error,
    });
  }
}

module.exports = { url, action, back };
