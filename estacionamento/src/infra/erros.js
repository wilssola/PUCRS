/**
 * Erros de domínio do sistema de controle de estacionamento.
 * Cada regra de negócio violada tem um erro próprio, permitindo tratar
 * separadamente cada situação prevista no documento do projeto.
 */

/** Erro base: todos os erros do domínio herdam desta classe. */
export class ErroDominio extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = new.target.name;
  }
}

/** Placa fora do padrão brasileiro (antigo ABC1234 ou Mercosul ABC1D23). */
export class PlacaInvalidaError extends ErroDominio {}

/** Placa já cadastrada para algum cliente (uso do Set de placas). */
export class PlacaDuplicadaError extends ErroDominio {}

/** Cliente já cadastrado com o mesmo CPF/CNPJ. */
export class ClienteDuplicadoError extends ErroDominio {}

/** Cliente ou placa não encontrados no cadastro. */
export class NaoEncontradoError extends ErroDominio {}

/** Limite de placas da categoria do cliente foi atingido. */
export class LimiteDePlacasError extends ErroDominio {}

/** Entrada não autorizada (bloqueio, inadimplência, saldo negativo, etc.). */
export class EntradaNaoAutorizadaError extends ErroDominio {}

/** O veículo já possui um registro de entrada em aberto. */
export class VeiculoJaEstacionadoError extends ErroDominio {}

/** Não existe registro em aberto para a placa informada. */
export class RegistroNaoEncontradoError extends ErroDominio {}

/** Operação inválida sobre o ticket (ex.: fechar duas vezes). */
export class OperacaoInvalidaError extends ErroDominio {}
