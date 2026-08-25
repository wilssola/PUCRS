/**
 * Utilitários de data e hora usados no cálculo dos custos.
 *
 * A regra da "virada de meia-noite" aparece em todas as categorias de cliente
 * (nova diária para avulsos e empresas, novo ingresso para estudantes), por isso
 * o cálculo sempre começa quebrando a permanência em períodos diários.
 */

const UMA_HORA_MS = 60 * 60 * 1000;

/** @param {Date} data @returns {Date} 00h00 do mesmo dia */
export function inicioDoDia(data) {
  const d = new Date(data.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
}

/** @param {Date} data @returns {Date} 00h00 do dia seguinte */
export function proximaMeiaNoite(data) {
  const d = inicioDoDia(data);
  d.setDate(d.getDate() + 1);
  return d;
}

/** @param {Date} data @returns {string} data no formato AAAA-MM-DD */
export function chaveDoDia(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** @returns {boolean} verdadeiro se as duas datas caem no mesmo dia-calendário */
export function mesmoDia(a, b) {
  return chaveDoDia(a) === chaveDoDia(b);
}

/**
 * Quebra o intervalo [entrada, saida] em períodos que não atravessam a meia-noite.
 * Ex.: 27/11 22h00 -> 28/11 03h00 devolve dois períodos (um por dia-calendário).
 *
 * @param {Date} entrada
 * @param {Date} saida
 * @returns {{inicio: Date, fim: Date, dia: string}[]}
 */
export function periodosDiarios(entrada, saida) {
  if (saida < entrada) {
    throw new RangeError('A data de saída não pode ser anterior à data de entrada.');
  }

  const periodos = [];
  let inicio = new Date(entrada.getTime());

  for (;;) {
    const limite = proximaMeiaNoite(inicio);
    const fim = saida < limite ? new Date(saida.getTime()) : limite;
    periodos.push({ inicio, fim, dia: chaveDoDia(inicio) });
    if (fim.getTime() >= saida.getTime()) break;
    inicio = new Date(limite.getTime());
  }

  return periodos;
}

/**
 * Converte uma duração em milissegundos para horas cheias
 * (qualquer fração de hora é cobrada como hora inteira).
 * @param {number} ms
 * @returns {number}
 */
export function horasCheias(ms) {
  if (ms <= 0) return 0;
  return Math.ceil(ms / UMA_HORA_MS);
}

/**
 * Diferença em dias inteiros entre duas datas (usada nos relatórios e no
 * desconto de cliente frequente).
 */
export function diferencaEmDias(inicio, fim) {
  return Math.floor((inicioDoDia(fim) - inicioDoDia(inicio)) / (24 * UMA_HORA_MS));
}

/** @param {number} valor @returns {string} valor formatado em reais */
export function formatarReal(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** @param {Date} data @returns {string} data e hora no padrão brasileiro */
export function formatarDataHora(data) {
  if (!(data instanceof Date)) return '-';
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Converte uma data para o formato ISO local usado nos arquivos CSV
 * (AAAA-MM-DDTHH:MM:SS), sem o deslocamento de fuso.
 */
export function paraISOLocal(data) {
  if (!(data instanceof Date)) return '';
  const hh = String(data.getHours()).padStart(2, '0');
  const mm = String(data.getMinutes()).padStart(2, '0');
  const ss = String(data.getSeconds()).padStart(2, '0');
  return `${chaveDoDia(data)}T${hh}:${mm}:${ss}`;
}

/** Converte o texto AAAA-MM-DDTHH:MM:SS dos arquivos CSV em Date. */
export function deISOLocal(texto) {
  if (!texto) return null;
  const [data, hora = '00:00:00'] = texto.trim().split('T');
  const [ano, mes, dia] = data.split('-').map(Number);
  const [h, m, s] = hora.split(':').map(Number);
  return new Date(ano, mes - 1, dia, h ?? 0, m ?? 0, s ?? 0);
}
