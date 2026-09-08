/* ==========================================================================
   cadastro.js - formulário de cadastro do cliente e do pet
   Depende de formularios.js (máscaras, validação de CPF e mensagens).
   Funcionalidades:
     - máscaras de CPF, telefone e CEP;
     - validação do CPF, da data de nascimento e da idade do pet;
     - inclusão de mais de um pet no mesmo cadastro;
     - resumo do cadastro e gravação local (localStorage), já que nesta fase
       o site ainda não possui servidor.
   ========================================================================== */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const formulario = document.getElementById('form-cadastro');
  if (!formulario) return;

  const campoCPF = document.getElementById('cpf');
  const campoTelefone = document.getElementById('telefone');
  const campoCelular = document.getElementById('celular');
  const campoCEP = document.getElementById('cep');
  const campoNascimento = document.getElementById('nascimento');
  const campoIdadePet = document.getElementById('pet-idade');
  const listaPets = document.getElementById('lista-pets');
  const botaoAdicionarPet = document.getElementById('btn-adicionar-pet');

  // ---------------------------------------------------------------- máscaras
  if (campoCPF) mascararCPF(campoCPF);
  if (campoTelefone) mascararTelefone(campoTelefone);
  if (campoCelular) mascararTelefone(campoCelular);
  if (campoCEP) mascararCEP(campoCEP);

  // A data de nascimento não pode ser futura nem indicar menos de 18 anos.
  if (campoNascimento) {
    const hoje = new Date();
    const maiorIdade = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate());
    campoNascimento.max = maiorIdade.toISOString().slice(0, 10);
  }

  /* ------------------------------------------------------------------------
     Lista de pets: o formulário mostra um pet por vez e o botão "Adicionar
     outro pet" guarda os dados preenchidos em uma lista visível na tela.
     ------------------------------------------------------------------------ */
  const petsAdicionados = [];

  /** Lê os campos do pet e devolve um objeto, ou null se estiverem incompletos. */
  function lerPetDoFormulario() {
    const nome = document.getElementById('pet-nome').value.trim();
    const especie = document.querySelector('input[name="pet-especie"]:checked');
    const raca = document.getElementById('pet-raca').value.trim();
    const idade = document.getElementById('pet-idade').value;
    const porte = document.getElementById('pet-porte').value;
    const observacoes = document.getElementById('pet-observacoes').value.trim();
    const cuidados = Array.from(
      document.querySelectorAll('input[name="pet-cuidados"]:checked'),
    ).map((caixa) => caixa.value);

    if (!nome || !especie || !raca || idade === '' || !porte) return null;

    return {
      nome,
      especie: especie.value,
      raca,
      idade: Number(idade),
      porte,
      cuidados,
      observacoes,
    };
  }

  /** Redesenha a lista de pets já incluídos no cadastro. */
  function desenharListaPets() {
    if (!listaPets) return;

    if (petsAdicionados.length === 0) {
      listaPets.innerHTML =
        '<li class="list-group-item text-body-secondary">Nenhum pet adicionado ainda.</li>';
      return;
    }

    listaPets.innerHTML = petsAdicionados
      .map((pet, indice) => `
        <li class="list-group-item d-flex justify-content-between align-items-start gap-3">
          <div>
            <strong>${pet.nome}</strong> — ${pet.especie}, raça ${pet.raca},
            ${pet.idade} ano(s), porte ${pet.porte}.
            ${pet.cuidados.length ? `<br><small>Cuidados: ${pet.cuidados.join(', ')}.</small>` : ''}
          </div>
          <button type="button" class="btn btn-sm btn-outline-danger"
                  data-remover="${indice}"
                  aria-label="Remover o pet ${pet.nome} da lista">Remover</button>
        </li>`)
      .join('');
  }

  if (botaoAdicionarPet) {
    botaoAdicionarPet.addEventListener('click', () => {
      const pet = lerPetDoFormulario();

      if (pet === null) {
        anunciar('mensagem-cadastro',
          'Preencha nome, espécie, raça, idade e porte do pet antes de adicioná-lo.', 'erro');
        document.getElementById('pet-nome').focus();
        return;
      }

      petsAdicionados.push(pet);
      desenharListaPets();
      anunciar('mensagem-cadastro',
        `Pet ${pet.nome} adicionado. Total de pets no cadastro: ${petsAdicionados.length}.`,
        'sucesso');

      // limpa os campos do pet para o próximo cadastro
      document.getElementById('pet-nome').value = '';
      document.getElementById('pet-raca').value = '';
      document.getElementById('pet-idade').value = '';
      document.getElementById('pet-observacoes').value = '';
      document.querySelectorAll('input[name="pet-cuidados"]').forEach((c) => { c.checked = false; });
      document.getElementById('pet-nome').focus();
    });
  }

  if (listaPets) {
    listaPets.addEventListener('click', (evento) => {
      const botao = evento.target.closest('[data-remover]');
      if (!botao) return;
      const indice = Number(botao.dataset.remover);
      const removido = petsAdicionados.splice(indice, 1)[0];
      desenharListaPets();
      anunciar('mensagem-cadastro', `Pet ${removido.nome} removido do cadastro.`, 'info');
    });
    desenharListaPets();
  }

  /* ------------------------------------------------------------------------
     Validações próprias, executadas antes do envio
     ------------------------------------------------------------------------ */
  function validacoesExtras() {
    let tudoCerto = true;

    if (campoCPF) {
      const valido = cpfEhValido(campoCPF.value);
      marcarCampo(campoCPF, valido, 'Informe um CPF válido.');
      if (!valido) tudoCerto = false;
    }

    if (campoIdadePet && campoIdadePet.value !== '') {
      const idade = Number(campoIdadePet.value);
      const valido = idade >= 0 && idade <= 30;
      marcarCampo(campoIdadePet, valido, 'A idade do pet deve estar entre 0 e 30 anos.');
      if (!valido) tudoCerto = false;
    }

    // é preciso ter ao menos um pet: o do formulário ou algum já adicionado
    const petAtual = lerPetDoFormulario();
    if (petAtual === null && petsAdicionados.length === 0) {
      anunciar('mensagem-cadastro',
        'Cadastre pelo menos um pet: preencha os dados do animal.', 'erro');
      tudoCerto = false;
    }

    return tudoCerto;
  }

  /* ------------------------------------------------------------------------
     Envio: monta o resumo, guarda no navegador e confirma para o usuário
     ------------------------------------------------------------------------ */
  ativarValidacao(formulario, (dados) => {
    const petAtual = lerPetDoFormulario();
    const pets = petAtual ? [...petsAdicionados, petAtual] : [...petsAdicionados];

    const cadastro = {
      nome: dados.get('nome'),
      cpf: dados.get('cpf'),
      nascimento: dados.get('nascimento'),
      sexo: dados.get('sexo'),
      email: dados.get('email'),
      telefone: dados.get('telefone'),
      celular: dados.get('celular'),
      endereco: {
        cep: dados.get('cep'),
        logradouro: dados.get('logradouro'),
        numero: dados.get('numero'),
        complemento: dados.get('complemento'),
        bairro: dados.get('bairro'),
        cidade: dados.get('cidade'),
        uf: dados.get('uf'),
      },
      contatoPreferido: dados.get('contato-preferido'),
      novidades: dados.get('novidades') === 'sim',
      pets,
      registradoEm: new Date().toISOString(),
    };

    try {
      localStorage.setItem('pa-cadastro', JSON.stringify(cadastro));
    } catch (erro) {
      /* sem armazenamento local o cadastro vale apenas para esta visita */
    }

    // resumo exibido na tela
    const resumo = document.getElementById('resumo-cadastro');
    if (resumo) {
      resumo.innerHTML = `
        <h3 class="h5">Cadastro concluído</h3>
        <p class="mb-1"><strong>Cliente:</strong> ${cadastro.nome} — CPF ${cadastro.cpf}</p>
        <p class="mb-1"><strong>Contato:</strong> ${cadastro.email} | ${cadastro.celular}</p>
        <p class="mb-1"><strong>Endereço:</strong> ${cadastro.endereco.logradouro},
           ${cadastro.endereco.numero} — ${cadastro.endereco.bairro},
           ${cadastro.endereco.cidade}/${cadastro.endereco.uf} — CEP ${cadastro.endereco.cep}</p>
        <p class="mb-1"><strong>Pets (${pets.length}):</strong>
           ${pets.map((p) => `${p.nome} (${p.especie}, ${p.raca}, ${p.idade} ano[s], porte ${p.porte})`).join('; ')}</p>
        <p class="mb-0">Use agora a página
           <a href="agendamento.html">Agendamento</a> para marcar banho ou tosa.</p>`;
      resumo.hidden = false;
    }

    anunciar('mensagem-cadastro',
      `Cadastro de ${cadastro.nome} salvo neste navegador com ${pets.length} pet(s).`, 'sucesso');

    formulario.classList.remove('was-validated');
    formulario.reset();
    petsAdicionados.length = 0;
    desenharListaPets();
  }, validacoesExtras);
});
