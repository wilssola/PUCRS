/* ==========================================================================
   produtos.js - busca, ordenação e simulador de preços
   Usado nas páginas de categorias (acessórios, rações, higiene) e na página
   de serviços. Todas as funções trabalham sobre o HTML já existente, sem
   recarregar a página.
   ========================================================================== */

'use strict';

/**
 * Filtra os cartões de produto conforme o texto digitado na busca.
 * Cada cartão tem o atributo data-nome com o texto pesquisável.
 */
function ativarBuscaDeProdutos() {
  const campo = document.getElementById('busca-produto');
  const grade = document.getElementById('grade-produtos');
  const contador = document.getElementById('contador-produtos');
  if (!campo || !grade) return;

  const cartoes = Array.from(grade.querySelectorAll('[data-nome]'));

  function filtrar() {
    const termo = campo.value.trim().toLowerCase();
    let visiveis = 0;

    cartoes.forEach((cartao) => {
      const texto = cartao.dataset.nome.toLowerCase();
      const combina = termo === '' || texto.includes(termo);
      cartao.hidden = !combina;
      if (combina) visiveis += 1;
    });

    if (contador) {
      // região aria-live: leitores de tela anunciam quantos itens restaram
      contador.textContent = visiveis === cartoes.length
        ? `Exibindo todos os ${cartoes.length} produtos da categoria.`
        : `${visiveis} de ${cartoes.length} produto(s) correspondem à busca "${campo.value}".`;
    }
  }

  campo.addEventListener('input', filtrar);
  filtrar();
}

/**
 * Ordena os cartões de produto pelo preço (atributo data-preco) ou pelo nome.
 */
function ativarOrdenacaoDeProdutos() {
  const seletor = document.getElementById('ordenar-produtos');
  const grade = document.getElementById('grade-produtos');
  if (!seletor || !grade) return;

  const original = Array.from(grade.children);

  seletor.addEventListener('change', () => {
    const criterio = seletor.value;
    const itens = Array.from(grade.children);

    if (criterio === 'padrao') {
      original.forEach((item) => grade.appendChild(item));
      return;
    }

    itens.sort((a, b) => {
      if (criterio === 'nome') {
        return a.dataset.nome.localeCompare(b.dataset.nome, 'pt-BR');
      }
      const precoA = Number(a.dataset.preco);
      const precoB = Number(b.dataset.preco);
      return criterio === 'menor-preco' ? precoA - precoB : precoB - precoA;
    });

    itens.forEach((item) => grade.appendChild(item));
  });
}

/**
 * Simulador de preços da página de serviços: calcula o valor conforme o
 * serviço, o porte do animal e a opção de tele-busca, usando a tabela
 * compartilhada em precos.js.
 */
function ativarSimuladorDeServicos() {
  const servico = document.getElementById('sim-servico');
  const porte = document.getElementById('sim-porte');
  const tele = document.getElementById('sim-telebusca');
  const saida = document.getElementById('sim-resultado');
  if (!servico || !porte || !tele || !saida) return;

  function calcular() {
    const valores = calcularValor(servico.value, porte.value, tele.checked);
    saida.innerHTML = `
      <p class="mb-1">${TABELA_SERVICOS[servico.value].nome} — ${PORTES[porte.value]}</p>
      <p class="mb-1">Serviço: <strong>${formatarMoeda(valores.base)}</strong>
         ${tele.checked ? `+ tele-busca: <strong>${formatarMoeda(valores.teleBusca)}</strong>` : ''}</p>
      <p class="mb-0 preco">Valor estimado: ${formatarMoeda(valores.total)}</p>`;
  }

  [servico, porte, tele].forEach((campo) => campo.addEventListener('change', calcular));
  calcular();
}

document.addEventListener('DOMContentLoaded', () => {
  ativarBuscaDeProdutos();
  ativarOrdenacaoDeProdutos();
  ativarSimuladorDeServicos();
});
