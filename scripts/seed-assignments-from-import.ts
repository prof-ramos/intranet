import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL deve estar definida.');
}

const sql = postgres(databaseUrl, { max: 1, prepare: false });

const EXTERIOR_OVERRIDES = new Set([
  'ROSEAU - EMBAIXADA DO BRASIL',
  'DELEGAÇÃO PERMANENTE DO BRASIL JUNTO À ALADI E AO MERCOSUL EM MONTEVIDÉU',
  'EFNY - ESCRITÓRIO FINANCEIRO EM NOVA YORK',
]);

const EXTERIOR_PREFIXES = [
  'FARO- CONSULADO',
  'CANTÃO- CONSULADO',
];

// Nacional: administrative statuses, MRE departments in Brasília, Brazil-based offices
const NACIONAL_KEYWORDS = [
  'APOSENTADO', 'INATIVO', 'EXONERAÇÃO', 'VACÂNCIA', 'FALECIDO', 'CEDID',
  'LICENÇA', 'LIP',
  'SERE', 'SG -', 'SGEC', 'SGEF', 'SGEX', 'SGASP', 'SOMEA', 'SALC', 'SAOM', 'SECC', 'SECLIMA', 'SPD',
  'DA -', 'DAEX -', 'DAI -', 'DAC -', 'DADF -', 'DAMC -', 'DASSO',
  'DCED', 'DCT', 'DDEFS', 'DEAF', 'DECN', 'DEIR', 'DHS',
  'DELP -', 'DIM -', 'DLP -', 'DOC -', 'DSG -', 'DTIC -',
  'DEMA -', 'DMR -', 'DMSUL', 'DOI -', 'DSE -',
  'CG', 'COF -', 'CLC -', 'CPAT', 'CPLAN', 'CSF',
  'ABC -', 'AFEPA', 'AIG',
  'C - CERIMONIAL', 'G – GABINETE', 'PRESREP', 'SENADO', 'CAMDDEP',
  'EREMINAS', 'ERENE', 'EREPAR', 'ERERIO', 'ERESC', 'ERESP', 'ERESUL',
  'IRBR', 'IGR',
  'OUVSE', 'ISEX', 'COR', 'CAT', 'SCL', 'SECONT', 'SEGEST', 'SJP', 'SLP',
  'CONJUR', 'CISET',
  'CGEV', 'CGG', 'CGLC', 'CGLEG', 'CGPC', 'CGPH', 'CGPI', 'CGPL', 'CGPLAN', 'CGPR',
  'DPAG', 'DPG', 'DTA', 'DCA', 'DCCOM', 'DCIN', 'DCIT', 'DCJI', 'DDAC', 'DDH',
  'DECEO', 'DIMP', 'DINC', 'DINFOR', 'DIPS', 'DISI', 'DLI', 'DLOG',
  'DMC -', 'DMS -', 'DNS -', 'DNU', 'DP -', 'DPAN',
];

function classify(assignment: string): 'nacional' | 'exterior' {
  const upper = assignment.toUpperCase().trim();
  if (!upper || upper === '-' || upper === '') return 'nacional';

  // Explicit overrides
  if (EXTERIOR_OVERRIDES.has(upper)) return 'exterior';
  for (const prefix of EXTERIOR_PREFIXES) {
    if (upper.startsWith(prefix)) return 'exterior';
  }

  for (const kw of NACIONAL_KEYWORDS) {
    if (upper.startsWith(kw)) return 'nacional';
  }

  // Escritórios de representação no Brasil
  if (upper.startsWith('ERES') || upper.startsWith('EREP') || upper.startsWith('ERE ')) return 'nacional';

  // Presença de "EMBAIXADA", "CONSULADO", "MISSÃO", "DELEGAÇÃO", "ESCRITÓRIO" + cidade estrangeira → exterior
  const hasPostType = /EMBAIXADA|CONSULADO|MISSÃO|DELEGAÇÃO|ESCRITÓRIO|POSTO|VICE-CONSULADO/.test(upper);
  const hasBrazilRef = /SERE|BRASÍLIA|ITAMARATY/.test(upper);

  if (hasPostType) {
    // "CITY - EMBAIXADA", "CITY - CONSULADO-GERAL"
    if (/ - /.test(upper) && !hasBrazilRef) return 'exterior';
    // "CONSULADO-GERAL EM CITY" without BRASIL ref
    if (/EM\s+[A-ZÀ-Ü]/.test(upper) && !hasBrazilRef && !upper.includes('DO BRASIL')) return 'exterior';
    // Without separator: "NOUAKCHOTT EMBAIXADA"
    if (/^(?:NOUAKCHOTT|ROSEAU)\s+EMBAIXADA/.test(upper)) return 'exterior';
    // "DELEGAÇÃO PERMANENTE DO BRASIL JUNTO À ALADI E AO MERCOSUL EM MONTEVIDÉU"
    if (upper.includes('EM MONTEVIDÉU') || upper.includes('EM GENEBRA') || upper.includes('NOVA YORK')) return 'exterior';
  }

  // International organizations abroad
  const intlOrgs = ['BID -', 'ONUBRMS', 'OMCBRMS', 'DELBRAS', 'CPLBRMS', 'BRASALADI',
    'FAO -', 'DELBRASAIEA', 'DELBRASUPA'];
  for (const org of intlOrgs) {
    if (upper.includes(org)) return 'exterior';
  }

  // Nova York / Washington are always exterior posts
  if (upper.startsWith('NOVA YORK') || upper.startsWith('WASHINGTON')) return 'exterior';

  // Default: " - " separator with no nacional prefix → exterior
  if (/ - /.test(upper) && !hasBrazilRef) return 'exterior';

  return 'nacional';
}

async function main() {
  try {
    const shouldApply = process.argv.includes('--apply');

    const rows: { assignment: string }[] = await sql`
      SELECT DISTINCT assignment FROM associates
      WHERE assignment IS NOT NULL AND assignment != ''
      ORDER BY assignment
    `;

    const assignments = rows
      .map((r) => ({
        name: r.assignment,
        type: classify(r.assignment),
      }))
      .filter((a) => a.name !== '-' && a.name.trim() !== '');

    const nacional = assignments.filter((a) => a.type === 'nacional');
    const exterior = assignments.filter((a) => a.type === 'exterior');
    console.log(`Total: ${assignments.length} unique assignments (${nacional.length} nacional, ${exterior.length} exterior)\n`);

    if (shouldApply) {
      const existing = await sql<{ name: string }[]>`SELECT name FROM assignments`;
      const existingNames = new Set(existing.map((r) => r.name));

      const toInsert = assignments.filter((a) => !existingNames.has(a.name));
      if (toInsert.length === 0) {
        console.log('Nenhuma lotação nova para inserir.');
        return;
      }

      console.log(`Inserindo ${toInsert.length} lotações...\n`);

      const BATCH = 50;
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH);
        await sql.begin(async (tx) => {
          await tx`INSERT INTO assignments ${tx(batch, 'name', 'type')} ON CONFLICT DO NOTHING`;
        });
        console.log(`  Lote ${Math.floor(i / BATCH) + 1}/${Math.ceil(toInsert.length / BATCH)}`);
      }

      console.log(`\nInseridas ${toInsert.length} lotações.`);
    } else {
      console.log('=== NACIONAL ===');
      for (const a of nacional) console.log(`  ${a.type}\t${a.name}`);
      console.log('\n=== EXTERIOR ===');
      for (const a of exterior) console.log(`  ${a.type}\t${a.name}`);
      console.log(`\nDry-run concluído. Execute com --apply para gravar no banco.`);
    }
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
