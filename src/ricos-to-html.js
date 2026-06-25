// Renderizador simples Ricos (rich content do Wix) -> HTML.
// Uso:  node src/ricos-to-html.js [indiceDoPost]   (default: post com mais imagens)
// Também exporta render()/postToHtml()/mediaUrl() para o build-site.js reaproveitar.
import { readFile, writeFile } from 'node:fs/promises';

export function esc(s = '') {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function mediaUrl(src = {}) {
  if (src.url) return src.url.split('#')[0];
  if (src.id) return `https://static.wixstatic.com/media/${src.id}`;
  return '';
}

// Aplica decorações (negrito, link, cor, etc.) a um nó TEXT.
function renderText(node) {
  let text = esc(node.textData?.text ?? '');
  const decos = node.textData?.decorations ?? [];
  let pre = '', post = '';
  let style = '';
  for (const d of decos) {
    if (d.type === 'BOLD') { pre = '<strong>' + pre; post += '</strong>'; }
    else if (d.type === 'ITALIC') { pre = '<em>' + pre; post += '</em>'; }
    else if (d.type === 'UNDERLINE') { pre = '<u>' + pre; post += '</u>'; }
    else if (d.type === 'COLOR' && d.colorData?.foreground) { style += `color:${d.colorData.foreground};`; }
    else if (d.type === 'LINK' && d.linkData?.link?.url) {
      const u = esc(d.linkData.link.url);
      pre = `<a href="${u}" target="_blank" rel="noopener">` + pre;
      post += '</a>';
    }
  }
  if (style) { pre = `<span style="${style}">` + pre; post += '</span>'; }
  return pre + text + post;
}

function renderInline(nodes = []) {
  return nodes.map((n) => (n.type === 'TEXT' ? renderText(n) : render(n))).join('');
}

export function render(node) {
  switch (node.type) {
    case 'PARAGRAPH':
      return `<p>${renderInline(node.nodes)}</p>`;
    case 'HEADING': {
      const lvl = node.headingData?.level ?? 2;
      return `<h${lvl}>${renderInline(node.nodes)}</h${lvl}>`;
    }
    case 'TEXT':
      return renderText(node);
    case 'IMAGE': {
      const src = node.imageData?.image?.src ?? {};
      const url = mediaUrl(src);
      const alt = esc(node.imageData?.altText ?? '');
      const cap = node.imageData?.caption ? `<figcaption>${esc(node.imageData.caption)}</figcaption>` : '';
      return `<figure><img src="${url}" alt="${alt}" loading="lazy">${cap}</figure>`;
    }
    case 'VIDEO': {
      const url = node.videoData?.video?.src?.url || node.videoData?.thumbnail?.src?.url || '';
      return url ? `<p><a href="${esc(url)}" target="_blank" rel="noopener">[vídeo]</a></p>` : '';
    }
    case 'CODE_BLOCK':
      return `<pre><code>${esc((node.nodes ?? []).map((n) => n.textData?.text ?? '').join(''))}</code></pre>`;
    case 'BLOCKQUOTE':
      return `<blockquote>${(node.nodes ?? []).map(render).join('')}</blockquote>`;
    case 'BULLETED_LIST':
      return `<ul>${(node.nodes ?? []).map(render).join('')}</ul>`;
    case 'ORDERED_LIST':
      return `<ol>${(node.nodes ?? []).map(render).join('')}</ol>`;
    case 'LIST_ITEM':
      return `<li>${(node.nodes ?? []).map(render).join('')}</li>`;
    case 'DIVIDER':
      return '<hr>';
    default:
      return (node.nodes ?? []).map(render).join('');
  }
}

export function postToHtml(post) {
  const body = (post.richContent?.nodes ?? []).map(render).join('\n');
  const cover = mediaUrl(post.media?.wixMedia?.image ?? {});
  const date = post.firstPublishedDate ? new Date(post.firstPublishedDate).toLocaleDateString('pt-BR') : '';
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(post.title)}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:780px;margin:40px auto;padding:0 20px;line-height:1.65;color:#1a1a1a}
  h1{font-size:2rem;line-height:1.2}
  img{max-width:100%;height:auto;border-radius:8px;display:block;margin:8px 0}
  figure{margin:24px 0}figcaption{font-size:.85rem;color:#666;text-align:center}
  pre{background:#0d1117;color:#e6edf3;padding:16px;border-radius:8px;overflow:auto;font-size:.85rem}
  blockquote{border-left:4px solid #ccc;margin:16px 0;padding:4px 16px;color:#555}
  .meta{color:#888;font-size:.9rem;margin-bottom:24px}
  hr{border:none;border-top:1px solid #eee;margin:24px 0}
</style></head>
<body>
<h1>${esc(post.title)}</h1>
<div class="meta">${date} · ${post.minutesToRead ?? '?'} min de leitura</div>
${cover ? `<img src="${cover}" alt="capa">` : ''}
${post.excerpt ? `<p><em>${esc(post.excerpt)}</em></p>` : ''}
<hr>
${body}
</body></html>`;
}

// ---- main (só quando executado diretamente) ----
if (process.argv[1] && process.argv[1].endsWith('ricos-to-html.js')) {
  const posts = JSON.parse(await readFile('./data/wix-posts.json', 'utf-8'));
  const arg = process.argv[2];
  let post;
  if (arg !== undefined) {
    post = posts[Number(arg)];
  } else {
    const count = (nodes, a = { n: 0 }) => { for (const x of nodes || []) { if (x.type === 'IMAGE') a.n++; if (x.nodes) count(x.nodes, a); } return a.n; };
    post = [...posts].sort((a, b) => count(b.richContent?.nodes) - count(a.richContent?.nodes))[0];
  }

  const html = postToHtml(post);
  const out = './data/preview-post.html';
  await writeFile(out, html, 'utf-8');
  console.log(`✅ "${post.title}"`);
  console.log(`   ${out}`);
}
