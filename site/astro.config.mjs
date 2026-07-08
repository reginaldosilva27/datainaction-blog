import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Integração SÓ-DE-DEV: endpoint POST /__edit que grava a edição inline de volta
// no JSON do post. O hook astro:server:setup só dispara em `astro dev`, então
// isto NUNCA existe no build de produção (`astro build` ignora este hook).
function inlineEditor() {
  const postsDir = fileURLToPath(new URL('./src/data/posts/', import.meta.url));
  return {
    name: 'inline-editor',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use('/__edit', (req, res) => {
          if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
          let raw = '';
          req.on('data', (c) => (raw += c));
          req.on('end', () => {
            const done = (code, obj) => {
              res.statusCode = code;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(obj));
            };
            try {
              const { slug, field, html } = JSON.parse(raw);
              if (!['html', 'html_en'].includes(field)) return done(400, { error: 'campo inválido' });
              if (typeof slug !== 'string' || !/^[\wÀ-ſ-]+$/.test(slug))
                return done(400, { error: 'slug inválido' });
              const file = postsDir + slug + '.json';
              if (!existsSync(file)) return done(404, { error: 'post não encontrado' });
              const post = JSON.parse(readFileSync(file, 'utf8'));
              // reforço: garante caminho relativo das imagens no fonte
              post[field] = String(html).replaceAll('src="/images/', 'src="images/');
              writeFileSync(file, JSON.stringify(post, null, 2) + '\n', 'utf8');
              done(200, { ok: true });
            } catch (e) {
              done(500, { error: e.message });
            }
          });
        });
      },
    },
  };
}

// Em domínio próprio o site serve na raiz, então base = '/'.
// Se for publicar SEM domínio (em https://usuario.github.io/repo/), troque para base: '/repo/'.
export default defineConfig({
  site: 'https://datainaction.dev',
  base: '/',
  output: 'static',
  // Gera sitemap-index.xml + sitemap-0.xml no build (só das páginas que existem,
  // então posts agendados por publishAt ficam de fora até serem publicados).
  // filter: tira do sitemap as páginas de redirect das URLs antigas do Wix
  // (/post/<slug> e /en/post/<slug> -> /blog/<slug>/); elas são noindex e não
  // devem ser anunciadas pro Google (senão viram "Page with redirect").
  integrations: [sitemap({ filter: (page) => !page.includes('/post/') }), inlineEditor()],
});
