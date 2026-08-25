import { OperacaoInvalidaError } from '../infra/erros.js';
import {
  deISOLocal,
  formatarDataHora,
  paraISOLocal,
  periodosDiarios,
} from '../infra/tempo.js';
import { Placa } from './Placa.js';

/**
 * Ticket (registro) de estacionamento de um veículo.
 *
 * Criado na autorização de entrada com placa, tipo de cliente e data/hora de
 * entrada. Na saída recebe a data/hora de saída, o custo, o identificador do
 * desconto (ou "nenhum"), o valor do desconto, o valor devido e o valor pago,
 * exatamente como pede o documento do projeto.
 */
export class TicketEstacionamento {
  static #sequencia = 0;

  #id;
  #placa;
  #tipoCliente;
  #documentoCliente;
  #entrada;
  #saida;
  #custo;
  #identificadorDesconto;
  #valorDesconto;
  #valorDevido;
  #valorPago;

  /**
   * @param {string|Placa} placa
   * @param {string} tipoCliente 'Avulso' | 'Estudante' | 'Professor' | 'Empresa'
   * @param {Date} entrada
   * @param {string|null} documentoCliente CPF/CNPJ do cliente pré-cadastrado
   */
  constructor(placa, tipoCliente, entrada, documentoCliente = null) {
    this.#id = ++TicketEstacionamento.#sequencia;
    this.#placa = placa instanceof Placa ? placa : new Placa(placa);
    this.#tipoCliente = tipoCliente;
    this.#documentoCliente = documentoCliente;
    this.#entrada = entrada;
    this.#saida = null;
    this.#custo = 0;
    this.#identificadorDesconto = 'nenhum';
    this.#valorDesconto = 0;
    this.#valorDevido = 0;
    this.#valorPago = 0;
  }

  get id() { return this.#id; }
  get placa() { return this.#placa; }
  get tipoCliente() { return this.#tipoCliente; }
  get documentoCliente() { return this.#documentoCliente; }
  get entrada() { return this.#entrada; }
  get saida() { return this.#saida; }
  get custo() { return this.#custo; }
  get identificadorDesconto() { return this.#identificadorDesconto; }
  get valorDesconto() { return this.#valorDesconto; }
  get valorDevido() { return this.#valorDevido; }
  get valorPago() { return this.#valorPago; }

  /** Verdadeiro enquanto o veículo não saiu (registro incompleto no CSV). */
  get estaAberto() {
    return this.#saida === null;
  }

  /** Diferença entre o valor devido e o valor pago (débito deixado na saída). */
  get saldoDevedor() {
    return Number((this.#valorDevido - this.#valorPago).toFixed(2));
  }

  /** Duração da permanência em milissegundos. */
  get duracaoMs() {
    if (this.estaAberto) return 0;
    return this.#saida.getTime() - this.#entrada.getTime();
  }

  /**
   * Períodos de permanência quebrados pela meia-noite.
   * É a base do cálculo de custo de todas as categorias de cliente.
   * @param {Date} [saidaPrevista] permite simular o custo antes de fechar
   * @returns {{inicio: Date, fim: Date, dia: string}[]}
   */
  periodos(saidaPrevista = null) {
    const fim = this.#saida ?? saidaPrevista;
    if (fim === null) return [];
    return periodosDiarios(this.#entrada, fim);
  }

  /** Quantidade de dias-calendário utilizados (1 quando não vira a meia-noite). */
  quantidadeDiarias(saidaPrevista = null) {
    return this.periodos(saidaPrevista).length;
  }

  /**
   * Encerra o ticket com os dados financeiros calculados na saída.
   * @param {Date} saida
   * @param {{custo: number, identificadorDesconto: string, valorDesconto: number, valorDevido: number, valorPago: number}} dados
   */
  fechar(saida, dados) {
    if (!this.estaAberto) {
      throw new OperacaoInvalidaError(`O ticket ${this.#id} já foi encerrado.`);
    }
    if (saida < this.#entrada) {
      throw new OperacaoInvalidaError('A saída não pode ser anterior à entrada.');
    }
    this.#saida = saida;
    this.#custo = dados.custo;
    this.#identificadorDesconto = dados.identificadorDesconto ?? 'nenhum';
    this.#valorDesconto = dados.valorDesconto ?? 0;
    this.#valorDevido = dados.valorDevido ?? 0;
    this.#valorPago = dados.valorPago ?? 0;
  }

  /** Linha CSV: placa,entrada,saida,custo,desconto,pago (registro aberto fica incompleto). */
  paraCSV() {
    if (this.estaAberto) {
      return `${this.#placa},${paraISOLocal(this.#entrada)},,,`;
    }
    return [
      this.#placa.codigo,
      paraISOLocal(this.#entrada),
      paraISOLocal(this.#saida),
      this.#custo,
      this.#valorDesconto,
      this.#valorPago,
    ].join(',');
  }

  /**
   * Reconstrói um ticket a partir de uma linha do arquivo CSV.
   * @param {string} linha
   * @param {(placa: string) => {tipo: string, documento: string|null}} identificar
   * @returns {TicketEstacionamento}
   */
  static deCSV(linha, identificar) {
    const [placa, entrada, saida, custo, desconto, pago] = linha.split(',').map((c) => c.trim());
    const { tipo, documento } = identificar(placa);
    const ticket = new TicketEstacionamento(placa, tipo, deISOLocal(entrada), documento);
    if (saida) {
      const valorCusto = Number(custo || 0);
      const valorDesconto = Number(desconto || 0);
      ticket.fechar(deISOLocal(saida), {
        custo: valorCusto,
        identificadorDesconto: valorDesconto > 0 ? 'Cliente Frequente' : 'nenhum',
        valorDesconto,
        valorDevido: Number((valorCusto - valorDesconto).toFixed(2)),
        valorPago: Number(pago || 0),
      });
    }
    return ticket;
  }

  toString() {
    const saida = this.estaAberto ? 'em aberto' : formatarDataHora(this.#saida);
    return `#${this.#id} ${this.#placa} (${this.#tipoCliente}) | entrada ${formatarDataHora(this.#entrada)} | saída ${saida}`;
  }
}
