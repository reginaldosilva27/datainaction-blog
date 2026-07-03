import rss from '@astrojs/rss';
import posts from '../lib/posts.js';

// Feed RSS do blog. `posts` já respeita o agendamento (publishAt): no build de
// produção os posts com data futura ficam de fora, igual às páginas.
export function GET(context) {
  const site = context.site; // https://datainaction.dev/ (vem do astro.config)
  const sorted = [...posts].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  return rss({
    title: 'DataInAction · Dados e IA na prática',
    description:
      'Blog de Dados e Inteligência Artificial por Reginaldo Silva: Databricks, Azure, RAG, Agentes de IA e engenharia de dados na prática.',
    site,
    items: sorted.map((p) => ({
      title: p.title,
      description: p.excerpt ?? '',
      link: `/blog/${p.slug}/`,
      pubDate: p.date ? new Date(p.date) : undefined,
      categories: p.tags ?? [],
    })),
    customData: '<language>pt-br</language>',
  });
}
