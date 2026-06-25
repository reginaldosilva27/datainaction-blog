# Migração Blog Wix → Firebase

Exporta todos os blog posts do Wix (via API) e migra para Firebase (Firestore + Storage),
re-hospedando as imagens e trocando as URLs no conteúdo.

## Fluxo

1. `npm run export`  → busca paginada no Wix, salva `data/wix-posts.json`
2. `npm run migrate` → baixa imagens, sobe no Storage, grava posts no Firestore
3. `npm run all`     → faz os dois em sequência

## Setup

```bash
npm install
cp .env.example .env   # preencha os valores
```

### Wix
- `WIX_API_KEY` — token que **você** gera em *Conta → Chaves de API → Gerar chave de API*
  (permissões de **Blog → Read**; e **Media Manager** se quiser garantir acesso às mídias).
- `WIX_SITE_ID` — **Site ID** (não confunda com o "ID da conta"). É o GUID do site na URL do dashboard.

### Firebase
- `GOOGLE_APPLICATION_CREDENTIALS` — caminho do JSON de service account
  (*Console Firebase → Configurações do projeto → Contas de serviço → Gerar nova chave privada*).
- `FIREBASE_STORAGE_BUCKET` — ex.: `meu-projeto.appspot.com` ou `meu-projeto.firebasestorage.app`.

## Observações
- O `migrate` é **idempotente**: usa `doc(post.id).set(..., {merge:true})` e cacheia imagens já enviadas,
  então pode rodar de novo sem duplicar.
- Por padrão o `query` retorna apenas posts **publicados**. Rascunhos exigem outro endpoint/permissão.
- As imagens vão para o Storage como **públicas** (`makePublic`). Ajuste se quiser regras restritas.
