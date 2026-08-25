import { Cliente } from './Cliente.js';

/**
 * Professor da universidade.
 *
 * Regras do documento do projeto:
 * - pode cadastrar até dois veículos vinculados ao seu CPF;
 * - a entrada é gratuita (os registros existem apenas para controle e seguro);
 * - apenas um veículo do professor pode permanecer estacionado ao mesmo tempo:
 *   se um já estiver no pátio, a entrada do segundo é negada.
 */
export class Professor extends Cliente {
  /** Até duas placas por professor. */
  static LIMITE_DE_PLACAS = 2;

  /**
   * @param {string} placa placa que solicita a entrada
   * @param {string[]} placasNoPatio placas do professor já estacionadas
   * @returns {{autorizado: boolean, motivo: string|null}}
   */
  autorizarEntrada(placa, placasNoPatio = []) {
    const base = super.autorizarEntrada(placa, placasNoPatio);
    if (!base.autorizado) return base;

    if (placasNoPatio.length > 0) {
      return {
        autorizado: false,
        motivo: `O professor já possui o veículo ${placasNoPatio[0]} no estacionamento; `
          + 'apenas um veículo pode permanecer por vez.',
      };
    }
    return { autorizado: true, motivo: null };
  }

  /** A entrada do professor é gratuita: o custo é sempre zero. */
  calcularCusto() {
    return 0;
  }

  get situacaoFinanceira() {
    return { descricao: 'isento de cobrança', valor: 0 };
  }
}
