import { Cliente } from './Cliente.js';
import { horasCheias } from '../../infra/tempo.js';

/**
 * Cliente avulso (não cadastrado).
 *
 * O documento do projeto determina que o cliente avulso é identificado
 * exclusivamente pela placa do veículo, sem CPF ou CNPJ associado. Esta classe
 * não faz parte do cadastro: ela é criada apenas no momento do atendimento,
 * para que o cálculo do custo continue sendo polimórfico.
 *
 * Regras de cobrança:
 * - valor fixo por hora, até o limite de seis horas;
 * - acima desse limite, aplica-se a tarifa de diária;
 * - se a permanência ultrapassar a meia-noite, é cobrada uma nova diária,
 *   independentemente do total de horas do dia anterior;
 * - se o cliente se recusar a pagar, a saída é liberada e a placa é incluída
 *   na lista de bloqueio (controlada pelo registro de entradas e saídas).
 */
export class ClienteAvulso extends Cliente {
  /** O avulso não cadastra placas: elas apenas identificam o atendimento. */
  static LIMITE_DE_PLACAS = 1;

  /** @param {string} placa placa que identifica o cliente avulso */
  constructor(placa) {
    super('não informado', `Avulso ${placa}`);
    this.adicionarPlaca(placa);
  }

  get tipo() {
    return 'Avulso';
  }

  /**
   * @param {import('../TicketEstacionamento.js').TicketEstacionamento} ticket
   * @param {Date} saida
   * @param {import('../Tarifas.js').Tarifas} tarifas
   * @returns {number}
   */
  calcularCusto(ticket, saida, tarifas) {
    const periodos = ticket.periodos(saida);

    const total = periodos.reduce((soma, periodo, indice) => {
      // o primeiro dia segue a regra de horas x limite; cada virada de
      // meia-noite acrescenta uma diária cheia
      if (indice > 0) return soma + tarifas.diaria;
      const horas = horasCheias(periodo.fim.getTime() - periodo.inicio.getTime());
      return soma + tarifas.valorAvulsoDoDia(horas);
    }, 0);

    return Number(total.toFixed(2));
  }
}
