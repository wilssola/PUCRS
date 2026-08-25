/**
 * Valores de cobrança da EstACME.
 *
 * O documento do projeto permite que os valores sejam constantes no código ou
 * carregados de um arquivo de texto. Aqui eles ficam reunidos em uma única
 * classe: um reajuste não exige alterar nenhuma regra de negócio.
 */
export class Tarifas {
  #valorHora;
  #limiteHoras;
  #diaria;
  #ingressoEstudante;
  #diariaEmpresa;
  #multaEmpresaPorDia;

  /**
   * @param {object} [opcoes]
   * @param {number} [opcoes.valorHora] valor fixo por hora do cliente avulso
   * @param {number} [opcoes.limiteHoras] a partir daqui cobra-se a diária
   * @param {number} [opcoes.diaria] diária do cliente avulso
   * @param {number} [opcoes.ingressoEstudante] valor fixo por ingresso
   * @param {number} [opcoes.diariaEmpresa] diária dos veículos de empresa
   * @param {number} [opcoes.multaEmpresaPorDia] multa por dia por permanecer após a meia-noite
   */
  constructor({
    valorHora = 5.0,
    limiteHoras = 6,
    diaria = 35.0,
    ingressoEstudante = 12.0,
    diariaEmpresa = 30.0,
    multaEmpresaPorDia = 40.0,
  } = {}) {
    this.#valorHora = valorHora;
    this.#limiteHoras = limiteHoras;
    this.#diaria = diaria;
    this.#ingressoEstudante = ingressoEstudante;
    this.#diariaEmpresa = diariaEmpresa;
    this.#multaEmpresaPorDia = multaEmpresaPorDia;
    Object.freeze(this);
  }

  get valorHora() { return this.#valorHora; }
  get limiteHoras() { return this.#limiteHoras; }
  get diaria() { return this.#diaria; }
  get ingressoEstudante() { return this.#ingressoEstudante; }
  get diariaEmpresa() { return this.#diariaEmpresa; }
  get multaEmpresaPorDia() { return this.#multaEmpresaPorDia; }

  /**
   * Valor de um dia de permanência do cliente avulso: valor fixo por hora até o
   * limite de horas; a partir daí aplica-se a diária.
   * @param {number} horas horas cheias do dia
   * @returns {number}
   */
  valorAvulsoDoDia(horas) {
    if (horas <= 0) return 0;
    if (horas <= this.#limiteHoras) {
      return Number((horas * this.#valorHora).toFixed(2));
    }
    return this.#diaria;
  }
}
