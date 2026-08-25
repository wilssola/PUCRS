import { Desconto } from './Desconto.js';
import { DescontoClienteFrequente } from './DescontoClienteFrequente.js';

/**
 * Política de descontos da EstACME.
 *
 * Mantém a lista de descontos ativos e escolhe, para cada saída, o desconto
 * aplicável mais vantajoso. Registrar um novo tipo de desconto é apenas
 * chamar `registrar(new MeuDesconto())`, sem alterar o restante do sistema.
 */
export class PoliticaDescontos {
  #descontos;

  /** @param {Desconto[]} [descontos] descontos ativos (por padrão, Cliente Frequente) */
  constructor(descontos = [new DescontoClienteFrequente()]) {
    this.#descontos = [];
    descontos.forEach((d) => this.registrar(d));
  }

  /** @param {Desconto} desconto */
  registrar(desconto) {
    if (!(desconto instanceof Desconto)) {
      throw new TypeError('Só é possível registrar objetos derivados de Desconto.');
    }
    this.#descontos.push(desconto);
    return this;
  }

  get descontos() {
    return [...this.#descontos];
  }

  /**
   * Aplica o melhor desconto disponível para o atendimento.
   * @param {number} custo custo calculado pelo cliente
   * @param {object} contexto {tipoCliente, referencia, historico}
   * @returns {{identificador: string, valor: number}} "nenhum" quando não há desconto
   */
  aplicar(custo, contexto) {
    let melhor = { identificador: 'nenhum', valor: 0 };

    this.#descontos
      .filter((desconto) => desconto.ehAplicavel(contexto))
      .forEach((desconto) => {
        const valor = desconto.calcular(custo, contexto);
        if (valor > melhor.valor) {
          melhor = { identificador: desconto.identificador, valor };
        }
      });

    return melhor;
  }
}
