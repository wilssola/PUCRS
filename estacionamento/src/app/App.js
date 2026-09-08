import fs from 'node:fs';
import path from 'node:path';

import { CadastroClientes } from '../services/CadastroClientes.js';
import { RegistroDeEntradas_E_Saidas } from '../services/RegistroDeEntradas_E_Saidas.js';
import { RelatoriosGerenciais } from '../services/RelatoriosGerenciais.js';
import { Tarifas } from '../domain/Tarifas.js';
import { Estudante } from '../domain/clients/Estudante.js';
import { Professor } from '../domain/clients/Professor.js';
import { Empresa } from '../domain/clients/Empresa.js';
import { ErroDominio } from '../infra/erros.js';
import { formatarDataHora, formatarReal } from '../infra/tempo.js';
import { Terminal } from './Terminal.js';

/**
 * Interface com o usuário (classe App da Figura 1).
 *
 * Responsabilidades:
 *  - carregar os arquivos CSV na inicialização e gravá-los no encerramento;
 *  - apresentar os menus e conduzir o diálogo com o usuário;
 *  - acionar CadastroClientes, RegistroDeEntradas_E_Saidas e
 *    RelatoriosGerenciais, que concentram as regras de negócio.
 *
 * Nenhuma regra de cobrança ou de autorização é implementada aqui: a classe
 * apenas lê os dados digitados, chama o serviço adequado e mostra o resultado.
 */
export class App {
  static ARQUIVO_CLIENTES = 'clientes.csv';
  static ARQUIVO_REGISTROS = 'registros.csv';

  #cadastro;
  #registro;
  #relatorios;
  #terminal;
  #pastaDados;
  #pastaSemente;
  #alteracoesPendentes;

  /**
   * @param {string} pastaDados pasta com clientes.csv e registros.csv
   * @param {object} [opcoes]
   * @param {Tarifas} [opcoes.tarifas]
   * @param {Terminal} [opcoes.terminal]
   * @param {string|null} [opcoes.pastaSemente] cenário inicial copiado quando faltam arquivos
   */
  constructor(pastaDados, { tarifas = new Tarifas(), terminal = new Terminal(), pastaSemente = null } = {}) {
    this.#pastaDados = pastaDados;
    this.#pastaSemente = pastaSemente;
    this.#terminal = terminal;
    this.#cadastro = new CadastroClientes();
    this.#registro = new RegistroDeEntradas_E_Saidas(this.#cadastro, tarifas);
    this.#relatorios = new RelatoriosGerenciais(this.#registro, this.#cadastro);
    this.#alteracoesPendentes = false;
  }

