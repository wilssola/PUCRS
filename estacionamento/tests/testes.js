/**
 * Testes das regras de negócio do sistema de estacionamento da EstACME.
 * Execute com: node testes/testes.js   (ou npm test)
 *
 * Usa apenas o módulo assert do Node, sem bibliotecas externas.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';

import { CadastroClientes } from '../src/services/CadastroClientes.js';
import { RegistroDeEntradas_E_Saidas } from '../src/services/RegistroDeEntradas_E_Saidas.js';
import { RelatoriosGerenciais } from '../src/services/RelatoriosGerenciais.js';
import { Tarifas } from '../src/domain/Tarifas.js';
import { Placa } from '../src/domain/Placa.js';
import { Cliente } from '../src/domain/clients/Cliente.js';
import { Estudante } from '../src/domain/clients/Estudante.js';
import { Professor } from '../src/domain/clients/Professor.js';
import { Empresa } from '../src/domain/clients/Empresa.js';
import { App } from '../src/app/App.js';
import { Terminal } from '../src/app/Terminal.js';
import { Desconto } from '../src/domain/discounts/Desconto.js';
import { DescontoClienteFrequente } from '../src/domain/discounts/DescontoClienteFrequente.js';
import {
  EntradaNaoAutorizadaError,
  LimiteDePlacasError,
  PlacaDuplicadaError,
  PlacaInvalidaError,
  RegistroNaoEncontradoError,
  VeiculoJaEstacionadoError,
} from '../src/infra/erros.js';

let executados = 0;
let falhas = 0;

function teste(nome, fn) {
  executados += 1;
  try {
    fn();
    console.log(`  ok    ${nome}`);
  } catch (erro) {
    falhas += 1;
    console.log(`  FALHA ${nome}\n        ${erro.message}`);
  }
}

/** Monta um sistema vazio para cada teste. */
function novoSistema() {
  const cadastro = new CadastroClientes();
  const registro = new RegistroDeEntradas_E_Saidas(cadastro, new Tarifas());
  return { cadastro, registro, relatorios: new RelatoriosGerenciais(registro, cadastro) };
}

const d = (dia, hora, minuto = 0) => new Date(2026, 4, dia, hora, minuto);

console.log('\nTESTES DO SISTEMA DE ESTACIONAMENTO - EstACME\n');

// ------------------------------------------------------------------ Placa
teste('placa no padrão antigo é normalizada', () => {
  assert.equal(new Placa('abc-1234').codigo, 'ABC1234');
});

teste('placa no padrão Mercosul é reconhecida', () => {
  assert.equal(new Placa('ABC1D23').padrao, 'Mercosul');
});

teste('placa inválida lança PlacaInvalidaError', () => {
  assert.throws(() => new Placa('AB12'), PlacaInvalidaError);
});

// ------------------------------------------------------- classes abstratas
teste('Cliente é abstrata e não pode ser instanciada', () => {
  assert.throws(() => new Cliente('1', 'X'), TypeError);
});

teste('Desconto é abstrato e não pode ser instanciado', () => {
  assert.throws(() => new Desconto('X'), TypeError);
});

// ------------------------------------------------- limites de placas (Set)
teste('estudante pode cadastrar apenas uma placa', () => {
  const aluno = new Estudante('111', 'Marina', 50);
  aluno.adicionarPlaca('AAA1A11');
  assert.throws(() => aluno.adicionarPlaca('BBB2B22'), LimiteDePlacasError);
});

teste('professor pode cadastrar até duas placas', () => {
  const prof = new Professor('222', 'Carlos');
  prof.adicionarPlaca('AAA1A11');
  prof.adicionarPlaca('BBB2B22');
  assert.throws(() => prof.adicionarPlaca('CCC3C33'), LimiteDePlacasError);
});

teste('empresa não tem limite de placas', () => {
  const empresa = new Empresa('333', 'Alfa');
  ['AAA1A11', 'BBB2B22', 'CCC3C33', 'DDD4D44'].forEach((p) => empresa.adicionarPlaca(p));
  assert.equal(empresa.quantidadeDePlacas, 4);
});

