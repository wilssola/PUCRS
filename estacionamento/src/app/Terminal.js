import readline from 'node:readline/promises';
import { stdin as entradaPadrao, stdout as saidaPadrao } from 'node:process';

/**
 * Terminal: camada de entrada e saída de texto do sistema.
 *
 * Concentra tudo o que envolve ler do teclado e escrever na tela (perguntas,
 * menus, tabelas e mensagens). A classe App usa o Terminal para conversar com
 * o usuário, e nenhuma regra de negócio é implementada aqui — assim, trocar o
 * console por outra interface exigiria substituir apenas esta classe.
 */
export class Terminal {
  #leitor;
  #entrada;
  #saida;

  /**
   * @param {NodeJS.ReadableStream} [entrada]
   * @param {NodeJS.WritableStream} [saida]
   */
  constructor(entrada = entradaPadrao, saida = saidaPadrao) {
    this.#entrada = entrada;
    this.#saida = saida;
    this.#leitor = null;
  }

  /** Abre a interface de leitura do teclado. */
  abrir() {
    if (this.#leitor === null) {
      this.#leitor = readline.createInterface({
        input: this.#entrada,
        output: this.#saida,
      });
    }
    return this;
  }

  /** Fecha a interface de leitura. */
  fechar() {
    if (this.#leitor !== null) {
      this.#leitor.close();
      this.#leitor = null;
    }
  }

  // ------------------------------------------------------------------- saída

  /** Escreve uma linha na tela. */
  escrever(texto = '') {
    this.#saida.write(`${texto}\n`);
  }

  /** Título destacado, usado no topo de cada tela. */
  titulo(texto) {
    const linha = '='.repeat(74);
    this.escrever(`\n${linha}\n  ${texto}\n${linha}`);
  }

  /** Subtítulo, usado dentro de uma tela. */
  subtitulo(texto) {
    this.escrever(`\n${texto}\n${'-'.repeat(Math.max(texto.length, 20))}`);
  }

  /** Mensagem de sucesso. */
  sucesso(texto) {
    this.escrever(`  [OK] ${texto}`);
  }

  /** Mensagem de erro (regra de negócio violada ou dado inválido). */
  erro(texto) {
    this.escrever(`  [!!] ${texto}`);
  }

  /** Mensagem informativa. */
  informar(texto) {
    this.escrever(`  ${texto}`);
  }

  /**
   * Imprime uma tabela simples, alinhando as colunas pela maior célula.
   * @param {string[]} cabecalho
   * @param {Array<Array<string|number>>} linhas
   */
  tabela(cabecalho, linhas) {
    if (linhas.length === 0) {
      this.informar('(nenhum registro encontrado)');
      return;
    }

    const dados = [cabecalho, ...linhas.map((l) => l.map((c) => String(c)))];
    const larguras = cabecalho.map(
      (_, coluna) => Math.max(...dados.map((linha) => String(linha[coluna] ?? '').length)),
    );

    const formatar = (linha) => linha
      .map((celula, i) => String(celula ?? '').padEnd(larguras[i]))
      .join('  ');

    this.escrever(`  ${formatar(cabecalho)}`);
    this.escrever(`  ${larguras.map((l) => '-'.repeat(l)).join('  ')}`);
    dados.slice(1).forEach((linha) => this.escrever(`  ${formatar(linha)}`));
  }

  // ------------------------------------------------------------------ entrada

  /**
   * Faz uma pergunta e devolve a resposta já sem espaços nas pontas.
   * @param {string} pergunta
   * @returns {Promise<string>}
   */
  async perguntar(pergunta) {
    if (this.#leitor === null) this.abrir();
    const resposta = await this.#leitor.question(`  ${pergunta}`);
    return resposta.trim();
  }

  /**
   * Pergunta até receber uma resposta não vazia.
   * @param {string} pergunta
   * @returns {Promise<string>}
   */
  async perguntarObrigatorio(pergunta) {
    for (;;) {
      const resposta = await this.perguntar(pergunta);
      if (resposta !== '') return resposta;
      this.erro('Este campo é obrigatório.');
    }
  }

  /**
   * Lê um número dentro de um intervalo opcional.
   * @param {string} pergunta
   * @param {{minimo?: number, maximo?: number, opcional?: boolean}} [opcoes]
   * @returns {Promise<number|null>}
   */
  async perguntarNumero(pergunta, { minimo = -Infinity, maximo = Infinity, opcional = false } = {}) {
    for (;;) {
      const resposta = await this.perguntar(pergunta);
      if (resposta === '' && opcional) return null;

      const numero = Number(resposta.replace(',', '.'));
      if (!Number.isNaN(numero) && numero >= minimo && numero <= maximo) return numero;

      this.erro(`Informe um número válido${minimo > -Infinity ? ` (entre ${minimo} e ${maximo})` : ''}.`);
    }
  }

  /**
   * Lê uma data e hora no formato dd/mm/aaaa hh:mm. Aceita apenas a data
   * (assume 00:00) e, se opcional, permite resposta vazia.
   *
   * @param {string} pergunta
   * @param {{opcional?: boolean, agoraSeVazio?: boolean, fimDoDia?: boolean}} [opcoes]
   * @returns {Promise<Date|null>}
   */
  async perguntarDataHora(pergunta, { opcional = false, agoraSeVazio = false, fimDoDia = false } = {}) {
    for (;;) {
      const resposta = await this.perguntar(pergunta);

      if (resposta === '') {
        if (agoraSeVazio) return new Date();
        if (opcional) return null;
        this.erro('Informe uma data no formato dd/mm/aaaa (ou dd/mm/aaaa hh:mm).');
        continue;
      }

      const data = Terminal.converterDataHora(resposta, fimDoDia);
      if (data !== null) return data;
      this.erro('Data inválida. Use o formato dd/mm/aaaa ou dd/mm/aaaa hh:mm.');
    }
  }

  /**
   * Converte "dd/mm/aaaa" ou "dd/mm/aaaa hh:mm" em Date.
   * Método estático para poder ser testado sem interação.
   *
   * @param {string} texto
   * @param {boolean} [fimDoDia] quando só a data é informada, usa 23:59:59
   * @returns {Date|null} null quando o texto não é uma data válida
   */
  static converterDataHora(texto, fimDoDia = false) {
    const padrao = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/;
    const partes = padrao.exec(String(texto).trim());
    if (partes === null) return null;

    const [, dia, mes, ano, hora, minuto] = partes.map(Number);
    const h = Number.isNaN(hora) || hora === undefined ? (fimDoDia ? 23 : 0) : hora;
    const m = Number.isNaN(minuto) || minuto === undefined ? (fimDoDia ? 59 : 0) : minuto;
    const s = fimDoDia && hora === undefined ? 59 : 0;

    const data = new Date(ano, mes - 1, dia, h, m, s);
    // rejeita datas inexistentes, como 31/02/2026
    if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
      return null;
    }
    if (h > 23 || m > 59) return null;
    return data;
  }

  /**
   * Mostra um menu numerado e devolve a chave escolhida.
   * @param {string} titulo
   * @param {Array<{chave: string, rotulo: string}>} opcoes
   * @returns {Promise<string>}
   */
  async menu(titulo, opcoes) {
    this.titulo(titulo);
    opcoes.forEach((opcao) => this.escrever(`  ${opcao.chave.padStart(2)}. ${opcao.rotulo}`));

    const validas = new Set(opcoes.map((o) => o.chave));
    for (;;) {
      const escolha = await this.perguntar('\n  Escolha uma opção: ');
      if (validas.has(escolha)) return escolha;
      this.erro('Opção inexistente. Digite o número de uma das opções listadas.');
    }
  }

  /**
   * Pergunta de sim ou não.
   * @param {string} pergunta
   * @param {boolean} [padrao] resposta usada quando o usuário só aperta Enter
   * @returns {Promise<boolean>}
   */
  async confirmar(pergunta, padrao = false) {
    const sufixo = padrao ? '[S/n]' : '[s/N]';
    const resposta = (await this.perguntar(`${pergunta} ${sufixo} `)).toLowerCase();
    if (resposta === '') return padrao;
    return resposta.startsWith('s');
  }

  /** Espera o usuário apertar Enter antes de voltar ao menu. */
  async pausar() {
    await this.perguntar('\n  Pressione Enter para continuar...');
  }
}