  get cadastro() { return this.#cadastro; }
  get registro() { return this.#registro; }
  get relatorios() { return this.#relatorios; }
  get terminal() { return this.#terminal; }

  // =====================================================================
  // 1. PERSISTÊNCIA EM ARQUIVOS CSV
  // =====================================================================

  /** Caminho completo de um arquivo de dados. */
  #caminho(arquivo) {
    return path.join(this.#pastaDados, arquivo);
  }

  /**
   * Carrega integralmente os arquivos CSV para a memória.
   * Se um arquivo não existir e houver pasta de cenário inicial, ele é copiado
   * de lá; assim o sistema sempre inicia com dados válidos.
   *
   * @param {{restaurarCenario?: boolean}} [opcoes]
   */
  iniciar({ restaurarCenario = false } = {}) {
    fs.mkdirSync(this.#pastaDados, { recursive: true });

    if (this.#pastaSemente !== null) {
      [App.ARQUIVO_CLIENTES, App.ARQUIVO_REGISTROS].forEach((arquivo) => {
        const destino = this.#caminho(arquivo);
        const semente = path.join(this.#pastaSemente, arquivo);
        if ((restaurarCenario || !fs.existsSync(destino)) && fs.existsSync(semente)) {
          fs.copyFileSync(semente, destino);
        }
      });
    }

    const arquivoClientes = this.#caminho(App.ARQUIVO_CLIENTES);
    const arquivoRegistros = this.#caminho(App.ARQUIVO_REGISTROS);

    try {
      if (fs.existsSync(arquivoClientes)) {
        const total = this.#cadastro.carregarDeTextoCSV(fs.readFileSync(arquivoClientes, 'utf-8'));
        this.#terminal.informar(`Clientes carregados de ${App.ARQUIVO_CLIENTES}: ${total}`);
      } else {
        this.#terminal.informar(`Nenhum ${App.ARQUIVO_CLIENTES} encontrado: iniciando cadastro vazio.`);
      }

      if (fs.existsSync(arquivoRegistros)) {
        const total = this.#registro.carregarDeTextoCSV(fs.readFileSync(arquivoRegistros, 'utf-8'));
        this.#terminal.informar(`Registros carregados de ${App.ARQUIVO_REGISTROS}: ${total}`);
        this.#terminal.informar(`Veículos atualmente no pátio: ${this.#registro.ticketsAbertos.length}`);
      } else {
        this.#terminal.informar(`Nenhum ${App.ARQUIVO_REGISTROS} encontrado: iniciando sem registros.`);
      }
    } catch (erro) {
      this.#terminal.erro(`Falha ao ler os arquivos CSV: ${erro.message}`);
      this.#terminal.informar('O sistema continuará com os dados que conseguiu carregar.');
    }

    this.#alteracoesPendentes = false;
    return this;
  }

  /**
   * Grava os dados atualizados nos arquivos CSV.
   * Chamado manualmente pelo menu e automaticamente no encerramento.
   * @returns {boolean} verdadeiro quando a gravação foi concluída
   */
  salvar() {
    try {
      fs.mkdirSync(this.#pastaDados, { recursive: true });
      fs.writeFileSync(this.#caminho(App.ARQUIVO_CLIENTES), `${this.#cadastro.paraTextoCSV()}\n`, 'utf-8');
      fs.writeFileSync(this.#caminho(App.ARQUIVO_REGISTROS), `${this.#registro.paraTextoCSV()}\n`, 'utf-8');
      this.#alteracoesPendentes = false;
      this.#terminal.sucesso(
        `Dados gravados em ${this.#pastaDados} `
        + `(${this.#cadastro.totalClientes} cliente[s], ${this.#registro.tickets.length} registro[s]).`,
      );
      return true;
    } catch (erro) {
      this.#terminal.erro(`Não foi possível gravar os arquivos CSV: ${erro.message}`);
      return false;
    }
  }

  /** Salvamento automático no encerramento do sistema. */
  encerrar() {
    this.#terminal.subtitulo('Encerrando o sistema');
    this.salvar();
    this.#terminal.informar('Até logo!');
    this.#terminal.fechar();
  }

  /** Marca que existem alterações ainda não gravadas em disco. */
  #marcarAlteracao() {
    this.#alteracoesPendentes = true;
  }

  // =====================================================================
  // 2. INTERFACE COM O USUÁRIO
  // =====================================================================

  /** Laço principal: mostra o menu até o usuário escolher sair. */
  async executar() {
    this.#terminal.abrir();

    for (;;) {
      const pendente = this.#alteracoesPendentes ? ' (alterações não salvas)' : '';
      const escolha = await this.#terminal.menu(
        `EstACME - Sistema de Controle de Estacionamento${pendente}`,
        [
          { chave: '1', rotulo: 'Clientes pré-cadastrados (cadastro, placas, saldo e boletos)' },
          { chave: '2', rotulo: 'Movimentação de veículos (entrada, saída e pátio)' },
          { chave: '3', rotulo: 'Relatórios gerenciais' },
          { chave: '4', rotulo: 'Dados (salvar e recarregar arquivos CSV)' },
          { chave: '0', rotulo: 'Sair (salva os dados automaticamente)' },
        ],
      );

      try {
        if (escolha === '1') await this.#menuClientes();
        else if (escolha === '2') await this.#menuMovimentacao();
        else if (escolha === '3') await this.#menuRelatorios();
        else if (escolha === '4') await this.#menuDados();
        else if (escolha === '0') break;
      } catch (erro) {
        // qualquer regra de negócio violada volta ao menu com a mensagem
        if (erro instanceof ErroDominio) this.#terminal.erro(erro.message);
        else throw erro;
      }
    }

    this.encerrar();
  }

  /** Executa uma operação exibindo a mensagem quando uma regra impede a ação. */
  tentar(descricao, operacao) {
    try {
      const resultado = operacao();
      this.#terminal.sucesso(descricao);
      return resultado;
    } catch (erro) {
      if (erro instanceof ErroDominio) {
        this.#terminal.erro(`${erro.name}: ${erro.message}`);
        return null;
      }
      throw erro;
    }
  }

  // ------------------------------------------------------- menu de clientes

  async #menuClientes() {
    for (;;) {
      const escolha = await this.#terminal.menu('Clientes pré-cadastrados', [
        { chave: '1', rotulo: 'Listar clientes cadastrados' },
        { chave: '2', rotulo: 'Cadastrar novo cliente' },
        { chave: '3', rotulo: 'Adicionar placa a um cliente' },
        { chave: '4', rotulo: 'Remover placa de um cliente' },
        { chave: '5', rotulo: 'Remover cliente do cadastro' },
        { chave: '6', rotulo: 'Recarregar créditos de um estudante' },
        { chave: '7', rotulo: 'Boletos de empresa (emitir, vencer ou quitar)' },
        { chave: '0', rotulo: 'Voltar ao menu principal' },
      ]);

      if (escolha === '0') return;
      if (escolha === '1') this.#listarClientes();
      if (escolha === '2') await this.#cadastrarCliente();
      if (escolha === '3') await this.#adicionarPlaca();
      if (escolha === '4') await this.#removerPlaca();
      if (escolha === '5') await this.#removerCliente();
      if (escolha === '6') await this.#recarregarCreditos();
      if (escolha === '7') await this.#gerenciarBoletos();

      await this.#terminal.pausar();
    }
  }

  #listarClientes() {
    this.#terminal.subtitulo('Clientes cadastrados');
    const linhas = this.#cadastro.clientes.map((cliente) => [
      cliente.documento,
      cliente.nome,
      cliente.tipo,
      cliente.quantidadeDePlacas,
      [...cliente.placas].join(' ') || '-',
      cliente.estaImpedido ? 'IMPEDIDO' : 'liberado',
    ]);
    this.#terminal.tabela(['CPF/CNPJ', 'Nome', 'Tipo', 'Placas', 'Veículos', 'Situação'], linhas);
  }

