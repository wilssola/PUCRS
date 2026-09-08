/* ==========================================================================
   formularios.js - funções reaproveitadas pelos formulários do site
   (cadastro de cliente e pet, agendamento e contato):
     - máscaras de CPF, telefone e CEP enquanto o usuário digita;
     - validação de CPF pelos dígitos verificadores;
     - validação visual usando as classes do Bootstrap;
     - mensagens acessíveis (região aria-live).
   ========================================================================== */

'use strict';

/**
 * Aplica a máscara 000.000.000-00 ao campo de CPF.
 * @param {HTMLInputElement} campo
 */
function mascararCPF(campo) {
  campo.addEventListener('input', () => {
    const numeros = campo.value.replace(/\D/g, '').slice(0, 11);
    campo.value = numeros
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  });
}

/**
 * Aplica a máscara (00) 00000-0000 ao campo de telefone.
 * @param {HTMLInputElement} campo
 */
function mascararTelefone(campo) {
  campo.addEventListener('input', () => {
    const numeros = campo.value.replace(/\D/g, '').slice(0, 11);
    if (numeros.length <= 10) {
      campo.value = numeros
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      campo.value = numeros
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
  });
}

/**
 * Aplica a máscara 00000-000 ao campo de CEP.
 * @param {HTMLInputElement} campo
 */
function mascararCEP(campo) {
  campo.addEventListener('input', () => {
    const numeros = campo.value.replace(/\D/g, '').slice(0, 8);
    campo.value = numeros.replace(/(\d{5})(\d)/, '$1-$2');
  });
}

/**
 * Verifica se um CPF é válido pelo cálculo dos dois dígitos verificadores.
 * @param {string} texto CPF com ou sem pontuação
 * @returns {boolean}
 */
function cpfEhValido(texto) {
  const cpf = String(texto).replace(/\D/g, '');

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // rejeita 000.000.000-00, 111... etc.

  // calcula cada um dos dois dígitos verificadores
  for (let digito = 9; digito < 11; digito += 1) {
    let soma = 0;
    for (let i = 0; i < digito; i += 1) {
      soma += Number(cpf[i]) * (digito + 1 - i);
    }
    const resto = (soma * 10) % 11;
    const esperado = resto === 10 ? 0 : resto;
    if (esperado !== Number(cpf[digito])) return false;
  }

  return true;
}

/**
 * Escreve uma mensagem em uma região aria-live, para que leitores de tela
 * anunciem o resultado da operação sem que o usuário precise procurar na tela.
 * @param {string} idElemento
 * @param {string} texto
 * @param {'sucesso'|'erro'|'info'} [tipo]
 */
function anunciar(idElemento, texto, tipo = 'info') {
  const alvo = document.getElementById(idElemento);
  if (!alvo) return;

  const classes = {
    sucesso: 'alert alert-success',
    erro: 'alert alert-danger',
    info: 'alert alert-info',
  };

  alvo.className = classes[tipo] || classes.info;
  alvo.textContent = texto;
  alvo.hidden = false;
}

/**
 * Liga a validação do Bootstrap a um formulário: mostra os erros de cada campo
 * e só executa a ação de sucesso quando tudo estiver preenchido corretamente.
 *
 * @param {HTMLFormElement} formulario
 * @param {(dados: FormData) => void} aoEnviarComSucesso
 * @param {() => boolean} [validacaoExtra] regras próprias (ex.: CPF, data)
 */
function ativarValidacao(formulario, aoEnviarComSucesso, validacaoExtra = () => true) {
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();      // nesta fase o envio é tratado no navegador
    evento.stopPropagation();

    const extraOk = validacaoExtra();
    const nativoOk = formulario.checkValidity();
    formulario.classList.add('was-validated');

    if (!nativoOk || !extraOk) {
      // leva o foco ao primeiro campo inválido, ajudando quem navega por teclado
      const invalido = formulario.querySelector(':invalid, .is-invalid');
      if (invalido) invalido.focus();
      return;
    }

    aoEnviarComSucesso(new FormData(formulario));
  });
}

/**
 * Marca um campo como inválido (ou válido) e atualiza a mensagem de erro.
 * @param {HTMLInputElement} campo
 * @param {boolean} valido
 * @param {string} [mensagem]
 */
function marcarCampo(campo, valido, mensagem = '') {
  campo.classList.toggle('is-invalid', !valido);
  campo.setAttribute('aria-invalid', String(!valido));
  campo.setCustomValidity(valido ? '' : mensagem);
}
