import fs from 'node:fs';
import path from 'node:path';

import { CadastroClientes } from '../services/CadastroClientes.js';
import { RegistroDeEntradas_E_Saidas } from '../services/RegistroDeEntradas_E_Saidas.js';
import { RelatoriosGerenciais } from '../services/RelatoriosGerenciais.js';
import { Tarifas } from '../domain/Tarifas.js';
import { ErroDominio } from '../infra/erros.js';
import { formatarDataHora, formatarReal } from '../infra/tempo.js';

/**
 * Interface com o usuário (classe App da Figura 1).
 *
 * Concentra tudo o que é apresentação: carrega os dados dos arquivos CSV na
 * inicialização, aciona as demais classes do sistema, imprime os resultados e
 * salva os dados atualizados no encerramento. Nenhuma regra de negócio é
 * implementada aqui.
 */
export class App {
  #cadastro;
  #registro;
  #relatorios;
  #pastaDados;

  /**
   * @param {string} pastaDados pasta com clientes.csv e registros.csv
   * @param {Tarifas} [tarifas]
   */
  constructor(pastaDados, tarifas = new Tarifas()) {
    this.#pastaDados = pastaDados;
    this.#cadastro = new CadastroClientes();
    this.#registro = new RegistroDeEntradas_E_Saidas(this.#cadastro, tarifas);
    this.#relatorios = new RelatoriosGerenciais(this.#registro, this.#cadastro);
  }

  get cadastro() { return this.#cadastro; }
  get registro() { return this.#registro; }
  get relatorios() { return this.#relatorios; }

  // ------------------------------------------------------------ inicialização

  /** Carrega integralmente os arquivos CSV para a memória. */
  iniciar() {
    const arquivoClientes = path.join(this.#pastaDados, 'clientes.csv');
    const arquivoRegistros = path.join(this.#pastaDados, 'registros.csv');

    if (fs.existsSync(arquivoClientes)) {
      const total = this.#cadastro.carregarDeTextoCSV(fs.readFileSync(arquivoClientes, 'utf-8'));
      this.escrever(`Clientes carregados de clientes.csv: ${total}`);
    }
    if (fs.existsSync(arquivoRegistros)) {
      const total = this.#registro.carregarDeTextoCSV(fs.readFileSync(arquivoRegistros, 'utf-8'));
      this.escrever(`Registros carregados de registros.csv: ${total}`);
    }
    return this;
  }

  /** Salva os dados atualizados nos arquivos CSV (encerramento do sistema). */
  encerrar() {
    fs.mkdirSync(this.#pastaDados, { recursive: true });
    fs.writeFileSync(
      path.join(this.#pastaDados, 'clientes.csv'),
      `${this.#cadastro.paraTextoCSV()}\n`,
      'utf-8',
    );
    fs.writeFileSync(
      path.join(this.#pastaDados, 'registros.csv'),
      `${this.#registro.paraTextoCSV()}\n`,
      'utf-8',
    );
    this.escrever('Dados salvos nos arquivos CSV. Sistema encerrado.');
  }

  // -------------------------------------------------------------- apresentação

  /** Ponto único de saída de texto: facilita trocar o console por outra interface. */
  escrever(texto = '') {
    console.log(texto);
  }

  titulo(texto) {
    this.escrever(`\n${'-'.repeat(76)}\n${texto}\n${'-'.repeat(76)}`);
  }

  /**
   * Executa uma operação exibindo a mensagem de erro quando uma regra de
   * negócio impede a ação.
   * @param {string} descricao
   * @param {Function} operacao
   */
  executar(descricao, operacao) {
    try {
      const resultado = operacao();
      this.escrever(`  [ok] ${descricao}`);
      return resultado;
    } catch (erro) {
      if (erro instanceof ErroDominio) {
        this.escrever(`  [${erro.name}] ${erro.message}`);
        return null;
      }
      throw erro;
    }
  }

  // ------------------------------------------------------- operações do menu

  /** Registra a entrada de um veículo e exibe o ticket criado. */
  entrada(placa, dataHora) {
    return this.executar(`Entrada autorizada: ${placa}`, () => {
      const ticket = this.#registro.autorizarEntrada(placa, dataHora);
      this.escrever(`       ticket #${ticket.id} | ${ticket.tipoCliente} | ${formatarDataHora(ticket.entrada)}`);
      return ticket;
    });
  }

  /** Processa a saída de um veículo e exibe o comprovante com os valores. */
  saida(placa, dataHora, opcoes = {}) {
    return this.executar(`Saída processada: ${placa}`, () => {
      const ticket = this.#registro.processarSaida(placa, dataHora, opcoes);
      this.escrever(`       permanência: ${formatarDataHora(ticket.entrada)} -> ${formatarDataHora(ticket.saida)}`
        + ` (${ticket.quantidadeDiarias()} dia[s])`);
      this.escrever(`       custo ${formatarReal(ticket.custo)} | desconto "${ticket.identificadorDesconto}" `
        + `${formatarReal(ticket.valorDesconto)} | devido ${formatarReal(ticket.valorDevido)} | `
        + `pago ${formatarReal(ticket.valorPago)}`);
      return ticket;
    });
  }

  /** Exibe a situação de um cliente cadastrado. */
  mostrarSituacao(documento) {
    return this.executar(`Situação consultada: ${documento}`, () => {
      const s = this.#relatorios.situacaoDoCliente(documento);
      this.escrever(`       ${s.cliente}`);
      this.escrever(`       placas: ${s.placasCadastradas.join(', ') || 'nenhuma'}`);
      this.escrever(`       estacionados agora: ${s.veiculosEstacionados.join(', ') || 'nenhum'}`);
      this.escrever(`       ${s.situacaoFinanceira.descricao}: ${formatarReal(s.situacaoFinanceira.valor)}`);
      if (s.impedido) this.escrever(`       IMPEDIDO: ${s.motivo}`);
      return s;
    });
  }

  /** Imprime o relatório gerencial consolidado. */
  mostrarRelatorios(ano) {
    this.escrever('');
    this.escrever(this.#relatorios.emTexto(ano));
  }
}
