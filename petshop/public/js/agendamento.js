/* ==========================================================================
   agendamento.js - escolha do serviço e marcação de data e horário
   Depende de precos.js (tabela de valores) e de formularios.js (validação).
   Funcionalidades:
     - calendário (input date) limitado aos próximos 60 dias, sem domingos;
     - horários gerados conforme o dia escolhido e a duração do serviço;
     - alternância entre tele-busca (com endereço) e entrega no local;
     - cálculo do valor em tempo real e resumo do agendamento;
     - contagem regressiva (função temporal) até o horário marcado.
   ========================================================================== */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const formulario = document.getElementById('form-agendamento');
  if (!formulario) return;

  const campoData = document.getElementById('data');
  const campoHorario = document.getElementById('horario');
  const campoPorte = document.getElementById('porte');
  const blocoEndereco = document.getElementById('bloco-endereco');
  const campoEnderecoBusca = document.getElementById('endereco-busca');
  const campoCEPBusca = document.getElementById('cep-busca');
  const painelValor = document.getElementById('painel-valor');
  const resumo = document.getElementById('resumo-agendamento');

  let temporizador = null;

  if (campoCEPBusca) mascararCEP(campoCEPBusca);

  /* ------------------------------------------------------------------------
     Calendário: só aceita datas de amanhã até 60 dias à frente
     ------------------------------------------------------------------------ */
  const hoje = new Date();
  const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
  const limite = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 60);

  /** Converte uma data para o formato AAAA-MM-DD usado pelo input date. */
  function paraValorDeInput(data) {
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${data.getFullYear()}-${mes}-${dia}`;
  }

  campoData.min = paraValorDeInput(amanha);
  campoData.max = paraValorDeInput(limite);

  /** Interpreta o valor do input date como data local (evita erro de fuso). */
  function dataEscolhida() {
    if (!campoData.value) return null;
    const [ano, mes, dia] = campoData.value.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
  }

  /* ------------------------------------------------------------------------
     Horários disponíveis: 8h às 17h em dias úteis, 8h às 15h aos sábados.
     O último horário respeita a duração do serviço escolhido.
     ------------------------------------------------------------------------ */
  function servicoSelecionado() {
    const marcado = document.querySelector('input[name="servico"]:checked');
    return marcado ? marcado.value : null;
  }

  function atualizarHorarios() {
    const data = dataEscolhida();
    const servico = servicoSelecionado();

    campoHorario.innerHTML = '';

    if (data === null) {
      campoHorario.innerHTML = '<option value="">Escolha primeiro a data</option>';
      campoHorario.disabled = true;
      return;
    }

    if (data.getDay() === 0) {
      campoHorario.innerHTML = '<option value="">Não atendemos aos domingos</option>';
      campoHorario.disabled = true;
      marcarCampo(campoData, false, 'Escolha um dia de segunda a sábado.');
      return;
    }

    marcarCampo(campoData, true);

    const sabado = data.getDay() === 6;
    const ultimaEntrada = sabado ? 15 : 17;
    const duracao = servico ? TABELA_SERVICOS[servico].duracaoMinutos / 60 : 1.5;

    const opcoes = ['<option value="">Selecione um horário</option>'];
    for (let hora = 8; hora + duracao <= ultimaEntrada + 0.001; hora += 0.5) {
      const h = Math.floor(hora);
      const m = hora % 1 === 0 ? '00' : '30';
      const texto = `${String(h).padStart(2, '0')}:${m}`;
      opcoes.push(`<option value="${texto}">${texto}</option>`);
    }

    campoHorario.innerHTML = opcoes.join('');
    campoHorario.disabled = false;
  }

  /* ------------------------------------------------------------------------
     Tele-busca x entrega no local: mostra ou esconde o endereço de coleta
     ------------------------------------------------------------------------ */
  function atualizarModo() {
    const modo = document.querySelector('input[name="modo"]:checked');
    const comTeleBusca = modo && modo.value === 'tele-busca';

    blocoEndereco.hidden = !comTeleBusca;
    campoEnderecoBusca.required = comTeleBusca;
    campoCEPBusca.required = comTeleBusca;

    if (!comTeleBusca) {
      campoEnderecoBusca.value = '';
      campoCEPBusca.value = '';
      marcarCampo(campoEnderecoBusca, true);
      marcarCampo(campoCEPBusca, true);
    }

    atualizarValor();
  }

  /* ------------------------------------------------------------------------
     Cálculo do valor em tempo real
     ------------------------------------------------------------------------ */
  function atualizarValor() {
    const servico = servicoSelecionado();
    const porte = campoPorte.value;
    const modo = document.querySelector('input[name="modo"]:checked');
    const comTeleBusca = modo && modo.value === 'tele-busca';

    if (!servico || !porte) {
      painelValor.innerHTML =
        '<p class="mb-0">Escolha o serviço e o porte do pet para ver o valor.</p>';
      return;
    }

    const valores = calcularValor(servico, porte, comTeleBusca);
    painelValor.innerHTML = `
      <p class="mb-1">${TABELA_SERVICOS[servico].nome} — porte ${PORTES[porte]}:
         <strong>${formatarMoeda(valores.base)}</strong></p>
      <p class="mb-1">Tele-busca (leva e traz):
         <strong>${valores.teleBusca ? formatarMoeda(valores.teleBusca) : 'não solicitada'}</strong></p>
      <p class="mb-0 preco">Total: ${formatarMoeda(valores.total)}</p>`;
  }

  /* ------------------------------------------------------------------------
     Contagem regressiva até o horário agendado (função temporal)
     ------------------------------------------------------------------------ */
  function iniciarContagem(dataHora) {
    if (temporizador !== null) window.clearInterval(temporizador);

    // o parágrafo da contagem é recriado junto com o resumo a cada envio
    const contagem = document.getElementById('contagem-regressiva');
    if (!contagem) return;

    function atualizar() {
      const restante = dataHora.getTime() - Date.now();

      if (restante <= 0) {
        contagem.textContent = 'O horário agendado chegou. Estamos esperando o seu pet!';
        window.clearInterval(temporizador);
        return;
      }

      const dias = Math.floor(restante / 86400000);
      const horas = Math.floor((restante % 86400000) / 3600000);
      const minutos = Math.floor((restante % 3600000) / 60000);
      const segundos = Math.floor((restante % 60000) / 1000);
      contagem.textContent =
        `Faltam ${dias} dia(s), ${horas}h ${minutos}min ${segundos}s para o atendimento.`;
    }

    atualizar();
    temporizador = window.setInterval(atualizar, 1000);
  }

  /* ------------------------------------------------------------------------
     Validações próprias do agendamento
     ------------------------------------------------------------------------ */
  function validacoesExtras() {
    let tudoCerto = true;
    const data = dataEscolhida();

    if (data === null) {
      marcarCampo(campoData, false, 'Escolha a data do atendimento.');
      tudoCerto = false;
    } else if (data.getDay() === 0) {
      marcarCampo(campoData, false, 'Não há atendimento aos domingos.');
      tudoCerto = false;
    } else if (data < amanha) {
      marcarCampo(campoData, false, 'O agendamento deve ser feito com pelo menos um dia de antecedência.');
      tudoCerto = false;
    } else {
      marcarCampo(campoData, true);
    }

    if (!campoHorario.value) {
      marcarCampo(campoHorario, false, 'Escolha um horário disponível.');
      tudoCerto = false;
    } else {
      marcarCampo(campoHorario, true);
    }

    return tudoCerto;
  }

  /* ------------------------------------------------------------------------
     Envio do formulário: monta o resumo e inicia a contagem regressiva
     ------------------------------------------------------------------------ */
  ativarValidacao(formulario, (dados) => {
    const servico = dados.get('servico');
    const porte = dados.get('porte');
    const comTeleBusca = dados.get('modo') === 'tele-busca';
    const valores = calcularValor(servico, porte, comTeleBusca);

    const [ano, mes, dia] = String(dados.get('data')).split('-').map(Number);
    const [hora, minuto] = String(dados.get('horario')).split(':').map(Number);
    const dataHora = new Date(ano, mes - 1, dia, hora, minuto);

    resumo.innerHTML = `
      <h3 class="h5">Agendamento confirmado</h3>
      <dl class="row mb-2">
        <dt class="col-sm-4">Tutor</dt><dd class="col-sm-8">${dados.get('tutor')}</dd>
        <dt class="col-sm-4">Pet</dt><dd class="col-sm-8">${dados.get('pet')} (porte ${PORTES[porte]})</dd>
        <dt class="col-sm-4">Serviço</dt><dd class="col-sm-8">${TABELA_SERVICOS[servico].nome}</dd>
        <dt class="col-sm-4">Data e hora</dt>
        <dd class="col-sm-8">${dataHora.toLocaleDateString('pt-BR', { dateStyle: 'full' })}, às ${dados.get('horario')}</dd>
        <dt class="col-sm-4">Modalidade</dt>
        <dd class="col-sm-8">${comTeleBusca
          ? `Tele-busca em ${dados.get('endereco-busca')} (CEP ${dados.get('cep-busca')})`
          : 'Entrega do pet na loja'}</dd>
        <dt class="col-sm-4">Valor total</dt>
        <dd class="col-sm-8 preco">${formatarMoeda(valores.total)}</dd>
      </dl>
      <p class="mb-0" id="contagem-regressiva" role="status" aria-live="polite"></p>`;
    resumo.hidden = false;

    anunciar('mensagem-agendamento',
      `Agendamento de ${TABELA_SERVICOS[servico].nome} confirmado para `
      + `${dataHora.toLocaleDateString('pt-BR')} às ${dados.get('horario')}. `
      + `Valor total: ${formatarMoeda(valores.total)}.`, 'sucesso');

    try {
      localStorage.setItem('pa-agendamento', JSON.stringify({
        tutor: dados.get('tutor'),
        pet: dados.get('pet'),
        servico,
        porte,
        modo: dados.get('modo'),
        dataHora: dataHora.toISOString(),
        total: valores.total,
      }));
    } catch (erro) {
      /* sem localStorage o agendamento vale apenas para esta visita */
    }

    iniciarContagem(dataHora);
    resumo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, validacoesExtras);

  /* --------------------------------------------------- eventos de atualização */
  campoData.addEventListener('change', atualizarHorarios);
  campoPorte.addEventListener('change', atualizarValor);
  document.querySelectorAll('input[name="servico"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      atualizarHorarios();
      atualizarValor();
    });
  });
  document.querySelectorAll('input[name="modo"]').forEach((radio) => {
    radio.addEventListener('change', atualizarModo);
  });

  // estado inicial da tela
  atualizarHorarios();
  atualizarModo();
  atualizarValor();
});
