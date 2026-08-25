import { Cliente } from './Cliente.js';

/**
 * Empresa instalada no complexo.
 *
 * Regras do documento do projeto:
 * - pode cadastrar quantos veículos desejar, vinculados ao seu CNPJ, e todos
 *   podem estacionar simultaneamente;
 * - a cobrança é feita por diária;
 * - nenhum veículo da empresa pode permanecer no estacionamento após a
 *   meia-noite: caso ocorra, é aplicada uma multa adicional por dia;
 * - os débitos são acumulados no cadastro e, periodicamente, é emitido um
 *   boleto; se o boleto não for quitado, a empresa passa a ser considerada
 *   inadimplente e todos os seus veículos ficam impedidos de acessar o
 *   estacionamento até a regularização.
 */
export class Empresa extends Cliente {
  /** Sem limite de placas. */
  static LIMITE_DE_PLACAS = Infinity;

  #saldoDevedor;
  #boletoEmAberto;
  #inadimplente;

  /**
   * @param {string} cnpj
   * @param {string} nome
   * @param {number} [saldoDevedor] débito já acumulado
   */
  constructor(cnpj, nome, saldoDevedor = 0) {
    super(cnpj, nome);
    this.#saldoDevedor = Number(saldoDevedor) || 0;
    this.#boletoEmAberto = 0;
    this.#inadimplente = false;
  }

  get saldoDevedor() {
    return Number(this.#saldoDevedor.toFixed(2));
  }

  get boletoEmAberto() {
    return Number(this.#boletoEmAberto.toFixed(2));
  }

  get inadimplente() {
    return this.#inadimplente;
  }

  /** Empresa inadimplente tem todos os veículos impedidos de entrar. */
  get estaImpedido() {
    return this.#inadimplente;
  }

  get motivoImpedimento() {
    return this.#inadimplente
      ? `Empresa inadimplente: boleto de R$ ${this.boletoEmAberto.toFixed(2)} não quitado.`
      : null;
  }

  /**
   * Custo por diária, com multa adicional para cada dia em que o veículo
   * permaneceu após a meia-noite.
   * @param {import('../TicketEstacionamento.js').TicketEstacionamento} ticket
   * @param {Date} saida
   * @param {import('../Tarifas.js').Tarifas} tarifas
   * @returns {number}
   */
  calcularCusto(ticket, saida, tarifas) {
    const diarias = ticket.quantidadeDiarias(saida);
    const diasAposMeiaNoite = Math.max(0, diarias - 1);
    const valor = diarias * tarifas.diariaEmpresa
      + diasAposMeiaNoite * tarifas.multaEmpresaPorDia;
    return Number(valor.toFixed(2));
  }

  /**
   * O valor não é pago na cancela: fica acumulado como débito da empresa,
   * que depois é cobrado por boleto.
   * @param {number} valorDevido
   * @returns {number} valor pago no momento da saída (sempre zero)
   */
  registrarPagamento(valorDevido) {
    this.#saldoDevedor = Number((this.#saldoDevedor + valorDevido).toFixed(2));
    return 0;
  }

  /**
   * Emite o boleto com todo o débito acumulado até o momento.
   * @returns {number} valor do boleto emitido
   */
  emitirBoleto() {
    this.#boletoEmAberto = Number((this.#boletoEmAberto + this.#saldoDevedor).toFixed(2));
    this.#saldoDevedor = 0;
    return this.boletoEmAberto;
  }

  /** Registra o vencimento do boleto sem pagamento: a empresa fica inadimplente. */
  registrarBoletoNaoQuitado() {
    if (this.#boletoEmAberto > 0) {
      this.#inadimplente = true;
    }
    return this.#inadimplente;
  }

  /** Quita o boleto em aberto e regulariza a situação da empresa. */
  quitarBoleto() {
    this.#boletoEmAberto = 0;
    this.#inadimplente = false;
    return true;
  }

  get situacaoFinanceira() {
    return {
      descricao: this.#inadimplente ? 'débito vencido (inadimplente)' : 'débito acumulado',
      valor: Number((this.#saldoDevedor + this.#boletoEmAberto).toFixed(2)),
    };
  }
}