teste('placa já usada por outro cliente é recusada pelo cadastro', () => {
  const { cadastro } = novoSistema();
  const aluno = new Estudante('111', 'Marina', 50);
  aluno.adicionarPlaca('AAA1A11');
  cadastro.cadastrarCliente(aluno);

  const prof = new Professor('222', 'Carlos');
  cadastro.cadastrarCliente(prof);

  assert.throws(() => cadastro.adicionarPlaca('222', 'AAA1A11'), PlacaDuplicadaError);
  assert.equal(prof.quantidadeDePlacas, 0);
});

teste('cadastro identifica o proprietário pela placa (Map)', () => {
  const { cadastro } = novoSistema();
  const empresa = new Empresa('333', 'Alfa');
  empresa.adicionarPlaca('EMP1E11');
  cadastro.cadastrarCliente(empresa);
  assert.equal(cadastro.buscarPorPlaca('emp1e11').nome, 'Alfa');
  assert.equal(cadastro.buscarPorPlaca('ZZZ9Z99'), null);
});

// ------------------------------------------------------------ cliente avulso
teste('avulso: 4h15min contam como 5 horas (5 x R$ 5,00 = R$ 25,00)', () => {
  const { registro } = novoSistema();
  registro.autorizarEntrada('AVU1A11', d(18, 8, 30));
  const t = registro.processarSaida('AVU1A11', d(18, 12, 45));
  assert.equal(t.custo, 25);
});

teste('avulso: acima de 6 horas aplica-se a diária', () => {
  const { registro } = novoSistema();
  registro.autorizarEntrada('AVU2A22', d(18, 8));
  const t = registro.processarSaida('AVU2A22', d(18, 17));
  assert.equal(t.custo, 35);
});

teste('avulso: virada de meia-noite cobra uma nova diária', () => {
  const { registro } = novoSistema();
  registro.autorizarEntrada('AVU3A33', d(18, 22));
  const t = registro.processarSaida('AVU3A33', d(19, 3));
  assert.equal(t.quantidadeDiarias(), 2);
  assert.equal(t.custo, 10 + 35); // 2h no primeiro dia + diária do dia seguinte
});

/** Atalho: uma utilização completa da mesma placa, das 9h às 11h. */
function utilizar(registro, placa, dia, horaSaida = 11) {
  registro.autorizarEntrada(placa, d(dia, 9));
  return registro.processarSaida(placa, d(dia, horaSaida));
}

teste('avulso: as duas primeiras utilizações não têm desconto', () => {
  const { registro } = novoSistema();
  const primeira = utilizar(registro, 'AVU1A11', 18);
  const segunda = utilizar(registro, 'AVU1A11', 19);

  assert.equal(primeira.identificadorDesconto, 'nenhum');
  assert.equal(primeira.valorDesconto, 0);
  assert.equal(segunda.identificadorDesconto, 'nenhum');
  assert.equal(segunda.valorDesconto, 0);
});

teste('avulso: a TERCEIRA utilização em 5 dias já recebe 20% de desconto', () => {
  const { registro } = novoSistema();
  utilizar(registro, 'AVU1A11', 18);
  utilizar(registro, 'AVU1A11', 19);
  const terceira = utilizar(registro, 'AVU1A11', 20, 13); // 4h -> R$ 20,00

  assert.equal(terceira.custo, 20);
  assert.equal(terceira.identificadorDesconto, 'ClienteFrequente');
  assert.equal(terceira.valorDesconto, 4);
  assert.equal(terceira.valorDevido, 16);
});

teste('avulso: o desconto se repete nas utilizações seguintes', () => {
  const { registro } = novoSistema();
  utilizar(registro, 'AVU1A11', 18);
  utilizar(registro, 'AVU1A11', 19);
  utilizar(registro, 'AVU1A11', 20);
  const quarta = utilizar(registro, 'AVU1A11', 21, 13);

  assert.equal(quarta.identificadorDesconto, 'ClienteFrequente');
  assert.equal(quarta.valorDesconto, 4);
});

teste('avulso: utilizações fora da janela de 5 dias não contam', () => {
  const { registro } = novoSistema();
  utilizar(registro, 'AVU1A11', 10);  // 10/05: fora da janela
  utilizar(registro, 'AVU1A11', 11);  // 11/05: fora da janela
  const terceira = utilizar(registro, 'AVU1A11', 20, 13);

  assert.equal(terceira.identificadorDesconto, 'nenhum');
  assert.equal(terceira.valorDesconto, 0);
});

