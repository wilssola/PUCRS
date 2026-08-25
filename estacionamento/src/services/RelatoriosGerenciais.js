import { formatarDataHora, formatarReal } from '../infra/tempo.js';

/**
 * Relatórios gerenciais (classe RelatoriosGerenciais da Figura 1).
 *
 * Consulta o registro de entradas e saídas e o cadastro de clientes e resume os
 * dados exigidos no documento do projeto. Não contém regra de cobrança: apenas
 * agrega o que já foi calculado na saída dos veículos.
 */
export class RelatoriosGerenciais {
  #registro;
  #cadastro;

  /**
   * @param {import('./RegistroDeEntradas_E_Saidas.js').RegistroDeEntradas_E_Saidas} registro
   * @param {import('./CadastroClientes.js').CadastroClientes} cadastro
   */
  constructor(registro, cadastro) {
    this.#registro = registro;
    this.#cadastro = cadastro;
  }

  /** Tickets encerrados dentro do período informado (pela data de saída). */
  #encerradosNoPeriodo(inicio = null, fim = null) {
    return this.#registro.tickets.filter(
      (t) => !t.estaAberto
        && (inicio === null || t.saida >= inicio)
        && (fim === null || t.saida <= fim),
    );
  }

  /**
   * a) Valor total arrecadado por período, opcionalmente filtrado por uma ou
   *    mais categorias de cliente.
   * @param {Date} [inicio]
   * @param {Date} [fim]
   * @param {string[]} [categorias] ex.: ['Avulso', 'Estudante']
   * @returns {{valorDevido: number, valorPago: number, atendimentos: number}}
   */
  arrecadacao(inicio = null, fim = null, categorias = null) {
    const tickets = this.#encerradosNoPeriodo(inicio, fim)
      .filter((t) => categorias === null || categorias.includes(t.tipoCliente));

    const valorDevido = tickets.reduce((s, t) => s + t.valorDevido, 0);
    const valorPago = tickets.reduce((s, t) => s + t.valorPago, 0);

    return {
      atendimentos: tickets.length,
      valorDevido: Number(valorDevido.toFixed(2)),
      valorPago: Number(valorPago.toFixed(2)),
    };
  }

  /**
   * Arrecadação separada por categoria de cliente.
   * @returns {Record<string, {atendimentos: number, valorDevido: number, valorPago: number}>}
   */
  arrecadacaoPorCategoria(inicio = null, fim = null) {
    const resumo = {};
    this.#encerradosNoPeriodo(inicio, fim).forEach((t) => {
      resumo[t.tipoCliente] ??= { atendimentos: 0, valorDevido: 0, valorPago: 0 };
      const item = resumo[t.tipoCliente];
      item.atendimentos += 1;
      item.valorDevido = Number((item.valorDevido + t.valorDevido).toFixed(2));
      item.valorPago = Number((item.valorPago + t.valorPago).toFixed(2));
    });
    return resumo;
  }

  /**
   * b) Situação de um cliente cadastrado: veículos atualmente estacionados e
   *    saldo (estudante) ou débito (empresa).
   * @param {string} documento
   */
  situacaoDoCliente(documento) {
    const cliente = this.#cadastro.buscarPorDocumento(documento);
    return {
      cliente: cliente.toString(),
      tipo: cliente.tipo,
      placasCadastradas: [...cliente.placas],
      veiculosEstacionados: this.#registro.placasNoPatioDoCliente(cliente),
      situacaoFinanceira: cliente.situacaoFinanceira,
      impedido: cliente.estaImpedido,
      motivo: cliente.motivoImpedimento,
    };
  }

  /**
   * c) Registros de estacionamento de um cliente cadastrado em um período,
   *    listando todos os seus veículos.
   */
  registrosDoCliente(documento, inicio = null, fim = null) {
    const cliente = this.#cadastro.buscarPorDocumento(documento);
    return this.#registro.consultarPorCliente(cliente, inicio, fim);
  }

  /** d) Registros de clientes não cadastrados (avulsos) em um período. */
  registrosDeAvulsos(inicio = null, fim = null) {
    return this.#registro.consultarAvulsos(inicio, fim);
  }

  /**
   * e) Relação dos clientes impedidos de entrar: cadastrados (saldo negativo ou
   *    inadimplência) e placas avulsas na lista de bloqueio.
   */
  impedidosDeEntrar() {
    const cadastrados = this.#cadastro.clientesImpedidos().map((c) => ({
      identificacao: c.toString(),
      motivo: c.motivoImpedimento,
    }));

    const avulsos = [...this.#registro.placasBloqueadas].map((placa) => ({
      identificacao: `Avulso ${placa}`,
      motivo: 'Recusa de pagamento registrada na saída.',
    }));

    return [...cadastrados, ...avulsos];
  }

  /**
   * f) Relação dos 10 clientes mais frequentes do ano.
   *    Clientes cadastrados são contados pelo documento; avulsos, pela placa.
   * @param {number} ano
   * @param {number} [limite]
   */
  clientesMaisFrequentes(ano, limite = 10) {
    const contagem = new Map();

    this.#registro.tickets
      .filter((t) => t.entrada.getFullYear() === ano)
      .forEach((t) => {
        const chave = t.documentoCliente ?? `Avulso ${t.placa}`;
        const atual = contagem.get(chave) ?? { identificacao: chave, tipo: t.tipoCliente, visitas: 0 };
        atual.visitas += 1;
        contagem.set(chave, atual);
      });

    return [...contagem.values()]
      .map((item) => {
        if (item.tipo === 'Avulso') return item;
        const cliente = this.#cadastro.buscarPorDocumento(item.identificacao);
        return { ...item, identificacao: `${cliente.nome} (${cliente.documento})` };
      })
      .sort((a, b) => b.visitas - a.visitas)
      .slice(0, limite);
  }

  /**
   * Relatório consolidado em texto, usado pela interface do sistema.
   * @param {number} [ano]
   * @returns {string}
   */
  emTexto(ano = new Date().getFullYear()) {
    const linhas = [];
    const total = this.arrecadacao();

    linhas.push('='.repeat(76));
    linhas.push('RELATÓRIOS GERENCIAIS - EstACME');
    linhas.push('='.repeat(76));
    linhas.push(`Atendimentos encerrados: ${total.atendimentos}`);
    linhas.push(`Valor devido acumulado:  ${formatarReal(total.valorDevido)}`);
    linhas.push(`Valor efetivamente pago: ${formatarReal(total.valorPago)}`);

    linhas.push('');
    linhas.push('-- Arrecadação por categoria de cliente ------------------------------------');
    Object.entries(this.arrecadacaoPorCategoria()).forEach(([categoria, dados]) => {
      linhas.push(
        `  ${categoria.padEnd(10)} ${String(dados.atendimentos).padStart(3)} atendimento(s) | `
        + `devido ${formatarReal(dados.valorDevido).padStart(11)} | pago ${formatarReal(dados.valorPago)}`,
      );
    });

    linhas.push('');
    linhas.push('-- Veículos no pátio -------------------------------------------------------');
    const abertos = this.#registro.ticketsAbertos;
    if (abertos.length === 0) {
      linhas.push('  Nenhum veículo no pátio.');
    } else {
      abertos.forEach((t) => {
        linhas.push(`  ${t.placa} (${t.tipoCliente}) desde ${formatarDataHora(t.entrada)}`);
      });
    }

    linhas.push('');
    linhas.push('-- Clientes impedidos de entrar --------------------------------------------');
    const impedidos = this.impedidosDeEntrar();
    if (impedidos.length === 0) {
      linhas.push('  Nenhum cliente impedido.');
    } else {
      impedidos.forEach((i) => linhas.push(`  ${i.identificacao}: ${i.motivo}`));
    }

    linhas.push('');
    linhas.push(`-- 10 clientes mais frequentes de ${ano} -----------------------------------`);
    const frequentes = this.clientesMaisFrequentes(ano);
    if (frequentes.length === 0) {
      linhas.push('  Nenhum registro no ano.');
    } else {
      frequentes.forEach((c, i) => {
        linhas.push(`  ${String(i + 1).padStart(2)}. ${c.identificacao} - ${c.visitas} visita(s) [${c.tipo}]`);
      });
    }

    linhas.push('='.repeat(76));
    return linhas.join('\n');
  }
}
