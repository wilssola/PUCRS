/**
 * Ponto de entrada do sistema de controle de estacionamento da EstACME.
 * Programação Orientada a Objetos - PUCRS - Wilson Oliveira Lima
 *
 * Execute com: node src/main.js   (ou npm start)
 *
 * O programa:
 *  1. carrega os arquivos data/clientes.csv e data/registros.csv para a memória
 *     (na primeira execução, copia o cenário inicial de seed-data/);
 *  2. abre a interface de menus, em que o usuário cadastra clientes, registra
 *     entradas e saídas, faz consultas e emite os relatórios gerenciais;
 *  3. grava os dados atualizados nos mesmos arquivos CSV ao sair — pelo menu
 *     "Sair", pela opção "Salvar agora" ou ao interromper com Ctrl+C.
 *
 * Para ver uma demonstração automática das regras de negócio, sem interação,
 * execute `node src/demo.js` (ou `npm run demo`).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { App } from './app/App.js';

const PASTA_PROJETO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA_DADOS = path.join(PASTA_PROJETO, 'data');
const PASTA_SEMENTE = path.join(PASTA_PROJETO, 'seed-data');

const app = new App(PASTA_DADOS, { pastaSemente: PASTA_SEMENTE });

app.titulo('EstACME - Estacionamento do Complexo Central');
app.escrever('  Shopping, edifício corporativo e universidade - 9.000 vagas numeradas');
app.escrever('');
app.iniciar();

// Ctrl+C também grava os dados antes de encerrar, evitando perda de informação
process.on('SIGINT', () => {
  app.escrever('');
  app.encerrar();
  process.exit(0);
});

await app.executar();
