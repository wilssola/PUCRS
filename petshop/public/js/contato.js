/* ==========================================================================
   contato.js - formulário de contato
   Depende de formularios.js (máscara de telefone, validação e mensagens).
   Como o site ainda não tem servidor, a mensagem é confirmada na tela e o
   usuário recebe também um link para enviá-la por e-mail.
   ========================================================================== */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const formulario = document.getElementById('form-contato');
  if (!formulario) return;

  const campoTelefone = document.getElementById('contato-telefone');
  if (campoTelefone) mascararTelefone(campoTelefone);

  ativarValidacao(formulario, (dados) => {
    const nome = dados.get('nome');
    const assunto = dados.get('assunto');
    const mensagem = dados.get('mensagem');

    // monta um link mailto com os dados já preenchidos
    const corpo = encodeURIComponent(
      `Nome: ${nome}\nE-mail: ${dados.get('email')}\n`
      + `Telefone: ${dados.get('telefone') || 'não informado'}\n\n${mensagem}`,
    );
    const link = `mailto:contato@pataamiga.pet?subject=${encodeURIComponent(assunto)}&body=${corpo}`;

    anunciar('mensagem-contato',
      `Obrigado, ${nome}! Sua mensagem sobre "${assunto}" foi registrada. `
      + 'Respondemos em até um dia útil.', 'sucesso');

    const aviso = document.getElementById('mensagem-contato');
    if (aviso) {
      const acao = document.createElement('p');
      acao.className = 'mb-0 mt-2';
      acao.innerHTML = `<a href="${link}">Enviar também por e-mail</a>`;
      aviso.appendChild(acao);
    }

    formulario.classList.remove('was-validated');
    formulario.reset();
  });
});
