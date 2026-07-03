import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Em domínio próprio o site serve na raiz, então base = '/'.
// Se for publicar SEM domínio (em https://usuario.github.io/repo/), troque para base: '/repo/'.
export default defineConfig({
  site: 'https://datainaction.dev',
  base: '/',
  output: 'static',
  // Gera sitemap-index.xml + sitemap-0.xml no build (só das páginas que existem,
  // então posts agendados por publishAt ficam de fora até serem publicados).
  integrations: [sitemap()],
});
