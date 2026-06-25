// Deriva a categoria de um post a partir do título/slug.
// A ordem importa: a primeira regra que casar vence.

export const CATEGORIES = [
  { key: 'ia', label: 'IA & Agentes', color: '#a78bfa' },
  { key: 'delta', label: 'Delta Lake', color: '#34d399' },
  { key: 'databricks', label: 'Databricks', color: '#ff5e3a' },
  { key: 'azure', label: 'Azure & Cloud', color: '#38bdf8' },
  { key: 'carreira', label: 'Carreira & Geral', color: '#fbbf24' },
];

const RULES = [
  ['ia', /crew\s?ai|agent|\bia\b|\bai\b|english.?sdk|ai.?suggested|intelig|multiagent|\bllm\b|gpt|copilot/i],
  ['delta', /delta.?lake|delta.?rs|delta.?table|replacewhere|deletion.?vector|time.?travel|change.?data.?feed|nunca.?mais.?leia.?parquet/i],
  ['databricks', /databricks|unity.?catalog|dbutils|dbfs|spark|workflow|cluster|photon|lakehouse|system.?table|metastore|vacuum|notebook|sql.?warehouse|dtstools/i],
  ['azure', /azure|azcopy|\bcloud\b|\bgcp\b|\baws\b|logic.?app|function|storage.?account/i],
];

export function categoryOf(post) {
  const hay = `${post.title ?? ''} ${post.slug ?? ''} ${(post.tags ?? []).join(' ')}`;
  for (const [key, re] of RULES) if (re.test(hay)) return key;
  return 'carreira';
}

export function categoryMeta(key) {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}
