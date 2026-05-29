module.exports = {
  url: () => 'http://127.0.0.1:3000/app',
  setup: async (page) => {
    console.log('Aguardando compilação inicial do Next.js...');
    await page.waitForTimeout(10000);
  },
  action: async (page) => {
    console.log('Navegando para Secretaria > Ofícios');
    await page.goto('http://127.0.0.1:3000/app/secretaria/oficios', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    
    console.log('Navegando para Secretaria > E-mails');
    await page.goto('http://127.0.0.1:3000/app/secretaria/emails/gerar', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    
    console.log('Navegando para Diretoria');
    await page.goto('http://127.0.0.1:3000/app/diretoria', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    
    console.log('Navegando para Admin > Pessoas');
    await page.goto('http://127.0.0.1:3000/app/admin/pessoas', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
  },
  back: async (page) => {
    console.log('Retornando à página inicial...');
    await page.goto('http://127.0.0.1:3000/app', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
  },
};