  async #cadastrarCliente() {
    this.#terminal.subtitulo('Cadastro de cliente pré-cadastrado');

    const tipo = await this.#terminal.menu('Tipo de cliente', [
      { chave: '1', rotulo: 'Estudante (1 placa, ingresso pré-pago)' },
      { chave: '2', rotulo: 'Professor (até 2 placas, entrada gratuita)' },
      { chave: '3', rotulo: 'Empresa (placas ilimitadas, cobrança por diária)' },
      { chave: '0', rotulo: 'Cancelar' },
    ]);
    if (tipo === '0') return;

    const documento = await this.#terminal.perguntarObrigatorio(
      tipo === '3' ? 'CNPJ: ' : 'CPF: ',
    );
    const nome = await this.#terminal.perguntarObrigatorio('Nome: ');

    let cliente;
    if (tipo === '1') {
      const saldo = await this.#terminal.perguntarNumero('Créditos iniciais (R$, 0 se não houver): ', { minimo: 0 });
      cliente = new Estudante(documento, nome, saldo);
    } else if (tipo === '2') {
      cliente = new Professor(documento, nome);
    } else {
      const debito = await this.#terminal.perguntarNumero('Débito já existente (R$, 0 se não houver): ', { minimo: 0 });
      cliente = new Empresa(documento, nome, debito);
    }

    const cadastrado = this.tentar(`Cliente ${nome} cadastrado.`, () => this.#cadastro.cadastrarCliente(cliente));
    if (cadastrado === null) return;
    this.#marcarAlteracao();

    // placas podem ser informadas na sequência, respeitando o limite do tipo
    for (;;) {
      const placa = await this.#terminal.perguntar(
        `Placa do veículo (Enter para encerrar, limite ${cliente.limiteDePlacas}): `,
      );
      if (placa === '') break;
      this.tentar(`Placa ${placa.toUpperCase()} vinculada a ${nome}.`,
        () => this.#cadastro.adicionarPlaca(documento, placa));
      this.#marcarAlteracao();
    }
  }

  /** Pede o documento e devolve o cliente, ou null quando não encontrado. */
  async #escolherCliente(pergunta = 'CPF/CNPJ do cliente: ') {
    const documento = await this.#terminal.perguntarObrigatorio(pergunta);
    try {
      return this.#cadastro.buscarPorDocumento(documento);
    } catch (erro) {
      this.#terminal.erro(erro.message);
      return null;
    }
  }

  async #adicionarPlaca() {
    this.#terminal.subtitulo('Vincular placa a um cliente');
    const cliente = await this.#escolherCliente();
    if (cliente === null) return;

    this.#terminal.informar(
      `${cliente} - ${cliente.quantidadeDePlacas} de ${cliente.limiteDePlacas} placa(s) usada(s).`,
    );
    const placa = await this.#terminal.perguntarObrigatorio('Nova placa: ');
    this.tentar(`Placa ${placa.toUpperCase()} vinculada a ${cliente.nome}.`,
      () => this.#cadastro.adicionarPlaca(cliente.documento, placa));
    this.#marcarAlteracao();
  }

  async #removerPlaca() {
    this.#terminal.subtitulo('Remover placa de um cliente');
    const cliente = await this.#escolherCliente();
    if (cliente === null) return;

    this.#terminal.informar(`Placas atuais: ${[...cliente.placas].join(', ') || 'nenhuma'}`);
    const placa = await this.#terminal.perguntarObrigatorio('Placa a remover: ');
    this.tentar(`Placa ${placa.toUpperCase()} removida.`,
      () => this.#cadastro.removerPlaca(cliente.documento, placa));
    this.#marcarAlteracao();
  }

  async #removerCliente() {
    this.#terminal.subtitulo('Remover cliente do cadastro');
    const cliente = await this.#escolherCliente();
    if (cliente === null) return;

    const confirmado = await this.#terminal.confirmar(
      `Confirma remover ${cliente.nome} e suas ${cliente.quantidadeDePlacas} placa(s)?`,
    );
    if (!confirmado) {
      this.#terminal.informar('Operação cancelada.');
      return;
    }

    this.tentar(`Cliente ${cliente.nome} removido.`,
      () => this.#cadastro.removerCliente(cliente.documento));
    this.#marcarAlteracao();
  }

  async #recarregarCreditos() {
    this.#terminal.subtitulo('Recarga de créditos (estudante)');
    const cliente = await this.#escolherCliente('CPF do estudante: ');
    if (cliente === null) return;

    if (!(cliente instanceof Estudante)) {
      this.#terminal.erro('Somente estudantes possuem créditos pré-pagos.');
      return;
    }

    this.#terminal.informar(`Saldo atual: ${formatarReal(cliente.saldo)}`);
    const valor = await this.#terminal.perguntarNumero('Valor da recarga (R$): ', { minimo: 0.01 });
    cliente.carregarSaldo(valor);
    this.#terminal.sucesso(`Novo saldo de ${cliente.nome}: ${formatarReal(cliente.saldo)}`);
    this.#marcarAlteracao();
  }

  async #gerenciarBoletos() {
    this.#terminal.subtitulo('Boletos de empresa');
    const cliente = await this.#escolherCliente('CNPJ da empresa: ');
    if (cliente === null) return;

    if (!(cliente instanceof Empresa)) {
      this.#terminal.erro('Somente empresas possuem boletos.');
      return;
    }

    this.#terminal.informar(`Débito acumulado: ${formatarReal(cliente.saldoDevedor)}`);
    this.#terminal.informar(`Boleto em aberto: ${formatarReal(cliente.boletoEmAberto)}`);
    this.#terminal.informar(`Situação: ${cliente.inadimplente ? 'INADIMPLENTE' : 'regular'}`);

    const acao = await this.#terminal.menu('O que deseja fazer?', [
      { chave: '1', rotulo: 'Emitir boleto com o débito acumulado' },
      { chave: '2', rotulo: 'Registrar boleto vencido sem pagamento (torna inadimplente)' },
      { chave: '3', rotulo: 'Quitar boleto (regulariza a empresa)' },
      { chave: '0', rotulo: 'Voltar' },
    ]);

    if (acao === '1') {
      const valor = cliente.emitirBoleto();
      this.#terminal.sucesso(`Boleto emitido no valor de ${formatarReal(valor)}.`);
    } else if (acao === '2') {
      const inadimplente = cliente.registrarBoletoNaoQuitado();
      this.#terminal.sucesso(inadimplente
        ? 'Empresa marcada como inadimplente: seus veículos ficam impedidos de entrar.'
        : 'Não havia boleto em aberto para vencer.');
    } else if (acao === '3') {
      cliente.quitarBoleto();
      this.#terminal.sucesso('Boleto quitado: a empresa voltou à situação regular.');
    } else {
      return;
    }

    this.#marcarAlteracao();
  }

  // --------------------------------------------------- menu de movimentação

  async #menuMovimentacao() {
    for (;;) {
      const escolha = await this.#terminal.menu('Movimentação de veículos', [
        { chave: '1', rotulo: 'Registrar entrada de veículo' },
        { chave: '2', rotulo: 'Registrar saída de veículo (com cobrança)' },
        { chave: '3', rotulo: 'Listar veículos no pátio' },
        { chave: '4', rotulo: 'Consultar histórico de uma placa' },
        { chave: '5', rotulo: 'Lista de bloqueio de placas avulsas' },
        { chave: '0', rotulo: 'Voltar ao menu principal' },
      ]);

      if (escolha === '0') return;
      if (escolha === '1') await this.#registrarEntrada();
      if (escolha === '2') await this.#registrarSaida();
      if (escolha === '3') this.#listarPatio();
      if (escolha === '4') await this.#historicoDaPlaca();
      if (escolha === '5') await this.#gerenciarBloqueios();

      await this.#terminal.pausar();
    }
  }

  async #registrarEntrada() {
    this.#terminal.subtitulo('Entrada de veículo');
    const placa = await this.#terminal.perguntarObrigatorio('Placa lida pela câmera: ');
    const dataHora = await this.#terminal.perguntarDataHora(
      'Data e hora da entrada (Enter = agora): ', { agoraSeVazio: true },
    );

    const ticket = this.entrada(placa, dataHora);
    if (ticket !== null) this.#marcarAlteracao();
  }

  async #registrarSaida() {
    this.#terminal.subtitulo('Saída de veículo');
    const placa = await this.#terminal.perguntarObrigatorio('Placa lida pela câmera: ');
    const dataHora = await this.#terminal.perguntarDataHora(
      'Data e hora da saída (Enter = agora): ', { agoraSeVazio: true },
    );
    const pagou = await this.#terminal.confirmar('O cliente efetuou o pagamento?', true);

    const ticket = this.saida(placa, dataHora, { pagou });
    if (ticket !== null) {
      if (!pagou && ticket.tipoCliente === 'Avulso') {
        this.#terminal.informar('Placa incluída na lista de bloqueio por falta de pagamento.');
      }
      this.#marcarAlteracao();
    }
  }

  #listarPatio() {
    this.#terminal.subtitulo('Veículos no pátio');
    const linhas = this.#registro.ticketsAbertos.map((ticket) => [
      ticket.placa.codigo,
      ticket.tipoCliente,
      ticket.documentoCliente ?? '-',
      formatarDataHora(ticket.entrada),
    ]);
    this.#terminal.tabela(['Placa', 'Tipo', 'CPF/CNPJ', 'Entrada'], linhas);
  }

  async #historicoDaPlaca() {
    this.#terminal.subtitulo('Histórico de uma placa');
    const placa = await this.#terminal.perguntarObrigatorio('Placa: ');

    const tickets = this.tentar(`Histórico da placa ${placa.toUpperCase()}.`,
      () => this.#registro.consultarPorPlaca(placa));
    if (tickets === null) return;

    this.#terminal.tabela(
      ['Ticket', 'Tipo', 'Entrada', 'Saída', 'Custo', 'Desconto', 'Devido', 'Pago'],
      tickets.map((t) => [
        t.id, t.tipoCliente, formatarDataHora(t.entrada),
        t.estaAberto ? 'em aberto' : formatarDataHora(t.saida),
        formatarReal(t.custo), t.identificadorDesconto,
        formatarReal(t.valorDevido), formatarReal(t.valorPago),
      ]),
    );
  }

  async #gerenciarBloqueios() {
    this.#terminal.subtitulo('Lista de bloqueio (clientes avulsos)');
    const bloqueadas = [...this.#registro.placasBloqueadas];
    this.#terminal.informar(bloqueadas.length === 0
      ? 'Nenhuma placa bloqueada.'
      : `Placas bloqueadas: ${bloqueadas.join(', ')}`);

    const acao = await this.#terminal.menu('O que deseja fazer?', [
      { chave: '1', rotulo: 'Bloquear uma placa' },
      { chave: '2', rotulo: 'Desbloquear uma placa (após regularização)' },
      { chave: '0', rotulo: 'Voltar' },
    ]);
    if (acao === '0') return;

    const placa = await this.#terminal.perguntarObrigatorio('Placa: ');
    if (acao === '1') {
      this.tentar(`Placa ${placa.toUpperCase()} bloqueada.`, () => this.#registro.bloquearPlaca(placa));
    } else {
      const removida = this.#registro.desbloquearPlaca(placa);
      if (removida) this.#terminal.sucesso(`Placa ${placa.toUpperCase()} desbloqueada.`);
      else this.#terminal.erro('Essa placa não estava na lista de bloqueio.');
    }
    this.#marcarAlteracao();
  }

  // =====================================================================
  // 3. RELATÓRIOS GERENCIAIS
  // =====================================================================

  async #menuRelatorios() {
    for (;;) {
      const escolha = await this.#terminal.menu('Relatórios gerenciais', [
        { chave: '1', rotulo: 'Valor arrecadado por período e/ou categoria' },
        { chave: '2', rotulo: 'Situação de um cliente cadastrado' },
        { chave: '3', rotulo: 'Registros de um cliente cadastrado por período' },
        { chave: '4', rotulo: 'Registros de clientes não cadastrados por período' },
        { chave: '5', rotulo: 'Clientes impedidos de entrar' },
        { chave: '6', rotulo: 'Os 10 clientes mais frequentes do ano' },
        { chave: '7', rotulo: 'Relatório consolidado (resumo geral)' },
        { chave: '0', rotulo: 'Voltar ao menu principal' },
      ]);

      if (escolha === '0') return;
      if (escolha === '1') await this.#relatorioArrecadacao();
      if (escolha === '2') await this.#relatorioSituacaoCliente();
      if (escolha === '3') await this.#relatorioRegistrosDoCliente();
      if (escolha === '4') await this.#relatorioRegistrosAvulsos();
      if (escolha === '5') this.#relatorioImpedidos();
      if (escolha === '6') await this.#relatorioMaisFrequentes();
      if (escolha === '7') this.mostrarRelatorios();

      await this.#terminal.pausar();
    }
  }

  /** Pergunta um intervalo de datas; ambos os campos são opcionais. */
  async #perguntarPeriodo() {
    this.#terminal.informar('Deixe em branco para não filtrar por data.');
    const inicio = await this.#terminal.perguntarDataHora('Data inicial (dd/mm/aaaa): ', { opcional: true });
    const fim = await this.#terminal.perguntarDataHora('Data final (dd/mm/aaaa): ',
      { opcional: true, fimDoDia: true });
    return { inicio, fim };
  }

  async #relatorioArrecadacao() {
    this.#terminal.subtitulo('1. Valor total arrecadado');
    const { inicio, fim } = await this.#perguntarPeriodo();

    const filtro = await this.#terminal.menu('Categorias de cliente', [
      { chave: '1', rotulo: 'Todas as categorias (com detalhamento)' },
      { chave: '2', rotulo: 'Somente clientes avulsos' },
      { chave: '3', rotulo: 'Somente estudantes' },
      { chave: '4', rotulo: 'Somente professores' },
      { chave: '5', rotulo: 'Somente empresas' },
      { chave: '6', rotulo: 'Combinar categorias (digitar a lista)' },
    ]);

    const mapa = { 2: ['Avulso'], 3: ['Estudante'], 4: ['Professor'], 5: ['Empresa'] };
    let categorias = mapa[Number(filtro)] ?? null;

    if (filtro === '6') {
      const texto = await this.#terminal.perguntarObrigatorio(
        'Categorias separadas por vírgula (Avulso, Estudante, Professor, Empresa): ',
      );
      categorias = texto.split(',').map((c) => c.trim()).filter(Boolean);
    }

    const total = this.#relatorios.arrecadacao(inicio, fim, categorias);
    this.#terminal.informar(`Período: ${inicio ? formatarDataHora(inicio) : 'início'} até `
      + `${fim ? formatarDataHora(fim) : 'hoje'}`);
    this.#terminal.informar(`Categorias: ${categorias ? categorias.join(', ') : 'todas'}`);
    this.#terminal.informar(`Atendimentos encerrados: ${total.atendimentos}`);
    this.#terminal.informar(`Valor devido: ${formatarReal(total.valorDevido)}`);
    this.#terminal.informar(`Valor efetivamente pago: ${formatarReal(total.valorPago)}`);

    if (categorias === null) {
      const porCategoria = this.#relatorios.arrecadacaoPorCategoria(inicio, fim);
      this.#terminal.tabela(
        ['Categoria', 'Atendimentos', 'Valor devido', 'Valor pago'],
        Object.entries(porCategoria).map(([categoria, dados]) => [
          categoria, dados.atendimentos, formatarReal(dados.valorDevido), formatarReal(dados.valorPago),
        ]),
      );
    }
  }

  async #relatorioSituacaoCliente() {
    this.#terminal.subtitulo('2. Situação de um cliente cadastrado');
    const documento = await this.#terminal.perguntarObrigatorio('CPF/CNPJ: ');
    this.mostrarSituacao(documento);
  }

  async #relatorioRegistrosDoCliente() {
    this.#terminal.subtitulo('3. Registros de um cliente cadastrado por período');
    const documento = await this.#terminal.perguntarObrigatorio('CPF/CNPJ: ');
    const { inicio, fim } = await this.#perguntarPeriodo();

    const tickets = this.tentar('Consulta concluída.',
      () => this.#relatorios.registrosDoCliente(documento, inicio, fim));
    if (tickets === null) return;

    this.#terminal.tabela(
      ['Ticket', 'Placa', 'Entrada', 'Saída', 'Custo', 'Desconto', 'Devido', 'Pago'],
      tickets.map((t) => [
        t.id, t.placa.codigo, formatarDataHora(t.entrada),
        t.estaAberto ? 'em aberto' : formatarDataHora(t.saida),
        formatarReal(t.custo), t.identificadorDesconto,
        formatarReal(t.valorDevido), formatarReal(t.valorPago),
      ]),
    );
  }

  async #relatorioRegistrosAvulsos() {
    this.#terminal.subtitulo('4. Registros de clientes não cadastrados (avulsos)');
    const { inicio, fim } = await this.#perguntarPeriodo();
    const tickets = this.#relatorios.registrosDeAvulsos(inicio, fim);

    this.#terminal.tabela(
      ['Ticket', 'Placa', 'Entrada', 'Saída', 'Custo', 'Desconto', 'Devido', 'Pago'],
      tickets.map((t) => [
        t.id, t.placa.codigo, formatarDataHora(t.entrada),
        t.estaAberto ? 'em aberto' : formatarDataHora(t.saida),
        formatarReal(t.custo), t.identificadorDesconto,
        formatarReal(t.valorDevido), formatarReal(t.valorPago),
      ]),
    );
  }

  #relatorioImpedidos() {
    this.#terminal.subtitulo('5. Clientes impedidos de entrar');
    const impedidos = this.#relatorios.impedidosDeEntrar();
    this.#terminal.tabela(
      ['Cliente', 'Motivo'],
      impedidos.map((i) => [i.identificacao, i.motivo]),
    );
  }

  async #relatorioMaisFrequentes() {
    this.#terminal.subtitulo('6. Os 10 clientes mais frequentes do ano');
    const ano = await this.#terminal.perguntarNumero(
      `Ano (Enter = ${new Date().getFullYear()}): `,
      { minimo: 2000, maximo: 2100, opcional: true },
    ) ?? new Date().getFullYear();

    const ranking = this.#relatorios.clientesMaisFrequentes(ano);
    this.#terminal.tabela(
      ['#', 'Cliente', 'Tipo', 'Visitas'],
      ranking.map((c, i) => [i + 1, c.identificacao, c.tipo, c.visitas]),
    );
  }

  // =====================================================================
  // 4. MENU DE DADOS (persistência manual)
  // =====================================================================

  async #menuDados() {
    const escolha = await this.#terminal.menu('Dados e arquivos CSV', [
      { chave: '1', rotulo: 'Salvar agora nos arquivos CSV' },
      { chave: '2', rotulo: 'Recarregar os dados do disco (descarta alterações)' },
      { chave: '3', rotulo: 'Mostrar caminho e conteúdo resumido dos arquivos' },
      { chave: '0', rotulo: 'Voltar ao menu principal' },
    ]);

    if (escolha === '0') return;

    if (escolha === '1') {
      this.salvar();
    } else if (escolha === '2') {
      const confirmado = await this.#terminal.confirmar(
        'Recarregar do disco? As alterações não salvas serão perdidas.',
      );
      if (confirmado) {
        this.#cadastro = new CadastroClientes();
        this.#registro = new RegistroDeEntradas_E_Saidas(this.#cadastro, this.#registro.tarifas);
        this.#relatorios = new RelatoriosGerenciais(this.#registro, this.#cadastro);
        this.iniciar();
        this.#terminal.sucesso('Dados recarregados dos arquivos CSV.');
      }
    } else if (escolha === '3') {
      this.#terminal.informar(`Pasta de dados: ${this.#pastaDados}`);
      this.#terminal.informar(`Clientes em memória: ${this.#cadastro.totalClientes}`);
      this.#terminal.informar(`Registros em memória: ${this.#registro.tickets.length}`);
      this.#terminal.informar(`Veículos no pátio: ${this.#registro.ticketsAbertos.length}`);
      this.#terminal.informar(`Alterações pendentes: ${this.#alteracoesPendentes ? 'sim' : 'não'}`);
    }

    await this.#terminal.pausar();
  }

  // =====================================================================
  // 5. OPERAÇÕES REAPROVEITADAS PELA DEMONSTRAÇÃO (src/demo.js)
  // =====================================================================

  escrever(texto = '') {
    this.#terminal.escrever(texto);
  }

  titulo(texto) {
    this.#terminal.titulo(texto);
  }

  /** Registra a entrada de um veículo e exibe o ticket criado. */
  entrada(placa, dataHora = new Date()) {
    return this.tentar(`Entrada autorizada: ${String(placa).toUpperCase()}`, () => {
      const ticket = this.#registro.autorizarEntrada(placa, dataHora);
      this.#terminal.informar(
        `     ticket #${ticket.id} | ${ticket.tipoCliente} | ${formatarDataHora(ticket.entrada)}`,
      );
      return ticket;
    });
  }

  /** Processa a saída de um veículo e exibe o comprovante com os valores. */
  saida(placa, dataHora = new Date(), opcoes = {}) {
    return this.tentar(`Saída processada: ${String(placa).toUpperCase()}`, () => {
      const ticket = this.#registro.processarSaida(placa, dataHora, opcoes);
      this.#terminal.informar(
        `     permanência: ${formatarDataHora(ticket.entrada)} -> ${formatarDataHora(ticket.saida)}`
        + ` (${ticket.quantidadeDiarias()} dia[s])`,
      );
      this.#terminal.informar(
        `     custo ${formatarReal(ticket.custo)} | desconto "${ticket.identificadorDesconto}" `
        + `${formatarReal(ticket.valorDesconto)} | devido ${formatarReal(ticket.valorDevido)} | `
        + `pago ${formatarReal(ticket.valorPago)}`,
      );
      return ticket;
    });
  }

  /** Exibe a situação de um cliente cadastrado. */
  mostrarSituacao(documento) {
    return this.tentar(`Situação consultada: ${documento}`, () => {
      const s = this.#relatorios.situacaoDoCliente(documento);
      this.#terminal.informar(`     ${s.cliente}`);
      this.#terminal.informar(`     placas cadastradas: ${s.placasCadastradas.join(', ') || 'nenhuma'}`);
      this.#terminal.informar(`     estacionados agora: ${s.veiculosEstacionados.join(', ') || 'nenhum'}`);
      this.#terminal.informar(`     ${s.situacaoFinanceira.descricao}: ${formatarReal(s.situacaoFinanceira.valor)}`);
      if (s.impedido) this.#terminal.informar(`     IMPEDIDO: ${s.motivo}`);
      return s;
    });
  }

  /** Imprime o relatório gerencial consolidado. */
  mostrarRelatorios(ano = new Date().getFullYear()) {
    this.#terminal.escrever('');
    this.#terminal.escrever(this.#relatorios.emTexto(ano));
  }
}