teste('desconto de cliente frequente não vale para pré-cadastrados', () => {
  const { cadastro, registro } = novoSistema();
  const aluno = new Estudante('111', 'Marina', 200);
  aluno.adicionarPlaca('IEE1I11');
  cadastro.cadastrarCliente(aluno);

  utilizar(registro, 'IEE1I11', 18);
  utilizar(registro, 'IEE1I11', 19);
  const terceira = utilizar(registro, 'IEE1I11', 20);

  assert.equal(terceira.identificadorDesconto, 'nenhum');
  assert.equal(terceira.valorDevido, 12); // ingresso cheio do estudante
});

teste('o identificador do desconto é exatamente "ClienteFrequente"', () => {
  assert.equal(DescontoClienteFrequente.IDENTIFICADOR, 'ClienteFrequente');
  assert.equal(DescontoClienteFrequente.PERCENTUAL, 20);
  assert.equal(DescontoClienteFrequente.USOS_MINIMOS, 3);
  assert.equal(DescontoClienteFrequente.JANELA_EM_DIAS, 5);
});

teste('avulso: recusa de pagamento libera a saída e bloqueia a placa', () => {
  const { registro } = novoSistema();
  registro.autorizarEntrada('AVU4A44', d(21, 10));
  const t = registro.processarSaida('AVU4A44', d(21, 15), { pagou: false });

  assert.equal(t.valorPago, 0);
  assert.equal(t.saldoDevedor, 25);
  assert.ok(registro.placasBloqueadas.has('AVU4A44'));
  assert.throws(() => registro.autorizarEntrada('AVU4A44', d(22, 8)), EntradaNaoAutorizadaError);
});

// ---------------------------------------------------------------- estudante
teste('estudante: entrada e saída no mesmo dia custam um ingresso', () => {
  const { cadastro, registro } = novoSistema();
  const aluno = new Estudante('111', 'Marina', 40);
  aluno.adicionarPlaca('IEE1I11');
  cadastro.cadastrarCliente(aluno);

  registro.autorizarEntrada('IEE1I11', d(18, 7, 45));
  const t = registro.processarSaida('IEE1I11', d(18, 18, 20));
  assert.equal(t.custo, 12);
  assert.equal(aluno.saldo, 28);
});

teste('estudante: saída após a meia-noite cobra um novo ingresso', () => {
  const { cadastro, registro } = novoSistema();
  const aluno = new Estudante('111', 'Marina', 40);
  aluno.adicionarPlaca('IEE1I11');
  cadastro.cadastrarCliente(aluno);

  registro.autorizarEntrada('IEE1I11', d(19, 21));
  const t = registro.processarSaida('IEE1I11', d(20, 2));
  assert.equal(t.custo, 24);
});

teste('estudante: saldo pode ficar negativo e a saída é liberada', () => {
  const { cadastro, registro } = novoSistema();
  const aluno = new Estudante('111', 'Marina', 5);
  aluno.adicionarPlaca('IEE1I11');
  cadastro.cadastrarCliente(aluno);

  registro.autorizarEntrada('IEE1I11', d(18, 8));
  const t = registro.processarSaida('IEE1I11', d(18, 12));
  assert.equal(t.valorPago, 12);
  assert.equal(aluno.saldo, -7);
  assert.equal(aluno.estaImpedido, true);
});

teste('estudante: com saldo negativo as entradas são bloqueadas até a recarga', () => {
  const { cadastro, registro } = novoSistema();
  const aluno = new Estudante('111', 'Marina', 0);
  aluno.adicionarPlaca('IEE1I11');
  cadastro.cadastrarCliente(aluno);

  registro.autorizarEntrada('IEE1I11', d(18, 8));
  registro.processarSaida('IEE1I11', d(18, 12));
  assert.throws(() => registro.autorizarEntrada('IEE1I11', d(19, 8)), EntradaNaoAutorizadaError);

  aluno.carregarSaldo(50);
  const ticket = registro.autorizarEntrada('IEE1I11', d(19, 9));
  assert.equal(ticket.tipoCliente, 'Estudante');
});

