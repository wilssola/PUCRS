import { PlacaInvalidaError } from '../infra/erros.js';

/**
 * Placa de um veículo.
 *
 * Objeto de valor: é imutável, valida-se no próprio construtor (não existe
 * Placa em estado inválido) e é comparado pelo código, não pela referência.
 * O código normalizado é usado como chave nos Set e Map do sistema.
 */
export class Placa {
  /** Padrão antigo: ABC1234. */
  static PADRAO_ANTIGO = /^[A-Z]{3}[0-9]{4}$/;

  /** Padrão Mercosul: ABC1D23. */
  static PADRAO_MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

  #codigo;

  /** @param {string} codigo placa com ou sem hífen, maiúscula ou minúscula */
  constructor(codigo) {
    const normalizado = String(codigo ?? '').toUpperCase().replace(/[\s-]/g, '');
    if (!Placa.ehValida(normalizado)) {
      throw new PlacaInvalidaError(`Placa inválida: "${codigo}".`);
    }
    this.#codigo = normalizado;
    Object.freeze(this);
  }

  /** @param {string} codigo @returns {boolean} */
  static ehValida(codigo) {
    return Placa.PADRAO_ANTIGO.test(codigo) || Placa.PADRAO_MERCOSUL.test(codigo);
  }

  /** Normaliza um texto de placa sem criar o objeto (uso interno das coleções). */
  static normalizar(codigo) {
    return String(codigo ?? '').toUpperCase().replace(/[\s-]/g, '');
  }

  get codigo() {
    return this.#codigo;
  }

  /** @returns {'Mercosul'|'Antigo'} */
  get padrao() {
    return Placa.PADRAO_MERCOSUL.test(this.#codigo) ? 'Mercosul' : 'Antigo';
  }

  /** @param {Placa} outra @returns {boolean} */
  equals(outra) {
    return outra instanceof Placa && outra.codigo === this.#codigo;
  }

  toString() {
    return this.#codigo;
  }
}
