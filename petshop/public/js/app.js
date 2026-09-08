/* ==========================================================================
   app.js - funções comuns a todas as páginas do Pata Amiga Petshop
   Carregado em todas as páginas. Contém:
     1. funções temporais (relógio, saudação e situação da loja);
     2. ano automático no rodapé;
     3. recursos de acessibilidade (tamanho da fonte e alto contraste);
     4. pausa do carrossel quando o usuário prefere menos animações.
   ========================================================================== */

'use strict';

/* Horário de funcionamento: 0 = domingo ... 6 = sábado.
   Cada dia informa a hora de abertura e de fechamento (24h). */
const HORARIO_LOJA = {
  0: null,                      // domingo: fechado
  1: { abre: 8, fecha: 19 },
  2: { abre: 8, fecha: 19 },
  3: { abre: 8, fecha: 19 },
  4: { abre: 8, fecha: 19 },
  5: { abre: 8, fecha: 19 },
  6: { abre: 8, fecha: 17 },    // sábado
};

const DIAS_SEMANA = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
  'quinta-feira', 'sexta-feira', 'sábado',
];

/**
 * Devolve a saudação adequada ao horário informado.
 * @param {Date} agora
 * @returns {string}
 */
function saudacao(agora) {
  const hora = agora.getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Verifica se a loja está aberta no momento informado.
 * @param {Date} agora
 * @returns {{aberta: boolean, mensagem: string}}
 */
function situacaoDaLoja(agora) {
  const expediente = HORARIO_LOJA[agora.getDay()];

  if (expediente === null) {
    return { aberta: false, mensagem: 'Fechado aos domingos. Voltamos segunda, às 8h.' };
  }

  const hora = agora.getHours() + agora.getMinutes() / 60;

  if (hora < expediente.abre) {
    return { aberta: false, mensagem: `Ainda fechado. Abrimos hoje às ${expediente.abre}h.` };
  }
  if (hora >= expediente.fecha) {
    return { aberta: false, mensagem: `Fechado por hoje. Atendemos amanhã a partir das 8h.` };
  }
  return { aberta: true, mensagem: `Aberto agora! Fechamos às ${expediente.fecha}h.` };
}

/**
 * Atualiza, a cada segundo, o relógio, a saudação e a situação da loja
 * exibidos na faixa superior de todas as páginas.
 */
function iniciarRelogio() {
  const alvoRelogio = document.getElementById('relogio');
  const alvoSituacao = document.getElementById('situacao-loja');
  if (!alvoRelogio && !alvoSituacao) return;

  function atualizar() {
    const agora = new Date();

    if (alvoRelogio) {
      const data = agora.toLocaleDateString('pt-BR');
      const hora = agora.toLocaleTimeString('pt-BR');
      alvoRelogio.textContent =
        `${saudacao(agora)}! Hoje é ${DIAS_SEMANA[agora.getDay()]}, ${data} — ${hora}`;
    }

    if (alvoSituacao) {
      const situacao = situacaoDaLoja(agora);
      const cor = situacao.aberta ? 'text-bg-success' : 'text-bg-secondary';
      alvoSituacao.innerHTML =
        `<span class="badge ${cor}">${situacao.aberta ? 'Aberto' : 'Fechado'}</span> ${situacao.mensagem}`;
    }
  }

  atualizar();
  window.setInterval(atualizar, 1000); // função temporal: atualização periódica
}

/** Preenche automaticamente o ano corrente no rodapé. */
function atualizarAnoDoRodape() {
  const alvo = document.getElementById('ano-atual');
  if (alvo) alvo.textContent = String(new Date().getFullYear());
}

/* --------------------------------------------------------------------------
   Recursos de acessibilidade
   As preferências ficam salvas no navegador (localStorage) e são reaplicadas
   automaticamente nas próximas visitas.
   -------------------------------------------------------------------------- */

const TAMANHOS_FONTE = ['', 'fonte-grande', 'fonte-maior'];

/** Aplica o tamanho de fonte salvo (0 = padrão, 1 = grande, 2 = maior). */
function aplicarTamanhoFonte(indice) {
  document.documentElement.classList.remove('fonte-grande', 'fonte-maior');
  if (TAMANHOS_FONTE[indice]) {
    document.documentElement.classList.add(TAMANHOS_FONTE[indice]);
  }
  try {
    localStorage.setItem('pa-fonte', String(indice));
  } catch (erro) {
    /* navegador sem armazenamento local: a preferência vale só nesta visita */
  }
}

/** Liga ou desliga o modo de alto contraste. */
function aplicarAltoContraste(ativo) {
  document.body.classList.toggle('alto-contraste', ativo);
  const botao = document.getElementById('btn-contraste');
  if (botao) botao.setAttribute('aria-pressed', String(ativo));
  try {
    localStorage.setItem('pa-contraste', ativo ? '1' : '0');
  } catch (erro) {
    /* ignora indisponibilidade do localStorage */
  }
}

/** Configura os botões da barra de acessibilidade e restaura as preferências. */
function iniciarAcessibilidade() {
  let indiceFonte = 0;
  let contraste = false;

  try {
    indiceFonte = Number(localStorage.getItem('pa-fonte') || 0);
    contraste = localStorage.getItem('pa-contraste') === '1';
  } catch (erro) {
    /* ignora indisponibilidade do localStorage */
  }

  aplicarTamanhoFonte(indiceFonte);
  aplicarAltoContraste(contraste);

  const aumentar = document.getElementById('btn-aumentar-fonte');
  const diminuir = document.getElementById('btn-diminuir-fonte');
  const contrasteBtn = document.getElementById('btn-contraste');
  const aviso = document.getElementById('aviso-acessibilidade');

  function anunciar(texto) {
    if (aviso) aviso.textContent = texto; // região aria-live: leitores de tela anunciam
  }

  if (aumentar) {
    aumentar.addEventListener('click', () => {
      indiceFonte = Math.min(indiceFonte + 1, TAMANHOS_FONTE.length - 1);
      aplicarTamanhoFonte(indiceFonte);
      anunciar(`Tamanho da fonte: nível ${indiceFonte + 1} de ${TAMANHOS_FONTE.length}.`);
    });
  }

  if (diminuir) {
    diminuir.addEventListener('click', () => {
      indiceFonte = Math.max(indiceFonte - 1, 0);
      aplicarTamanhoFonte(indiceFonte);
      anunciar(`Tamanho da fonte: nível ${indiceFonte + 1} de ${TAMANHOS_FONTE.length}.`);
    });
  }

  if (contrasteBtn) {
    contrasteBtn.addEventListener('click', () => {
      contraste = !contraste;
      aplicarAltoContraste(contraste);
      anunciar(contraste ? 'Alto contraste ativado.' : 'Alto contraste desativado.');
    });
  }
}

/**
 * Respeita a preferência do sistema por menos animações: o carrossel deixa de
 * trocar de slide sozinho e passa a ser controlado apenas pelos botões.
 */
function ajustarCarrossel() {
  const carrossel = document.getElementById('carrosselPetshop');
  if (!carrossel || !window.bootstrap) return;

  const menosAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const instancia = bootstrap.Carousel.getOrCreateInstance(carrossel, {
    interval: menosAnimacao ? false : 5000,
    pause: 'hover',
    ride: menosAnimacao ? false : 'carousel',
  });

  if (menosAnimacao) instancia.pause();
}

/* Inicialização: tudo começa depois que o HTML foi carregado. */
document.addEventListener('DOMContentLoaded', () => {
  iniciarRelogio();
  atualizarAnoDoRodape();
  iniciarAcessibilidade();
  ajustarCarrossel();
});
