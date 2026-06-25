// Exporta TODOS os blog posts do Wix para um arquivo JSON local (./data/wix-posts.json).
// Rode primeiro este script; depois o migrate-firebase.js.
//
//   npm run export
//
import 'dotenv/config';
import { writeFile, mkdir } from 'node:fs/promises';

const API_KEY = process.env.WIX_API_KEY;
const SITE_ID = process.env.WIX_SITE_ID;
const ACCOUNT_ID = process.env.WIX_ACCOUNT_ID;

const QUERY_URL = 'https://www.wixapis.com/blog/v3/posts/query';
const PAGE_SIZE = 100; // limite máximo do endpoint de query

function assertEnv() {
  const missing = [];
  if (!API_KEY) missing.push('WIX_API_KEY');
  if (!SITE_ID) missing.push('WIX_SITE_ID');
  if (missing.length) {
    console.error(`\n❌ Faltam variáveis no .env: ${missing.join(', ')}`);
    console.error('   Copie .env.example para .env e preencha.\n');
    process.exit(1);
  }
}

function headers() {
  const h = {
    Authorization: API_KEY,
    'wix-site-id': SITE_ID,
    'Content-Type': 'application/json',
  };
  if (ACCOUNT_ID) h['wix-account-id'] = ACCOUNT_ID;
  return h;
}

async function queryPage(offset) {
  const body = {
    paging: { limit: PAGE_SIZE, offset },
    // RICH_CONTENT = corpo do post (Ricos JSON, onde estão as imagens)
    // CONTENT_TEXT = texto plano; URL = url pública do post
    fieldsets: ['RICH_CONTENT', 'URL', 'CONTENT_TEXT'],
  };

  const res = await fetch(QUERY_URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wix API ${res.status} ${res.statusText}\n${text}`);
  }
  return res.json();
}

async function main() {
  assertEnv();
  console.log('🔎 Buscando posts no Wix...');

  const all = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const data = await queryPage(offset);
    const posts = data.posts ?? [];
    all.push(...posts);

    // metadata.total quando disponível; senão paramos quando vier menos que PAGE_SIZE
    total = data.metaData?.total ?? data.pagingMetadata?.total ?? (posts.length < PAGE_SIZE ? all.length : Infinity);

    console.log(`   ↳ ${all.length} posts coletados (offset ${offset})`);
    if (posts.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  await mkdir('./data', { recursive: true });
  const out = './data/wix-posts.json';
  await writeFile(out, JSON.stringify(all, null, 2), 'utf-8');

  console.log(`\n✅ ${all.length} posts exportados para ${out}`);
  if (all.length) {
    const p = all[0];
    console.log(`   Exemplo: "${p.title}" (id ${p.id})`);
  }
}

main().catch((err) => {
  console.error('\n💥 Erro na exportação:\n', err.message);
  process.exit(1);
});
