/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navegando para /app...');
  await page.goto('http://127.0.0.1:3000/app', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  
  const client = await page.context().newCDPSession(page);
  
  console.log('Capturando baseline.heapsnapshot...');
  await captureSnapshot(client, 'baseline.heapsnapshot');

  const routes = [
    '/app/secretaria/oficios',
    '/app/secretaria/emails/gerar',
    '/app/diretoria',
    '/app/admin/pessoas',
    '/app'
  ];

  for (const route of routes) {
    console.log(`Navegando para ${route}...`);
    try {
      await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log(`Erro ao navegar para ${route}: ${e.message}`);
    }
  }

  console.log('Forçando Garbage Collection...');
  await client.send('HeapProfiler.collectGarbage');
  await page.waitForTimeout(2000);

  console.log('Capturando target.heapsnapshot...');
  await captureSnapshot(client, 'target.heapsnapshot');

  await browser.close();
  console.log('Concluído.');
})();

async function captureSnapshot(client, filename) {
  const writeStream = fs.createWriteStream(filename);
  client.on('HeapProfiler.addHeapSnapshotChunk', (m) => {
    writeStream.write(m.chunk);
  });
  await client.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  writeStream.end();
  await new Promise(resolve => writeStream.on('finish', resolve));
}
