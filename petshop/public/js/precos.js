/* ==========================================================================
   precos.js - tabela de preços dos serviços do Pata Amiga Petshop
   Arquivo compartilhado pelas páginas de serviços e de agendamento, para que
   um reajuste de valores seja feito em um único lugar.
   ========================================================================== */

'use strict';

/** Valores dos serviços por porte do animal (em reais). */
const TABELA_SERVICOS = {
  banho: {
    nome: 'Banho completo',
    duracaoMinutos: 90,
    valores: { P: 45, M: 65, G: 85 },
  },
  'tosa-higienica': {
    nome: 'Tosa higiênica (com banho)',
    duracaoMinutos: 120,
    valores: { P: 60, M: 80, G: 100 },
  },
  'tosa-completa': {
    nome: 'Tosa completa (com banho)',
    duracaoMinutos: 150,
    valores: { P: 90, M: 120, G: 150 },
  },
};

/** Descrição dos portes aceitos. */
const PORTES = {
  P: 'Pequeno (até 10 kg)',
  M: 'Médio (de 11 a 25 kg)',
  G: 'Grande (acima de 25 kg)',
};

/** Valor cobrado pelo serviço de tele-busca (leva e traz). */
const VALOR_TELE_BUSCA = 25;

/**
 * Calcula o valor total de um atendimento.
 * @param {string} servico chave da TABELA_SERVICOS
 * @param {string} porte 'P', 'M' ou 'G'
 * @param {boolean} comTeleBusca
 * @returns {{base: number, teleBusca: number, total: number}}
 */
function calcularValor(servico, porte, comTeleBusca) {
  const item = TABELA_SERVICOS[servico];
  if (!item || !item.valores[porte]) {
    return { base: 0, teleBusca: 0, total: 0 };
  }

  const base = item.valores[porte];
  const teleBusca = comTeleBusca ? VALOR_TELE_BUSCA : 0;
  return { base, teleBusca, total: base + teleBusca };
}

/**
 * Formata um número como moeda brasileira.
 * @param {number} valor
 * @returns {string}
 */
function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
