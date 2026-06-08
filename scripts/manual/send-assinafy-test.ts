import { db } from '../../src/lib/db';
import { oficios } from '../../src/lib/db/schema/oficios';
import { sendForSignature } from '../../src/lib/oficios/service';
import { admins } from '../../src/lib/db/schema/admins';

async function main() {
  console.log('Fetching an admin user...');
  const [admin] = await db.select({ id: admins.id }).from(admins).limit(1);
  if (!admin) throw new Error('No admins found in the database');

  console.log('Inserting test oficio...');
  const [newOficio] = await db.insert(oficios).values({
    number: 'Ofício nº 125/2026/ASOF',
    year: 2026,
    sequence: 125,
    recipient: 'Ao Senhor FULANO DE TAL',
    recipientRole: 'Ministro de Estado das Relações Exteriores',
    recipientAddress: 'Esplanada dos Ministérios, Bloco H',
    recipientCity: 'Brasília/DF',
    recipientZip: 'CEP 70170-900',
    vocativo: 'Senhor Ministro,',
    letterDate: '08/06/2026',
    subject: 'Solicitação de adequação de sistemas corporativos.',
    itamaratySector: 'Ministério das Relações Exteriores',
    signatoryName: 'BELTRANO DA SILVA',
    signatoryRole: 'Presidente da ASOF',
    closure: 'Respeitosamente,',
    bodyPlainText: 'Temos a honra de nos dirigir a Vossa Excelência para solicitar providências quanto à adequação dos sistemas corporativos internos.\n\nA modernização dos sistemas é essencial para a eficiência administrativa do Ministério das Relações Exteriores, de modo a assegurar o cumprimento adequado das metas institucionais.',
    bodyRichText: '<p>Temos a honra de nos dirigir a Vossa Excelência para solicitar providências quanto à adequação dos sistemas corporativos internos.</p><p>A modernização dos sistemas é essencial para a eficiência administrativa do Ministério das Relações Exteriores, de modo a assegurar o cumprimento adequado das metas institucionais.</p>',
    status: 'gerado',
    createdBy: admin.id,
  }).returning();

  console.log(`Sending Ofício ID: ${newOficio.id} to Assinafy...`);

  const result = await sendForSignature(newOficio.id, 'gabrielgfcramos2@gmail.com', admin.id);
  if (result.success) {
    console.log('Success! Signature URL:', result.data.assinafySigningUrl);
  } else {
    console.error('Failed:', result.error);
  }
}

main().catch(console.error).finally(() => process.exit(0));
