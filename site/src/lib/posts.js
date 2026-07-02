// Fonte única de posts VISÍVEIS do site (respeita agendamento de publicação).
//
// Regra: um post está publicado se NÃO tem `publishAt`, ou se essa data/hora
// já chegou no momento do build. Como o site é estático, um post com
// `publishAt` no futuro é simplesmente removido do build — não gera página,
// card nem entra no HTML (não vaza por URL nem pro Google). Ele "brota"
// sozinho no build seguinte à data (o cron diário do deploy.yml garante isso).
//
// Use SEMPRE `posts` daqui no lugar de importar `data/posts.json` cru.
import all from '../data/posts.json';

export function isPublished(post, now = new Date()) {
  if (!post.publishAt) return true;
  return new Date(post.publishAt) <= now;
}

const now = new Date();

// Em DESENVOLVIMENTO (`npm run dev`) mostramos TODOS os posts, inclusive os
// agendados, pra você validar localmente antes da data. No build de produção
// (`npm run build` / GitHub Actions) o gate vale e os agendados ficam ocultos.
export const posts = import.meta.env.DEV ? all : all.filter((p) => isPublished(p, now));

// Só pra referência/debug: quantos estão agendados aguardando a data.
export const scheduled = all.filter((p) => !isPublished(p, now));

export default posts;
