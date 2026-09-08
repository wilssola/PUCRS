import { TicketEstacionamento } from '../domain/TicketEstacionamento.js';
import { ClienteAvulso } from '../domain/clients/ClienteAvulso.js';
import { Placa } from '../domain/Placa.js';
import { Tarifas } from '../domain/Tarifas.js';
import { PoliticaDescontos } from '../domain/discounts/PoliticaDescontos.js';
import {
  EntradaNaoAutorizadaError,
  RegistroNaoEncontradoError,
  VeiculoJaEstacionadoError,
} from '../infra/erros.js';

/**
 * Registro de entradas e saídas (classe RegistroDeEntradas_E_Saidas da Figura 1).
 *
 * Responsável por autorizar entradas, processar saídas e manter todos os
 * tickets de estacionamento. Consulta o CadastroClientes para identificar o
 * proprietário do veículo e delega o cálculo do custo ao próprio cliente
 * (polimorfismo): esta classe não conhece as regras de cobrança de cada tipo.
 *
 * Estruturas usadas:
 * - Map placa -> ticket aberto: recuperação imediata do registro na saída;
 * - Set de placas bloqueadas: clientes avulsos que se recusaram a pagar.
 */
export class RegistroDeEntradas_E_Saidas {
  #cadastro;
  #tarifas;
  #politicaDescontos;
  #tickets;
  #ticketsAbertos;
  #placasBloqueadas;

  /**
   * @param {import('./CadastroClientes.js').CadastroClientes} cadastro
   * @param {Tarifas} [tarifas]
   * @param {PoliticaDescontos} [politicaDescontos]
   */
  constructor(cadastro, tarifas = new Tarifas(), politicaDescontos = new PoliticaDescontos()) {
    this.#cadastro = cadastro;
    this.#tarifas = tarifas;
    this.#politicaDescontos = politicaDescontos;
    this.#tickets = [];
    this.#ticketsAbertos = new Map();
    this.#placasBloqueadas = new Set();
  }

