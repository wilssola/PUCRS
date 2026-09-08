/**
 * Classe abstrata do mecanismo de descontos.
 *
 * Cada desconto sabe (a) se é aplicável a um determinado atendimento e
 * (b) quanto abater do custo. Novos descontos são criados apenas herdando desta
 * classe e registrando-os na PoliticaDescontos — nenhuma classe de cliente
 * precisa ser alterada, atendendo à exigência de extensão futura.
 */
export class Desconto {
  #identificador;

  /** @param {string} identificador texto gravado no registro (ex.: "ClienteFrequente") */
  constructor(identificador) {
    if (new.target === Desconto) {
      throw new TypeError('Desconto é uma classe abstrata e não pode ser instanciada.');
    }
    this.#identificador = identificador;
  }

  get identificador() {
    return this.#identificador;
  }

  /**
   * Indica se o desconto vale para o atendimento em questão.
   * @param {object} _contexto dados do atendimento (ticket, cliente, histórico)
   * @returns {boolean}
   */
  ehAplicavel(_contexto) {
    throw new TypeError('O método ehAplicavel(contexto) deve ser implementado na subclasse.');
  }

  /**
   * Valor a ser abatido do custo.
   * @param {number} _custo
   * @param {object} _contexto
   * @returns {number}
   */
  calcular(_custo, _contexto) {
    throw new TypeError('O método calcular(custo, contexto) deve ser implementado na subclasse.');
  }

  toString() {
    return this.#identificador;
  }
}
