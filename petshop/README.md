# Pata Amiga Petshop — Fase 1

Sistema web (front-end) de um petshop, desenvolvido para a **Fase 1** do Projeto da disciplina
**Fundamentos de Sistemas Web** — PUCRS.

Autor: **Wilson Oliveira Lima**

## Escopo da Fase 1

Conforme o enunciado, as páginas foram construídas **somente com HTML**:

- sem CSS e sem Bootstrap;
- sem JavaScript (previsto para a Fase 2);
- estrutura semântica com `header`, `nav`, `main`, `section`, `article`, `figure`, `table` e `footer`.

## Estrutura de arquivos

```
petshop/
├── public/              # site publicado (raiz do servidor de arquivos estáticos)
│   ├── index.html       # página inicial, com destaques de cada categoria
│   ├── acessorios.html  # 2 produtos: malha de tricô e kit de bolinhas
│   ├── racoes.html      # 2 produtos: ração para cães e ração para gatos
│   ├── higiene.html     # 2 produtos: shampoo e areia sanitária
│   ├── servicos.html    # banho e tosa, com e sem tele-busca (tabelas de preço)
│   ├── contato.html     # dados de contato e formulário HTML
│   ├── ajuda.html       # arquivo de ajuda: funcionalidades e créditos das imagens
│   ├── 404.html         # página de erro
│   └── img/             # fotografias dos produtos e logotipo (SVG)
├── wrangler.jsonc       # configuração de hospedagem no Cloudflare Workers
└── README.md
```

## Requisitos atendidos

| Requisito do enunciado | Onde está |
| --- | --- |
| Cabeçalho com informações do petshop e links de navegação | topo de todas as páginas |
| Dois produtos de cada uma das 3 categorias (foto, descrição, valor) | `acessorios.html`, `racoes.html`, `higiene.html` |
| Serviços com descrição, valor e opção de tele-busca | `servicos.html` |
| Rodapé com autoria, contato e links | fim de todas as páginas |
| Arquivo de ajuda descrevendo as funcionalidades | `ajuda.html` |

## Como executar localmente

Basta abrir `public/index.html` no navegador. Para simular o servidor:

```bash
npx wrangler dev
```

## Publicação (Cloudflare Workers — Static Assets)

O site é publicado como *Worker* de assets estáticos:

```bash
npm install -g wrangler   # ou use npx
npx wrangler login        # autenticação na conta Cloudflare
npx wrangler deploy       # publica o conteúdo de ./public
```

O endereço público fica no formato `https://pata-amiga-petshop.<subdominio>.workers.dev`.

## Créditos das imagens

As fotografias são de terceiros (Wikimedia Commons e Flickr), sob licenças Creative Commons ou em
domínio público; a tabela completa de autoria e licenças está em `public/ajuda.html`.
O logotipo (`public/img/logo.svg`) foi criado pelo autor.

Empresa, endereço, CNPJ e preços apresentados no site são fictícios, com finalidade didática.
