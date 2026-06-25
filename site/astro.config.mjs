import { defineConfig } from 'astro/config';

// Em domínio próprio o site serve na raiz, então base = '/'.
// Se for publicar SEM domínio (em https://usuario.github.io/repo/), troque para base: '/repo/'.
export default defineConfig({
  site: 'https://datainaction.dev',
  base: '/',
  output: 'static',
});