// ---------------------------------------------------------------- professor
teste('professor: entrada é gratuita', () => {
  const { cadastro, registro } = novoSistema();
  const prof = new Professor('222', 'Carlos');
  prof.adicionarPlaca('PRO1P11');
  cadastro.cadastrarCliente(prof);

  registro.autorizarEntrada('PRO1P11', d(18, 7));
  const t = registro.processarSaida('PRO1P11', d(18, 18, 30));
  assert.equal(t.custo, 0);
  assert.equal(t.valorDevido, 0);
});

teste('professor: apenas um veículo pode permanecer por vez', () => {
  const { cadastro, registro } = novoSistema();
  const prof = new Professor('222', 'Carlos');
  prof.adicionarPlaca('PRO1P11');
  prof.adicionarPlaca('PRO2P22');
  cadastro.cadastrarCliente(prof);

  registro.autorizarEntrada('PRO1P11', d(18, 7));
  assert.throws(() => registro.autorizarEntrada('PRO2P22', d(18, 7, 30)), EntradaNaoAutorizadaError);

  registro.processarSaida('PRO1P11', d(18, 18));
  const ticket = registro.autorizarEntrada('PRO2P22', d(18, 19));
  assert.equal(ticket.placa.codigo, 'PRO2P22');
});

// ------------------------------------------------------------------ empresa
teste('empresa: cobrança por diária, acumulada como débito', () => {
  const { cadastro, registro } = novoSistema();
  const empresa = new Empresa('333', 'Alfa');
  empresa.adicionarPlaca('EMP1E11');
  cadastro.cadastrarCliente(empresa);

  registro.autorizarEntrada('EMP1E11', d(18, 8));
  const t = registro.processarSaida('EMP1E11', d(18, 18));
  assert.equal(t.custo, 30);
  assert.equal(t.valorPago, 0);       // não é pago na cancela
  assert.equal(empresa.saldoDevedor, 30);
});

teste('empresa: permanência após a meia-noite gera multa por dia', () => {
  const { cadastro, registro } = novoSistema();
  const empresa = new Empresa('333', 'Alfa');
  empresa.adicionarPlaca('EMP2E22');
  cadastro.cadastrarCliente(empresa);

  registro.autorizarEntrada('EMP2E22', d(18, 8));
  const t = registro.processarSaida('EMP2E22', d(19, 9));
  assert.equal(t.custo, 2 * 30 + 40); // duas diárias + uma multa
});

teste('empresa: todos os veículos da frota podem estacionar juntos', () => {
  const { cadastro, registro } = novoSistema();
  const empresa = new Empresa('333', 'Alfa');
  ['EMP1E11', 'EMP2E22', 'EMP3E33'].forEach((p) => empresa.adicionarPlaca(p));
  cadastro.cadastrarCliente(empresa);

  ['EMP1E11', 'EMP2E22', 'EMP3E33'].forEach((p, i) => registro.autorizarEntrada(p, d(18, 8, i)));
  assert.equal(registro.ticketsAbertos.length, 3);
});

teste('empresa: boleto não quitado impede todos os veículos', () => {
  const { cadastro, registro } = novoSistema();
  const empresa = new Empresa('333', 'Alfa');
  ['EMP1E11', 'EMP3E33'].forEach((p) => empresa.adicionarPlaca(p));
  cadastro.cadastrarCliente(empresa);

  registro.autorizarEntrada('EMP1E11', d(18, 8));
  registro.processarSaida('EMP1E11', d(18, 18));
  empresa.emitirBoleto();
  empresa.registrarBoletoNaoQuitado();

  assert.equal(empresa.inadimplente, true);
  assert.throws(() => registro.autorizarEntrada('EMP3E33', d(19, 8)), EntradaNaoAutorizadaError);

  empresa.quitarBoleto();
  assert.equal(registro.autorizarEntrada('EMP3E33', d(19, 9)).tipoCliente, 'Empresa');
});

// ---------------------------------------------------------------- exceções
teste('entrada duplicada do mesmo veículo é recusada', () => {
  const { registro } = novoSistema();
  registro.autorizarEntrada('AVU1A11', d(18, 8));
  assert.throws(() => registro.autorizarEntrada('AVU1A11', d(18, 9)), VeiculoJaEstacionadoError);
});

teste('saída sem registro em aberto é recusada', () => {
  const { registro } = novoSistema();
  assert.throws(() => registro.processarSaida('ZZZ9Z99', d(18, 8)), RegistroNaoEncontradoError);
});

