/**
 * Ponto de entrada do sistema de controle de estacionamento da EstACME.
 * Fase 1 - Programação Orientada a Objetos - PUCRS
 * Autor: Wilson Oliveira Lima
 *
 * Execute com: node src/main.js   (ou npm start)
 *
 * O roteiro abaixo demonstra todas as regras do documento do projeto:
 *  1. carga dos arquivos CSV (clientes e registros);
 *  2. cadastro de clientes e de placas, com os limites de cada categoria;
 *  3. cliente avulso: valor por hora, diária e virada de meia-noite;
 *  4. desconto "ClienteFrequente" (3 usos em 5 dias, 20%);
 *  5. recusa de pagamento e lista de bloqueio;
 *  6. estudante: ingresso por dia, saldo pré-pago e saldo negativo;
 *  7. professor: gratuidade e apenas um veículo por vez;
 *  8. empresa: diária, multa após a meia-noite, boleto e inadimplência;
 *  9. relatórios gerenciais;
 * 10. salvamento automático dos dados no encerramento.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { App } from './app/App.js';
import { Estudante } from './domain/clients/Estudante.js';
import { Professor } from './domain/clients/Professor.js';
import { Empresa } from './domain/clients/Empresa.js';

const PASTA_PROJETO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA_DADOS = path.join(PASTA_PROJETO, 'data');
const PASTA_SEMENTE = path.join(PASTA_PROJETO, 'seed-data');

// Restaura o cenário de demonstração a partir dos arquivos originais, para que
// o programa possa ser executado quantas vezes forem necessárias.
fs.mkdirSync(PASTA_DADOS, { recursive: true });
['clientes.csv', 'registros.csv'].forEach((arquivo) => {
  fs.copyFileSync(path.join(PASTA_SEMENTE, arquivo), path.join(PASTA_DADOS, arquivo));
});

const app = new App(PASTA_DADOS);

app.titulo('1. INICIALIZAÇÃO: CARGA DOS ARQUIVOS CSV');
app.iniciar();

app.titulo('2. CADASTRO DE CLIENTES E LIMITES DE PLACAS POR CATEGORIA');

const estudante = new Estudante('11122233344', 'Marina Souza', 40);
estudante.adicionarPlaca('IEE1I11');
app.executar('Estudante cadastrado (limite de 1 placa)', () => app.cadastro.cadastrarCliente(estudante));
app.executar('Segunda placa do estudante deve ser recusada', () => app.cadastro.adicionarPlaca('11122233344', 'IEE2I22'));

const professor = new Professor('22233344455', 'Carlos Pereira');
professor.adicionarPlaca('PRO1P11');
professor.adicionarPlaca('PRO2P22');
app.executar('Professor cadastrado (limite de 2 placas)', () => app.cadastro.cadastrarCliente(professor));
app.executar('Terceira placa do professor deve ser recusada', () => app.cadastro.adicionarPlaca('22233344455', 'PRO3P33'));

const empresa = new Empresa('11222333000144', 'Alfa Serviços Ltda.');
['EMP1E11', 'EMP2E22', 'EMP3E33'].forEach((p) => empresa.adicionarPlaca(p));
app.executar('Empresa cadastrada (sem limite de placas)', () => app.cadastro.cadastrarCliente(empresa));
app.executar('Placa já usada por outro cliente deve ser recusada', () => app.cadastro.adicionarPlaca('11222333000144', 'IEE1I11'));

app.titulo('3. CLIENTE AVULSO: VALOR POR HORA, DIÁRIA E VIRADA DE MEIA-NOITE');

// 4h15min -> 5 horas cheias x R$ 5,00 = R$ 25,00
app.entrada('AVU1A11', new Date(2026, 4, 18, 8, 30));
app.saida('AVU1A11', new Date(2026, 4, 18, 12, 45));

// 9 horas ultrapassam o limite de 6 horas -> diária de R$ 35,00
app.entrada('AVU2A22', new Date(2026, 4, 18, 8, 0));
app.saida('AVU2A22', new Date(2026, 4, 18, 17, 0));

// entra às 22h e sai às 3h: primeiro dia por hora + nova diária pela virada
app.entrada('AVU3A33', new Date(2026, 4, 18, 22, 0));
app.saida('AVU3A33', new Date(2026, 4, 19, 3, 0));

app.titulo('4. DESCONTO "ClienteFrequente" (3 USOS EM 5 DIAS = 20%)');

// a placa AVU1A11 já teve a primeira utilização no bloco anterior (18/05)
app.escrever('  Segunda utilização em cinco dias: ainda sem desconto.');
app.entrada('AVU1A11', new Date(2026, 4, 19, 9, 0));
app.saida('AVU1A11', new Date(2026, 4, 19, 11, 0));

app.escrever('  Terceira utilização em cinco dias: o desconto passa a valer.');
app.entrada('AVU1A11', new Date(2026, 4, 20, 9, 0));
app.saida('AVU1A11', new Date(2026, 4, 20, 11, 0));

app.escrever('  Quarta utilização: o desconto é concedido novamente, pois o');
app.escrever('  benefício independe de o cliente já ter sido beneficiado antes.');
app.entrada('AVU1A11', new Date(2026, 4, 21, 9, 0));
app.saida('AVU1A11', new Date(2026, 4, 21, 13, 0));

app.titulo('5. RECUSA DE PAGAMENTO E LISTA DE BLOQUEIO');

app.entrada('AVU4A44', new Date(2026, 4, 21, 10, 0));
app.escrever('  O condutor se recusa a pagar: a saída é liberada e a placa é bloqueada.');
app.saida('AVU4A44', new Date(2026, 4, 21, 15, 0), { pagou: false });
app.entrada('AVU4A44', new Date(2026, 4, 22, 8, 0));

app.titulo('6. ESTUDANTE: INGRESSO POR DIA, PRÉ-PAGO E SALDO NEGATIVO');

app.escrever(`  Saldo inicial de ${estudante.nome}: R$ ${estudante.saldo.toFixed(2)}`);
app.entrada('IEE1I11', new Date(2026, 4, 18, 7, 45));
app.saida('IEE1I11', new Date(2026, 4, 18, 18, 20)); // mesmo dia: 1 ingresso

app.escrever('  Saída após a meia-noite: é cobrado um novo ingresso.');
app.entrada('IEE1I11', new Date(2026, 4, 19, 21, 0));
app.saida('IEE1I11', new Date(2026, 4, 20, 2, 0)); // 2 ingressos

app.escrever('  Consumo do saldo restante até ficar negativo:');
app.entrada('IEE1I11', new Date(2026, 4, 20, 8, 0));
app.saida('IEE1I11', new Date(2026, 4, 20, 12, 0));
app.mostrarSituacao('11122233344');
app.escrever('  Com saldo negativo, novas entradas são bloqueadas:');
app.entrada('IEE1I11', new Date(2026, 4, 21, 8, 0));
app.escrever('  Após a recarga de créditos, a entrada volta a ser autorizada:');
estudante.carregarSaldo(50);
app.entrada('IEE1I11', new Date(2026, 4, 21, 8, 5));
app.saida('IEE1I11', new Date(2026, 4, 21, 17, 0));

app.titulo('7. PROFESSOR: GRATUIDADE E UM VEÍCULO POR VEZ');

app.entrada('PRO1P11', new Date(2026, 4, 18, 7, 0));
app.escrever('  Segundo veículo do mesmo professor deve ser negado:');
app.entrada('PRO2P22', new Date(2026, 4, 18, 7, 30));
app.saida('PRO1P11', new Date(2026, 4, 18, 18, 30)); // custo zero
app.escrever('  Com o pátio livre, o segundo veículo pode entrar:');
app.entrada('PRO2P22', new Date(2026, 4, 18, 19, 0));
app.saida('PRO2P22', new Date(2026, 4, 18, 22, 0));

app.titulo('8. EMPRESA: DIÁRIA, MULTA APÓS A MEIA-NOITE, BOLETO E INADIMPLÊNCIA');

app.entrada('EMP1E11', new Date(2026, 4, 18, 8, 0));
app.entrada('EMP2E22', new Date(2026, 4, 18, 8, 10));
app.escrever('  Todos os veículos da frota podem estacionar ao mesmo tempo.');
app.saida('EMP1E11', new Date(2026, 4, 18, 18, 0)); // uma diária

app.escrever('  Veículo que permanece após a meia-noite recebe multa por dia:');
app.saida('EMP2E22', new Date(2026, 4, 19, 9, 0));

app.mostrarSituacao('11222333000144');
app.escrever(`  Boleto emitido: R$ ${empresa.emitirBoleto().toFixed(2)}`);
app.escrever('  Boleto não quitado no vencimento: a empresa fica inadimplente.');
empresa.registrarBoletoNaoQuitado();
app.entrada('EMP3E33', new Date(2026, 4, 20, 8, 0));
app.escrever('  Após a quitação do boleto, o acesso é liberado:');
empresa.quitarBoleto();
app.entrada('EMP3E33', new Date(2026, 4, 20, 8, 30));
app.saida('EMP3E33', new Date(2026, 4, 20, 17, 0));

app.titulo('9. RELATÓRIOS GERENCIAIS');

const inicioPeriodo = new Date(2026, 4, 18, 0, 0);
const fimPeriodo = new Date(2026, 4, 22, 23, 59);

const totalPeriodo = app.relatorios.arrecadacao(inicioPeriodo, fimPeriodo);
app.escrever(`  Arrecadação de 18/05 a 22/05: R$ ${totalPeriodo.valorDevido.toFixed(2)} `
  + `devidos em ${totalPeriodo.atendimentos} atendimentos.`);

const somenteAvulsos = app.relatorios.arrecadacao(inicioPeriodo, fimPeriodo, ['Avulso']);
app.escrever(`  Somente clientes avulsos: R$ ${somenteAvulsos.valorDevido.toFixed(2)}`);

const avulsosEEstudantes = app.relatorios.arrecadacao(inicioPeriodo, fimPeriodo, ['Avulso', 'Estudante']);
app.escrever(`  Avulsos + estudantes (categorias combinadas): R$ ${avulsosEEstudantes.valorDevido.toFixed(2)}`);

app.escrever('');
app.escrever('  Registros do estudante no período:');
app.relatorios.registrosDoCliente('11122233344', inicioPeriodo, fimPeriodo)
  .forEach((t) => app.escrever(`    ${t}`));

app.escrever('  Registros de clientes não cadastrados (avulsos):');
app.relatorios.registrosDeAvulsos(inicioPeriodo, fimPeriodo)
  .forEach((t) => app.escrever(`    ${t}`));

app.mostrarRelatorios(2026);

app.titulo('10. ENCERRAMENTO: SALVAMENTO AUTOMÁTICO DOS ARQUIVOS CSV');
app.encerrar();
