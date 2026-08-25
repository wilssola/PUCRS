import { Cliente } from './Cliente.js';

/**
 * Estudante da universidade.
 *
 * Regras do documento do projeto:
 * - pode cadastrar apenas uma placa;
 * - o custo é um valor fixo por ingresso, válido quando a entrada e a saída
 *   ocorrem no mesmo dia; se a saída ocorrer após a meia-noite, é cobrado um
 *   novo ingresso (um por dia-calendário);
 * - o uso é pré-pago: o estudante mantém créditos na conta;
 * - se o saldo for insuficiente na saída, o sistema permite que ele fique
 *   negativo e libera a saída do veículo;
 * - novas entradas ficam bloqueadas enquanto o saldo estiver negativo.
 */
export class Estudante extends Cliente {
  /** Uma única placa por estudante. */
  static LIMITE_DE_PLACAS = 1;

  #saldo;

  /**
   * @param {string} cpf
   * @param {string} nome
   * @param {number} [saldoInicial] créditos já carregados
   */
  constructor(cpf, nome, saldoInicial = 0) {
    super(cpf, nome);
    this.#saldo = Number(saldoInicial) || 0;
  }

  get saldo() {
    return Number(this.#saldo.toFixed(2));
  }

  /**
   * Adiciona créditos à conta do estudante (recarga pré-paga).
   * @param {number} valor
   */
  carregarSaldo(valor) {
    if (valor <= 0) {
      throw new RangeError('O valor da recarga deve ser positivo.');
    }
    this.#saldo = Number((this.#saldo + valor).toFixed(2));
    return this.saldo;
  }

  /** O estudante fica impedido enquanto o saldo estiver negativo. */
  get estaImpedido() {
    return this.#saldo < 0;
  }

  get motivoImpedimento() {
    return this.estaImpedido
      ? `Saldo negativo de ${this.saldo.toFixed(2)}; é necessário recarregar créditos.`
      : null;
  }

  /**
   * Custo = um ingresso por dia-calendário utilizado.
   * @param {import('../TicketEstacionamento.js').TicketEstacionamento} ticket
   * @param {Date} saida
   * @param {import('../Tarifas.js').Tarifas} tarifas
   * @returns {number}
   */
  calcularCusto(ticket, saida, tarifas) {
    const ingressos = ticket.quantidadeDiarias(saida);
    return Number((ingressos * tarifas.ingressoEstudante).toFixed(2));
  }

  /**
   * O valor é debitado dos créditos; o saldo pode ficar negativo, e nesse caso
   * a saída é liberada do mesmo jeito.
   * @param {number} valorDevido
   * @returns {number} valor efetivamente pago (o débito realizado)
   */
  registrarPagamento(valorDevido) {
    this.#saldo = Number((this.#saldo - valorDevido).toFixed(2));
    return valorDevido;
  }

  get situacaoFinanceira() {
    return {
      descricao: this.#saldo < 0 ? 'saldo negativo' : 'saldo disponível',
      valor: this.saldo,
    };
  }
}
