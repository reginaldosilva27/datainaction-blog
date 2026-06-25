# data/in/action

Blog **DataInAction** — engenharia de dados na prática, por Reginaldo Silva.

Site estático construído com [Astro](https://astro.build), hospedado no GitHub Pages
em **[datainaction.dev](https://datainaction.dev)**.

## Estrutura

```
.
├─ .github/workflows/deploy.yml   # build + deploy automático no GitHub Pages
└─ site/                          # projeto Astro
   ├─ astro.config.mjs
   ├─ public/
   │  ├─ CNAME                    # domínio próprio (datainaction.dev)
   │  └─ images/                  # imagens dos posts (versionadas)
   └─ src/
      ├─ data/posts.json          # conteúdo dos posts (versionado)
      ├─ layouts/Base.astro       # layout base (header, footer, transições)
      ├─ pages/
      │  ├─ index.astro           # arquivo / lista de posts
      │  └─ blog/[slug].astro     # página de cada post
      └─ styles/global.css
```

Os posts vivem em `site/src/data/posts.json` e as imagens em `site/public/images/`.
Ambos são versionados — o deploy só roda `astro build`, sem gerar esses arquivos.

## Desenvolvimento

```bash
cd site
npm install
npm run dev      # servidor local em http://localhost:4321
```

Outros comandos:

```bash
npm run build    # gera o site estático em site/dist/
npm run preview  # serve o build localmente
```

## Deploy

O deploy é automático: todo push na branch `main` dispara o workflow
`.github/workflows/deploy.yml`, que faz o `astro build` da pasta `site/` e
publica no GitHub Pages. Também pode ser disparado manualmente via
*workflow_dispatch*.

O domínio próprio é configurado pelo arquivo `site/public/CNAME`.