  get tarifas() { return this.#tarifas; }
  get cadastro() { return this.#cadastro; }
  get tickets() { return [...this.#tickets]; }
  get ticketsAbertos() { return [...this.#ticketsAbertos.values()]; }
  get placasBloqueadas() { return new Set(this.#placasBloqueadas); }

  // ------------------------------------------------------------------ entrada

  /**
   * Autoriza (ou nega) a entrada de um veículo e cria o ticket.
   *
   * @param {string} textoPlaca placa lida pela câmera de entrada
   * @param {Date} [entrada] data e hora da entrada
   * @returns {TicketEstacionamento}
   */
  autorizarEntrada(textoPlaca, entrada = new Date()) {
    const placa = new Placa(textoPlaca).codigo;

    if (this.#ticketsAbertos.has(placa)) {
      throw new VeiculoJaEstacionadoError(`O veículo ${placa} já está no estacionamento.`);
    }
    if (this.#placasBloqueadas.has(placa)) {
      throw new EntradaNaoAutorizadaError(
        `A placa ${placa} está na lista de bloqueio por falta de pagamento.`,
      );
    }

    const cliente = this.#cadastro.buscarPorPlaca(placa);

    if (cliente !== null) {
      // veículo pré-cadastrado: nunca pode usar a modalidade avulsa
      const placasNoPatio = this.placasNoPatioDoCliente(cliente);
      const decisao = cliente.autorizarEntrada(placa, placasNoPatio);
      if (!decisao.autorizado) {
        throw new EntradaNaoAutorizadaError(`Entrada negada para ${placa}: ${decisao.motivo}`);
      }
    }

    const tipo = cliente === null ? 'Avulso' : cliente.tipo;
    const documento = cliente === null ? null : cliente.documento;
    const ticket = new TicketEstacionamento(placa, tipo, entrada, documento);

    this.#tickets.push(ticket);
    this.#ticketsAbertos.set(placa, ticket);
    return ticket;
  }

  // -------------------------------------------------------------------- saída

  /**
   * Processa a saída de um veículo: recupera o ticket pela placa, calcula o
   * custo conforme o tipo de cliente, aplica o desconto vigente, registra os
   * valores e libera a saída.
   *
   * @param {string} textoPlaca
   * @param {Date} [saida]
   * @param {{pagou?: boolean}} [opcoes] pagou=false registra recusa de pagamento
   * @returns {TicketEstacionamento}
   */
  processarSaida(textoPlaca, saida = new Date(), { pagou = true } = {}) {
    const placa = new Placa(textoPlaca).codigo;
    const ticket = this.#ticketsAbertos.get(placa);

    if (ticket === undefined) {
      throw new RegistroNaoEncontradoError(`Não há registro em aberto para o veículo ${placa}.`);
    }

    // o cliente avulso não está no cadastro: é criado apenas para o cálculo
    const cliente = this.#cadastro.buscarPorPlaca(placa) ?? new ClienteAvulso(placa);

    const custo = cliente.calcularCusto(ticket, saida, this.#tarifas);
    const desconto = this.#politicaDescontos.aplicar(custo, {
      tipoCliente: ticket.tipoCliente,
      // a utilização é datada pela entrada, e não pela saída, para que uma
      // permanência longa não desloque a janela de cinco dias do desconto
      referencia: ticket.entrada,
      historico: this.#historicoDaPlaca(placa, ticket),
    });

    const valorDevido = Number((custo - desconto.valor).toFixed(2));
    let valorPago = 0;

    if (pagou) {
      valorPago = cliente.registrarPagamento(valorDevido);
    } else if (ticket.tipoCliente === 'Avulso') {
      // saída é liberada, mas a placa entra na lista de bloqueio
      this.#placasBloqueadas.add(placa);
    }

    ticket.fechar(saida, {
      custo,
      identificadorDesconto: desconto.identificador,
      valorDesconto: desconto.valor,
      valorDevido,
      valorPago,
    });

    this.#ticketsAbertos.delete(placa);
    return ticket;
  }

  /**
   * Utilizações anteriores da mesma placa, base do desconto de cliente
   * frequente. O ticket que está sendo fechado é excluído aqui porque o
   * próprio desconto o soma à contagem.
   * @param {string} placa
   * @param {TicketEstacionamento} atual
   */
  #historicoDaPlaca(placa, atual) {
    return this.#tickets.filter((t) => t.placa.codigo === placa && t.id !== atual.id);
  }

  // ----------------------------------------------------------------- consultas

  /**
   * Placas de um cliente que estão atualmente no pátio.
   * @param {import('../domain/clients/Cliente.js').Cliente} cliente
   * @returns {string[]}
   */
  placasNoPatioDoCliente(cliente) {
    return this.ticketsAbertos
      .filter((t) => cliente.possuiPlaca(t.placa))
      .map((t) => t.placa.codigo);
  }

  /**
   * Tickets de uma placa dentro de um período (pela data de entrada).
   * @param {string} textoPlaca
   * @param {Date} inicio
   * @param {Date} fim
   */
  consultarPorPlaca(textoPlaca, inicio = null, fim = null) {
    const placa = Placa.normalizar(textoPlaca);
    return this.#tickets.filter(
      (t) => t.placa.codigo === placa
        && (inicio === null || t.entrada >= inicio)
        && (fim === null || t.entrada <= fim),
    );
  }

  /**
   * Tickets de um cliente cadastrado (todos os seus veículos) em um período.
   * @param {import('../domain/clients/Cliente.js').Cliente} cliente
   */
  consultarPorCliente(cliente, inicio = null, fim = null) {
    return this.#tickets.filter(
      (t) => cliente.possuiPlaca(t.placa)
        && (inicio === null || t.entrada >= inicio)
        && (fim === null || t.entrada <= fim),
    );
  }

  /** Tickets de clientes não cadastrados (avulsos) em um período. */
  consultarAvulsos(inicio = null, fim = null) {
    return this.#tickets.filter(
      (t) => t.tipoCliente === 'Avulso'
        && (inicio === null || t.entrada >= inicio)
        && (fim === null || t.entrada <= fim),
    );
  }

  /** Bloqueia manualmente uma placa avulsa (uso administrativo). */
  bloquearPlaca(textoPlaca) {
    this.#placasBloqueadas.add(new Placa(textoPlaca).codigo);
  }

  /** Retira uma placa da lista de bloqueio após a regularização. */
  desbloquearPlaca(textoPlaca) {
    return this.#placasBloqueadas.delete(Placa.normalizar(textoPlaca));
  }

  // ------------------------------------------------------------- persistência

  /**
   * Carrega os tickets a partir do conteúdo de um arquivo CSV
   * (placa,entrada,saida,custo,desconto,pago).
   * @param {string} conteudo
   * @returns {number} quantidade de tickets carregados
   */
  carregarDeTextoCSV(conteudo) {
    const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim().length > 0);

    linhas.forEach((linha) => {
      const ticket = TicketEstacionamento.deCSV(linha, (placa) => {
        const cliente = this.#cadastro.buscarPorPlaca(placa);
        return {
          tipo: cliente === null ? 'Avulso' : cliente.tipo,
          documento: cliente === null ? null : cliente.documento,
        };
      });

      this.#tickets.push(ticket);
      if (ticket.estaAberto) {
        this.#ticketsAbertos.set(ticket.placa.codigo, ticket);
      }
    });

    return this.#tickets.length;
  }

  /** Gera o conteúdo CSV com todos os tickets. */
  paraTextoCSV() {
    return this.#tickets.map((t) => t.paraCSV()).join('\n');
  }
}
