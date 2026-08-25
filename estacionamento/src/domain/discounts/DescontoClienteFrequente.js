import { Desconto } from './Desconto.js';
import { diferencaEmDias } from '../../infra/tempo.js';

/**
 * Único desconto ativo na EstACME.
 *
 * Regra: clientes avulsos que utilizaram o estacionamento três vezes nos
 * últimos cinco dias recebem 20% de desconto. O benefício é concedido
 * independentemente de o cliente já ter sido beneficiado antes, e é
 * identificado internamente pela string "Cliente Frequente".
 */
export class DescontoClienteFrequente extends Desconto {
  static IDENTIFICADOR = 'Cliente Frequente';
  static PERCENTUAL = 20;
  static USOS_MINIMOS = 3;
  static JANELA_EM_DIAS = 5;

  constructor() {
    super(DescontoClienteFrequente.IDENTIFICADOR);
  }

  /**
   * @param {{tipoCliente: string, referencia: Date, historico: import('../TicketEstacionamento.js').TicketEstacionamento[]}} contexto
   * @returns {boolean}
   */
  ehAplicavel(contexto) {
    if (contexto.tipoCliente !== 'Avulso') return false;

    // conta as utilizações anteriores da mesma placa dentro da janela de 5 dias
    const usos = contexto.historico.filter((ticket) => {
      const dias = diferencaEmDias(ticket.entrada, contexto.referencia);
      return dias >= 0 && dias < DescontoClienteFrequente.JANELA_EM_DIAS;
    }).length;

    return usos >= DescontoClienteFrequente.USOS_MINIMOS;
  }

  /**
   * @param {number} custo
   * @returns {number} valor do abatimento
   */
  calcular(custo) {
    return Number(((custo * DescontoClienteFrequente.PERCENTUAL) / 100).toFixed(2));
  }
}