// --------------------------------------------------------------- relatórios
teste('relatório: arrecadação por período e por categorias combinadas', () => {
  const { cadastro, registro, relatorios } = novoSistema();
  const aluno = new Estudante('111', 'Marina', 100);
  aluno.adicionarPlaca('IEE1I11');
  cadastro.cadastrarCliente(aluno);

  registro.autorizarEntrada('AVU1A11', d(18, 8));
  registro.processarSaida('AVU1A11', d(18, 10));   // R$ 10,00 avulso
  registro.autorizarEntrada('IEE1I11', d(18, 8));
  registro.processarSaida('IEE1I11', d(18, 10));   // R$ 12,00 estudante

  const inicio = d(18, 0);
  const fim = d(18, 23, 59);
  assert.equal(relatorios.arrecadacao(inicio, fim).valorDevido, 22);
  assert.equal(relatorios.arrecadacao(inicio, fim, ['Avulso']).valorDevido, 10);
  assert.equal(relatorios.arrecadacao(inicio, fim, ['Avulso', 'Estudante']).valorDevido, 22);
});

teste('relatório: situação do cliente mostra veículos estacionados e saldo', () => {
  const { cadastro, registro, relatorios } = novoSistema();
  const aluno = new Estudante('111', 'Marina', 30);
  aluno.adicionarPlaca('IEE1I11');
  cadastro.cadastrarCliente(aluno);
  registro.autorizarEntrada('IEE1I11', d(18, 8));

  const situacao = relatorios.situacaoDoCliente('111');
  assert.deepEqual(situacao.veiculosEstacionados, ['IEE1I11']);
  assert.equal(situacao.situacaoFinanceira.valor, 30);
});

teste('relatório: 10 clientes mais frequentes do ano', () => {
  const { registro, relatorios } = novoSistema();
  for (const dia of [18, 19, 20]) {
    registro.autorizarEntrada('AVU1A11', d(dia, 9));
    registro.processarSaida('AVU1A11', d(dia, 11));
  }
  registro.autorizarEntrada('AVU2A22', d(18, 9));
  registro.processarSaida('AVU2A22', d(18, 11));

  const ranking = relatorios.clientesMaisFrequentes(2026);
  assert.equal(ranking[0].identificacao, 'Avulso AVU1A11');
  assert.equal(ranking[0].visitas, 3);
  assert.ok(ranking.length <= 10);
});

// -------------------------------------------------------------- persistência
teste('cadastro é carregado e regravado no formato CSV', () => {
  const { cadastro } = novoSistema();
  const csv = [
    '12345678901,João Silva,100,Estudante,ABC1D23',
    '34567890123,Carlos Oliveira,Professor,JKL4G56,GHI3F45',
    '56789012345,Tecnopuc S.A.,30,Empresa,STU7J89,VWX8K90',
  ].join('\n');

  assert.equal(cadastro.carregarDeTextoCSV(csv), 3);
  assert.equal(cadastro.buscarPorPlaca('JKL4G56').tipo, 'Professor');
  assert.equal(cadastro.buscarPorDocumento('12345678901').saldo, 100);
  assert.equal(cadastro.paraTextoCSV().split('\n').length, 3);
});

teste('registros são carregados do CSV, inclusive os incompletos', () => {
  const { cadastro, registro } = novoSistema();
  cadastro.carregarDeTextoCSV('12345678901,João Silva,100,Estudante,ABC1D23');
  const csv = [
    'ABC1D23,2025-11-27T08:30:00,2025-11-27T12:45:00,20,0,20',
    'ABC1D23,2025-11-28T15:00:00,,,',
  ].join('\n');

  assert.equal(registro.carregarDeTextoCSV(csv), 2);
  assert.equal(registro.ticketsAbertos.length, 1);
  assert.equal(registro.tickets[0].tipoCliente, 'Estudante');
});

// ------------------------------------------------- Fase 2: interface (Terminal)
teste('Terminal converte data no formato dd/mm/aaaa', () => {
  const data = Terminal.converterDataHora('09/09/2026');
  assert.equal(data.getFullYear(), 2026);
  assert.equal(data.getMonth(), 8);
  assert.equal(data.getDate(), 9);
  assert.equal(data.getHours(), 0);
});

