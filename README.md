# data/in/action

**Fala dataholics!** Esse é o código por trás do [**datainaction.dev**](https://datainaction.dev), o meu blog de dados e IA, feito na prática.

Aqui eu compartilho tutoriais, experimentos e os bastidores do dia a dia de **Databricks, Delta Lake, Azure, Microsoft Foundry, Copilot, RAG e agentes de IA em produção**. Conteúdo direto ao ponto, do jeito que eu gosto: conceito, mão na massa e o "por que isso importa".

> Blog de dados e IA, por Reginaldo Silva.
> Site em [datainaction.dev](https://datainaction.dev) · YouTube [@dadosemacao](https://www.youtube.com/@dadosemacao) · [LinkedIn](https://www.linkedin.com/in/reginaldosilva27/)

## O que você encontra por aqui

- **Dados** · Databricks, Delta Lake, Apache Spark, Unity Catalog, Lakehouse, PySpark
- **IA & Agentes** · Agentes de IA, RAG, LangGraph, CrewAI, MCP, Copilot, AI Engineering
- **Cloud** · Azure, Azure AI Services, Microsoft Foundry, AWS, GCP

E no canal do YouTube tem os vídeos que acompanham vários posts, o **AI Agent Simulator** e os conteúdos de IA que mais bombaram. Dá uma passada lá.

## Como o site é feito

Nada de mágico por baixo: é um site estático em [**Astro**](https://astro.build), publicado no **GitHub Pages** com domínio próprio. Os posts são bilíngues (PT/EN, com seletor de idioma), e o conteúdo inteiro mora num JSON versionado, sem banco de dados nem CMS.

```
.
├─ .github/workflows/deploy.yml   # build + deploy automático no GitHub Pages
└─ site/                          # projeto Astro
   ├─ astro.config.mjs
   ├─ public/
   │  ├─ CNAME                    # domínio próprio (datainaction.dev)
   │  └─ images/                  # imagens dos posts (versionadas)
   └─ src/
      ├─ data/posts/              # 1 arquivo <slug>.json por post (versionado)
      ├─ layouts/Base.astro       # layout base (header, footer, transições, seletor PT/EN)
      ├─ pages/
      │  ├─ index.astro           # home / lista de posts
      │  └─ blog/[slug].astro     # página de cada post
      └─ styles/global.css
```

Os posts vivem em `site/src/data/posts/` (um arquivo `<slug>.json` por post) e as imagens em `site/public/images/`. Os dois são versionados, o deploy só roda `astro build` e não gera esses arquivos.

## Rodando localmente

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

O deploy é automático: todo push na branch `main` dispara o workflow `.github/workflows/deploy.yml`, que faz o `astro build` da pasta `site/` e publica no GitHub Pages. Dá pra disparar na mão também, via *workflow_dispatch*. O domínio próprio vem do arquivo `site/public/CNAME`.

## Sobre esse repositório

Esse é o repositório do meu **blog pessoal**, e ele está aberto de propósito. Não tem nada sensível aqui, é tudo conteúdo público que eu já publico no site, então resolvi deixar o código todo à mostra.

Pode reaproveitar o que quiser: a estrutura do site, o layout em Astro, o esquema dos arquivos de post em `src/data/posts/`, o pipeline de deploy no GitHub Pages, qualquer coisa. Se te ajudar a montar o seu próprio blog ou a estudar como isso funciona, já valeu a pena. Conteúdo **100% free e open**.

Se usar algo daqui e quiser trocar uma ideia, me chama no [LinkedIn](https://www.linkedin.com/in/reginaldosilva27/) ou comenta lá no [YouTube](https://www.youtube.com/@dadosemacao).

Fique bem e até a próxima.
