import { Placa } from '../Placa.js';
import {
  LimiteDePlacasError,
  NaoEncontradoError,
  PlacaDuplicadaError,
} from '../../infra/erros.js';

/**
 * Classe abstrata que representa um cliente do estacionamento (Figura 1).
 *
 * Concentra o que é comum a estudantes, professores e empresas: documento
 * (CPF/CNPJ), nome e o conjunto de placas vinculadas. As placas são guardadas
 * em um Set, o que impede naturalmente o cadastro de placas duplicadas para o
 * mesmo cliente e agiliza a verificação de veículos.
 *
 * Os métodos `calcularCusto` e `autorizarEntrada` são o ponto de polimorfismo:
 * cada categoria responde de forma diferente, e o restante do sistema não
 * precisa saber com qual tipo de cliente está lidando.
 */
export class Cliente {
  /** Limite de placas da categoria; Infinity significa sem limite (empresas). */
  static LIMITE_DE_PLACAS = Infinity;

  #documento;
  #nome;
  #placas;

  /**
   * @param {string} documento CPF ou CNPJ
   * @param {string} nome
   */
  constructor(documento, nome) {
    if (new.target === Cliente) {
      throw new TypeError('Cliente é uma classe abstrata; use Estudante, Professor ou Empresa.');
    }
    this.#documento = String(documento).trim();
    this.#nome = String(nome).trim();
    this.#placas = new Set(); // Set: evita placas duplicadas no mesmo cliente
  }

  get documento() { return this.#documento; }
  get nome() { return this.#nome; }

  /** Cópia do conjunto de placas (protege a coleção interna). */
  get placas() {
    return new Set(this.#placas);
  }

  get quantidadeDePlacas() {
    return this.#placas.size;
  }

  /** Limite de placas da categoria do cliente. */
  get limiteDePlacas() {
    return this.constructor.LIMITE_DE_PLACAS;
  }

  /** Rótulo da categoria, gravado no ticket e usado nos relatórios. */
  get tipo() {
    return this.constructor.name;
  }

  /**
   * Vincula uma placa ao cliente, respeitando o limite da categoria.
   * @param {string|Placa} placa
   * @returns {string} placa normalizada
   */
  adicionarPlaca(placa) {
    const codigo = placa instanceof Placa ? placa.codigo : new Placa(placa).codigo;

    if (this.#placas.has(codigo)) {
      throw new PlacaDuplicadaError(`A placa ${codigo} já está vinculada a ${this.#nome}.`);
    }
    if (this.#placas.size >= this.limiteDePlacas) {
      throw new LimiteDePlacasError(
        `${this.tipo} pode cadastrar no máximo ${this.limiteDePlacas} placa(s).`,
      );
    }

    this.#placas.add(codigo);
    return codigo;
  }

  /**
   * Remove uma placa do cliente.
   * @param {string|Placa} placa
   */
  removerPlaca(placa) {
    const codigo = placa instanceof Placa ? placa.codigo : Placa.normalizar(placa);
    if (!this.#placas.delete(codigo)) {
      throw new NaoEncontradoError(`A placa ${codigo} não está vinculada a ${this.#nome}.`);
    }
    return codigo;
  }

  /** @param {string|Placa} placa @returns {boolean} */
  possuiPlaca(placa) {
    const codigo = placa instanceof Placa ? placa.codigo : Placa.normalizar(placa);
    return this.#placas.has(codigo);
  }

  /**
   * Indica se o cliente está impedido de entrar no estacionamento.
   * Cada categoria tem o seu motivo (saldo negativo, inadimplência, bloqueio).
   * @returns {boolean}
   */
  get estaImpedido() {
    return false;
  }

  /** Motivo do impedimento, exibido nos relatórios. */
  get motivoImpedimento() {
    return null;
  }

  /**
   * Verifica se a entrada de um veículo pode ser autorizada.
   * @param {string} _placa placa normalizada
   * @param {string[]} _placasNoPatio placas do cliente atualmente estacionadas
   * @returns {{autorizado: boolean, motivo: string|null}}
   */
  autorizarEntrada(_placa, _placasNoPatio = []) {
    if (this.estaImpedido) {
      return { autorizado: false, motivo: this.motivoImpedimento };
    }
    return { autorizado: true, motivo: null };
  }

  /**
   * Calcula o custo de um ticket. Método abstrato: cada categoria aplica a sua
   * regra de cobrança (polimorfismo).
   * @param {import('../TicketEstacionamento.js').TicketEstacionamento} _ticket
   * @param {Date} _saida
   * @param {import('../Tarifas.js').Tarifas} _tarifas
   * @returns {number}
   */
  calcularCusto(_ticket, _saida, _tarifas) {
    throw new TypeError('O método calcularCusto deve ser implementado na subclasse.');
  }

  /**
   * Registra o pagamento na saída. Cada categoria decide como quitar o valor
   * (débito em créditos, acúmulo em boleto, pagamento na cancela).
   * @param {number} valorDevido
   * @returns {number} valor efetivamente pago no momento da saída
   */
  registrarPagamento(valorDevido) {
    return valorDevido;
  }

  /** Situação financeira do cliente, usada no relatório de situação. */
  get situacaoFinanceira() {
    return { descricao: 'sem valores em aberto', valor: 0 };
  }

  toString() {
    return `${this.tipo} ${this.#nome} (${this.#documento})`;
  }
}
