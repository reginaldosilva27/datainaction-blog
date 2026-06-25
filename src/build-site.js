// Gera o conteúdo do site Astro a partir de data/wix-posts.json:
//   - renderiza o corpo (richContent) de cada post em HTML
//   - baixa todas as imagens do static.wixstatic.com para site/public/images/
//   - reescreve as URLs das imagens para caminhos locais ("images/...")
//   - grava site/src/data/posts.json
//
//   node src/build-site.js
//
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { render, mediaUrl } from './ricos-to-html.js';

const IMG_DIR = './site/public/images';
const DATA_OUT = './site/src/data/posts.json';
const CONCURRENCY = 12;

const WIX_RE = /https:\/\/static\.wixstatic\.com\/[a-zA-Z0-9~_.%\/-]+/g;

// Nome de arquivo local determinístico e único a partir da URL do Wix.
function localName(url) {
  const path = url.replace('https://static.wixstatic.com/', '').split('?')[0].split('#')[0];
  let name = path.replace(/[^a-zA-Z0-9.]/g, '_');
  if (!/\.[a-z0-9]{2,5}$/i.test(name)) name += '.png';
  return name;
}

// Baixa uma URL para IMG_DIR (pula se já existe). Retorna o caminho relativo "images/<file>".
async function fetchImage(url, stats) {
  const name = localName(url);
  const dest = `${IMG_DIR}/${name}`;
  const rel = `images/${name}`;
  if (existsSync(dest)) { stats.skipped++; return rel; }
  try {
    const res = await fetch(url.split('#')[0]);
    if (!res.ok) { stats.failed.push(`${res.status} ${url}`); return rel; }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
    stats.downloaded++;
    stats.bytes += buf.length;
  } catch (e) {
    stats.failed.push(`${e.message} ${url}`);
  }
  return rel;
}

// Pool de concorrência simples.
async function pool(items, worker, size) {
  const queue = [...items];
  const runners = Array.from({ length: size }, async () => {
    while (queue.length) await worker(queue.shift());
  });
  await Promise.all(runners);
}

async function main() {
  const posts = JSON.parse(await readFile('./data/wix-posts.json', 'utf-8'));
  await mkdir(IMG_DIR, { recursive: true });
  await mkdir('./site/src/data', { recursive: true });

  // 1) Renderiza HTML de cada post e coleta todas as URLs de imagem.
  const rendered = [];
  const allUrls = new Set();
  for (const post of posts) {
    let html = (post.richContent?.nodes ?? []).map(render).join('\n');
    const cover = mediaUrl(post.media?.wixMedia?.image ?? {});
    (html.match(WIX_RE) ?? []).forEach((u) => allUrls.add(u));
    if (cover) allUrls.add(cover);
    rendered.push({ post, html, cover });
  }
  console.log(`🖼️  ${allUrls.size} imagens únicas a baixar...`);

  // 2) Baixa todas as imagens.
  const stats = { downloaded: 0, skipped: 0, bytes: 0, failed: [] };
  const map = new Map(); // url -> caminho relativo
  await pool([...allUrls], async (url) => {
    const rel = await fetchImage(url, stats);
    map.set(url, rel);
    if ((stats.downloaded + stats.skipped) % 100 === 0)
      console.log(`   ↳ ${stats.downloaded + stats.skipped}/${allUrls.size}`);
  }, CONCURRENCY);

  console.log(`   baixadas: ${stats.downloaded} | já existiam: ${stats.skipped} | ${(stats.bytes / 1e6).toFixed(1)} MB`);
  if (stats.failed.length) console.warn(`   ⚠️  ${stats.failed.length} falharam (ex.: ${stats.failed[0]})`);

  // 3) Reescreve URLs para caminhos locais e monta o posts.json.
  const out = rendered.map(({ post, html, cover }) => {
    let body = html;
    for (const [url, rel] of map) body = body.replaceAll(url, rel);
    return {
      slug: post.slug,
      title: post.title ?? '',
      excerpt: post.excerpt ?? '',
      date: post.firstPublishedDate ?? null,
      minutesToRead: post.minutesToRead ?? null,
      tags: post.hashtags ?? [],
      cover: cover ? map.get(cover) : null,
      html: body,
    };
  });

  await writeFile(DATA_OUT, JSON.stringify(out, null, 2), 'utf-8');
  console.log(`\n✅ ${out.length} posts gravados em ${DATA_OUT}`);
}

main().catch((e) => { console.error('💥', e); process.exit(1); });
