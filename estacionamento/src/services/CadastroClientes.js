import { Cliente } from '../domain/clients/Cliente.js';
import { Estudante } from '../domain/clients/Estudante.js';
import { Professor } from '../domain/clients/Professor.js';
import { Empresa } from '../domain/clients/Empresa.js';
import { Placa } from '../domain/Placa.js';
import {
  ClienteDuplicadoError,
  NaoEncontradoError,
  PlacaDuplicadaError,
} from '../infra/erros.js';

/**
 * Cadastro dos clientes pré-cadastrados (classe CadastroClientes da Figura 1).
 *
 * Estruturas de dados exigidas pelo documento do projeto:
 * - Map documento -> Cliente: acesso direto ao cliente pelo CPF/CNPJ;
 * - Map placa -> Cliente: identifica o proprietário de um veículo em O(1);
 * - Set de placas: impede o cadastro de placas duplicadas no sistema inteiro.
 */
export class CadastroClientes {
  #clientesPorDocumento;
  #clientePorPlaca;
  #placasCadastradas;

  constructor() {
    this.#clientesPorDocumento = new Map();
    this.#clientePorPlaca = new Map();
    this.#placasCadastradas = new Set();
  }

  get totalClientes() {
    return this.#clientesPorDocumento.size;
  }

  get clientes() {
    return [...this.#clientesPorDocumento.values()];
  }

  /** Cópia do conjunto de placas cadastradas no sistema. */
  get placasCadastradas() {
    return new Set(this.#placasCadastradas);
  }

  /**
   * Cadastra um cliente pré-cadastrado e indexa as suas placas.
   * @param {Cliente} cliente
   * @returns {Cliente}
   */
  cadastrarCliente(cliente) {
    if (!(cliente instanceof Cliente)) {
      throw new TypeError('Só é possível cadastrar objetos derivados de Cliente.');
    }
    if (this.#clientesPorDocumento.has(cliente.documento)) {
      throw new ClienteDuplicadoError(`Já existe cliente com o documento ${cliente.documento}.`);
    }

    // valida as placas antes de efetivar o cadastro
    cliente.placas.forEach((placa) => {
      if (this.#placasCadastradas.has(placa)) {
        throw new PlacaDuplicadaError(`A placa ${placa} já pertence a outro cliente.`);
      }
    });

    this.#clientesPorDocumento.set(cliente.documento, cliente);
    cliente.placas.forEach((placa) => {
      this.#placasCadastradas.add(placa);
      this.#clientePorPlaca.set(placa, cliente);
    });

    return cliente;
  }

  /**
   * Remove um cliente e todas as suas placas.
   * @param {string} documento
   */
  removerCliente(documento) {
    const cliente = this.buscarPorDocumento(documento);
    cliente.placas.forEach((placa) => {
      this.#placasCadastradas.delete(placa);
      this.#clientePorPlaca.delete(placa);
    });
    this.#clientesPorDocumento.delete(cliente.documento);
    return cliente;
  }

  /**
   * Vincula uma nova placa a um cliente já cadastrado, respeitando o limite da
   * categoria e a unicidade das placas no sistema.
   * @param {string} documento
   * @param {string} placa
   */
  adicionarPlaca(documento, placa) {
    const cliente = this.buscarPorDocumento(documento);
    const codigo = new Placa(placa).codigo;

    if (this.#placasCadastradas.has(codigo)) {
      throw new PlacaDuplicadaError(`A placa ${codigo} já está cadastrada no sistema.`);
    }

    cliente.adicionarPlaca(codigo); // valida o limite da categoria
    this.#placasCadastradas.add(codigo);
    this.#clientePorPlaca.set(codigo, cliente);
    return codigo;
  }

  /**
   * Remove uma placa de um cliente cadastrado.
   * @param {string} documento
   * @param {string} placa
   */
  removerPlaca(documento, placa) {
    const cliente = this.buscarPorDocumento(documento);
    const codigo = cliente.removerPlaca(placa);
    this.#placasCadastradas.delete(codigo);
    this.#clientePorPlaca.delete(codigo);
    return codigo;
  }

  /**
   * @param {string} documento
   * @returns {Cliente}
   */
  buscarPorDocumento(documento) {
    const cliente = this.#clientesPorDocumento.get(String(documento).trim());
    if (cliente === undefined) {
      throw new NaoEncontradoError(`Cliente ${documento} não encontrado no cadastro.`);
    }
    return cliente;
  }

  /**
   * Identifica o proprietário de um veículo (Map placa -> Cliente).
   * @param {string} placa
   * @returns {Cliente|null} null quando a placa não é cadastrada (cliente avulso)
   */
  buscarPorPlaca(placa) {
    return this.#clientePorPlaca.get(Placa.normalizar(placa)) ?? null;
  }

  /** @param {string} placa @returns {boolean} */
  ehPlacaCadastrada(placa) {
    return this.#placasCadastradas.has(Placa.normalizar(placa));
  }

  /** Clientes cadastrados que estão impedidos de entrar no estacionamento. */
  clientesImpedidos() {
    return this.clientes.filter((cliente) => cliente.estaImpedido);
  }

  // ------------------------------------------------------------- persistência

  /**
   * Carrega o cadastro a partir do conteúdo de um arquivo CSV.
   * Formatos aceitos (conforme a Figura 2 do documento):
   *   Estudante: cpf,nome,creditos,Estudante,placa
   *   Professor: cpf,nome,Professor,placa1,placa2
   *   Empresa:   cnpj,nome,saldoDevedor,Empresa,placa1,placa2,...
   * @param {string} conteudo
   * @returns {number} total de clientes cadastrados
   */
  carregarDeTextoCSV(conteudo) {
    const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim().length > 0);

    linhas.forEach((linha) => {
      const colunas = linha.split(',').map((c) => c.trim());
      const campo2 = colunas[2] ?? '';
      const ehNumero = campo2 !== '' && !Number.isNaN(Number(campo2));

      if (ehNumero) {
        // Estudante ou Empresa: o terceiro campo é numérico (saldo ou débito)
        const [documento, nome, valorStr, tipo, ...placas] = colunas;
        const valor = Number(valorStr);

        if (tipo.toUpperCase() === 'ESTUDANTE') {
          const estudante = new Estudante(documento, nome, valor);
          if (placas[0]) estudante.adicionarPlaca(placas[0]);
          this.cadastrarCliente(estudante);
        } else if (tipo.toUpperCase() === 'EMPRESA') {
          const empresa = new Empresa(documento, nome, valor);
          placas.filter(Boolean).forEach((p) => empresa.adicionarPlaca(p));
          this.cadastrarCliente(empresa);
        } else {
          console.warn('Linha ignorada (tipo desconhecido):', linha);
        }
      } else if (campo2.toUpperCase() === 'PROFESSOR') {
        const [documento, nome, , ...placas] = colunas;
        const professor = new Professor(documento, nome);
        placas.filter(Boolean).forEach((p) => professor.adicionarPlaca(p));
        this.cadastrarCliente(professor);
      } else {
        console.warn('Linha ignorada (tipo desconhecido):', linha);
      }
    });

    return this.totalClientes;
  }

  /**
   * Gera o conteúdo CSV do cadastro, no mesmo formato de leitura.
   * @returns {string}
   */
  paraTextoCSV() {
    return this.clientes
      .map((cliente) => {
        const placas = [...cliente.placas].join(',');
        if (cliente instanceof Professor) {
          return `${cliente.documento},${cliente.nome},Professor,${placas}`;
        }
        if (cliente instanceof Estudante) {
          return `${cliente.documento},${cliente.nome},${cliente.saldo},Estudante,${placas}`;
        }
        return `${cliente.documento},${cliente.nome},${cliente.saldoDevedor},Empresa,${placas}`;
      })
      .join('\n');
  }
}
