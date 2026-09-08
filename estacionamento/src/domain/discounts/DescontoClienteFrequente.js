import { Desconto } from './Desconto.js';
import { diferencaEmDias } from '../../infra/tempo.js';

/**
 * Único desconto ativo na EstACME.
 *
 * Regra do documento do projeto:
 *   "ClienteFrequente: clientes avulsos que utilizarem o estacionamento três
 *    vezes nos últimos cinco dias recebem 20% de desconto. O desconto é
 *    concedido independentemente de o cliente já ter sido beneficiado
 *    anteriormente. O desconto deve ser identificado internamente pela string
 *    'ClienteFrequente'."
 *
 * Interpretação adotada:
 * - a utilização que está sendo cobrada CONTA para o total; ou seja, já na
 *   terceira utilização dentro da janela o cliente recebe o desconto;
 * - cada utilização é datada pela sua ENTRADA no estacionamento;
 * - a janela de cinco dias abrange o dia da utilização atual e os quatro dias
 *   anteriores;
 * - o desconto continua valendo nas utilizações seguintes que satisfaçam a
 *   regra, mesmo que o cliente já tenha sido beneficiado antes;
 * - vale apenas para clientes avulsos, identificados exclusivamente pela placa.
 */
export class DescontoClienteFrequente extends Desconto {
  static IDENTIFICADOR = 'ClienteFrequente';
  static PERCENTUAL = 20;
  static USOS_MINIMOS = 3;
  static JANELA_EM_DIAS = 5;

  constructor() {
    super(DescontoClienteFrequente.IDENTIFICADOR);
  }

  /**
   * Conta quantas utilizações do veículo estão dentro da janela, somando a
   * utilização atual às anteriores registradas no histórico.
   *
   * @param {{referencia: Date, historico: import('../TicketEstacionamento.js').TicketEstacionamento[]}} contexto
   * @returns {number}
   */
  contarUtilizacoes(contexto) {
    const anteriores = contexto.historico.filter((ticket) => {
      const dias = diferencaEmDias(ticket.entrada, contexto.referencia);
      return dias >= 0 && dias < DescontoClienteFrequente.JANELA_EM_DIAS;
    }).length;

    return anteriores + 1; // + 1: a utilização que está sendo cobrada agora
  }

  /**
   * @param {{tipoCliente: string, referencia: Date, historico: import('../TicketEstacionamento.js').TicketEstacionamento[]}} contexto
   * @returns {boolean}
   */
  ehAplicavel(contexto) {
    if (contexto.tipoCliente !== 'Avulso') return false;
    return this.contarUtilizacoes(contexto) >= DescontoClienteFrequente.USOS_MINIMOS;
  }

  /**
   * @param {number} custo
   * @returns {number} valor do abatimento
   */
  calcular(custo) {
    return Number(((custo * DescontoClienteFrequente.PERCENTUAL) / 100).toFixed(2));
  }
}
