# Pata Amiga Petshop — Fases 1 e 2

Sistema web (front-end) de um petshop, desenvolvido para o Projeto da disciplina
**Fundamentos de Sistemas Web** — PUCRS.

Autor: **Wilson Oliveira Lima**

- Site publicado: <https://pata-amiga-petshop.tecwolf.workers.dev>
- Hospedagem: Cloudflare Workers (Static Assets), equivalente ao GitHub Pages.

## O que foi feito em cada fase

| Fase | Escopo |
| --- | --- |
| **Fase 1** | Estrutura das páginas somente com HTML: cabeçalho, menu, dois produtos de cada uma das três categorias, serviços com e sem tele-busca, rodapé e arquivo de ajuda. Sem CSS, sem Bootstrap e sem JavaScript. |
| **Fase 2** | Estilização com CSS próprio e Bootstrap 5.3 (carrossel, navbar responsiva, cartões, tabelas), funções em JavaScript (funções temporais, validações, busca, calculadora de preços), formulário de cadastro de cliente e pet, agendamento com calendário e recursos de acessibilidade. |

## Estrutura de arquivos

```
petshop/
├── public/                    # raiz publicada
│   ├── index.html             # página inicial com carrossel e destaques
│   ├── acessorios.html        # categoria: roupas e brinquedos
│   ├── racoes.html            # categoria: rações não perecíveis
│   ├── higiene.html           # categoria: higiene e limpeza
│   ├── servicos.html          # banho e tosa + simulador de preços
│   ├── cadastro.html          # formulário de cliente e pet
│   ├── agendamento.html       # escolha do serviço, calendário e tele-busca
│   ├── contato.html           # canais de atendimento e formulário
│   ├── ajuda.html             # funcionalidades, ajustes, acessibilidade e créditos
│   ├── 404.html               # página de erro
│   ├── css/estilo.css         # identidade visual e acessibilidade
│   ├── js/
│   │   ├── app.js             # relógio, situação da loja, acessibilidade, carrossel
│   │   ├── precos.js          # tabela de preços compartilhada
│   │   ├── formularios.js     # máscaras, validação de CPF e mensagens acessíveis
│   │   ├── cadastro.js        # formulário de cliente e pet
│   │   ├── agendamento.js     # calendário, horários e contagem regressiva
│   │   ├── produtos.js        # busca, ordenação e simulador de serviços
│   │   └── contato.js         # formulário de contato
│   ├── img/                   # fotografias dos produtos e logotipo (SVG)
│   └── vendor/bootstrap/      # Bootstrap 5.3.3 hospedado no próprio site
├── creditos-imagens.json      # autoria e licença das fotografias
├── wrangler.jsonc             # configuração de hospedagem
└── README.md
```

## Requisitos da Fase 2 e onde estão

| Requisito | Onde |
| --- | --- |
| CSS/Bootstrap e carrossel | `css/estilo.css`, `vendor/bootstrap/`, carrossel em `index.html` |
| JavaScript e funções temporais | `js/app.js` (relógio, saudação, loja aberta/fechada), `js/agendamento.js` (contagem regressiva) |
| Formulário de cadastro do cliente e do pet | `cadastro.html` + `js/cadastro.js` |
| Escolha do serviço e agendamento com calendário | `agendamento.html` + `js/agendamento.js` |
| Tele-busca ou entrega do pet no local | seção 4 do formulário de agendamento |
| Acessibilidade | descrito em `ajuda.html#acessibilidade` |

## Recursos de acessibilidade

- Textos alternativos (`alt`) com audiodescrição em todas as imagens.
- Modo de alto contraste e aumento de fonte (preferências salvas no navegador).
- Link “pular para o conteúdo principal” e foco visível reforçado.
- Regiões `aria-live` para mensagens de erro, confirmações e resultados de busca.
- Marcação semântica, `label` em todos os campos e tabelas com `caption` e `scope`.
- Respeito à preferência do sistema por menos animações (`prefers-reduced-motion`).

## Como executar localmente

```bash
# abrir diretamente
start petshop/public/index.html

# ou servir os arquivos (necessário para testar como em produção)
npx wrangler dev
```

## Publicação

```bash
npx wrangler login    # autenticação na conta Cloudflare
npx wrangler deploy   # publica o conteúdo de ./public
```

## Créditos das imagens

Fotografias de terceiros (Wikimedia Commons e Flickr) sob licenças Creative Commons ou em domínio
público; a tabela completa está em `public/ajuda.html#creditos` e em `creditos-imagens.json`.
O logotipo (`public/img/logo.svg`) foi criado pelo autor.

Empresa, endereço, CNPJ, telefones e preços apresentados no site são fictícios, com finalidade
didática.