teste('Terminal converte data com hora dd/mm/aaaa hh:mm', () => {
  const data = Terminal.converterDataHora('09/09/2026 14:35');
  assert.equal(data.getHours(), 14);
  assert.equal(data.getMinutes(), 35);
});

teste('Terminal usa 23:59 quando a data marca o fim do período', () => {
  const data = Terminal.converterDataHora('09/09/2026', true);
  assert.equal(data.getHours(), 23);
  assert.equal(data.getMinutes(), 59);
});

teste('Terminal rejeita datas inexistentes e formatos inválidos', () => {
  assert.equal(Terminal.converterDataHora('31/02/2026'), null);
  assert.equal(Terminal.converterDataHora('2026-09-09'), null);
  assert.equal(Terminal.converterDataHora('09/09/2026 25:00'), null);
  assert.equal(Terminal.converterDataHora(''), null);
});

// ------------------------------------------- Fase 2: persistência em arquivos

/** Terminal silencioso, para que os testes não poluam a saída. */
function terminalSilencioso() {
  const descartar = () => new Writable({ write(_pedaco, _codificacao, pronto) { pronto(); } });
  return new Terminal(descartar(), descartar());
}

/** Pasta temporária isolada para cada teste de persistência. */
function pastaTemporaria() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'estacme-teste-'));
}

const PASTA_SEMENTE = path.join(process.cwd(), 'seed-data');

teste('App copia o cenário inicial quando a pasta de dados está vazia', () => {
  const pasta = pastaTemporaria();
  const app = new App(pasta, { terminal: terminalSilencioso(), pastaSemente: PASTA_SEMENTE });
  app.iniciar();

  assert.ok(fs.existsSync(path.join(pasta, 'clientes.csv')));
  assert.ok(fs.existsSync(path.join(pasta, 'registros.csv')));
  assert.equal(app.cadastro.totalClientes, 10);
  assert.ok(app.registro.tickets.length > 0);

  fs.rmSync(pasta, { recursive: true, force: true });
});

teste('App grava e recarrega os dados nos arquivos CSV', () => {
  const pasta = pastaTemporaria();

  const primeira = new App(pasta, { terminal: terminalSilencioso(), pastaSemente: PASTA_SEMENTE });
  primeira.iniciar();

  const aluno = new Estudante('99988877766', 'Ana Testadora', 50);
  aluno.adicionarPlaca('TST1T11');
  primeira.cadastro.cadastrarCliente(aluno);
  primeira.registro.autorizarEntrada('TST1T11', new Date(2026, 8, 9, 8, 0));
  primeira.registro.processarSaida('TST1T11', new Date(2026, 8, 9, 12, 30));
  assert.equal(primeira.salvar(), true);

  // um novo App lendo a mesma pasta deve encontrar tudo o que foi gravado
  const segunda = new App(pasta, { terminal: terminalSilencioso(), pastaSemente: PASTA_SEMENTE });
  segunda.iniciar();

  const recuperado = segunda.cadastro.buscarPorDocumento('99988877766');
  assert.equal(recuperado.nome, 'Ana Testadora');
  assert.equal(recuperado.saldo, 38); // 50 - 12 do ingresso do estudante
  assert.ok(recuperado.possuiPlaca('TST1T11'));

  const registros = segunda.registro.consultarPorPlaca('TST1T11');
  assert.equal(registros.length, 1);
  assert.equal(registros[0].valorPago, 12);

  fs.rmSync(pasta, { recursive: true, force: true });
});

teste('App mantém os veículos em aberto ao recarregar os arquivos', () => {
  const pasta = pastaTemporaria();

  const primeira = new App(pasta, { terminal: terminalSilencioso(), pastaSemente: PASTA_SEMENTE });
  primeira.iniciar();
  const abertosAntes = primeira.registro.ticketsAbertos.length;
  primeira.registro.autorizarEntrada('AVU9A99', new Date(2026, 8, 9, 8, 0));
  primeira.salvar();

  const segunda = new App(pasta, { terminal: terminalSilencioso(), pastaSemente: PASTA_SEMENTE });
  segunda.iniciar();
  assert.equal(segunda.registro.ticketsAbertos.length, abertosAntes + 1);

  fs.rmSync(pasta, { recursive: true, force: true });
});

console.log(`\n${executados - falhas}/${executados} testes aprovados.\n`);
process.exit(falhas === 0 ? 0 : 1);
