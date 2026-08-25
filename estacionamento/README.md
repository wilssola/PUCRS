# Sistema de Controle de Estacionamento — EstACME (Fase 1)

Projeto da disciplina **Programação Orientada a Objetos** — PUCRS.
Autor: **Wilson Oliveira Lima**

Sistema em JavaScript (Node.js, ES Modules) que controla o estacionamento subterrâneo compartilhado
pelo shopping, pelo edifício corporativo e pela universidade: cadastro de clientes pré-cadastrados,
autorização de entrada, processamento de saída com cálculo de cobrança, descontos e relatórios
gerenciais, com persistência em arquivos CSV.

A implementação segue o documento complementar **“Sistema de Controle de Estacionamento”** e o
diagrama de classes da **Figura 1**.

## Como executar

Requisito: Node.js 18 ou superior (nenhuma dependência externa).

```bash
node src/main.js       # demonstração completa das regras   (npm start)
node tests/testes.js   # 32 testes das regras de negócio    (npm test)
```

`src/main.js` restaura o cenário de `seed-data/` em `data/`, executa a demonstração e salva os
arquivos atualizados ao encerrar — por isso pode ser executado quantas vezes forem necessárias.

## Estrutura do projeto

```
estacionamento/
├── diagram/
│   ├── diagrama-de-classes.mmd    # fonte do diagrama (Mermaid)
│   ├── diagrama-de-classes.pdf    # diagrama para entrega
│   ├── diagrama-de-classes.png
│   └── diagrama-de-classes.svg
├── seed-data/                     # cenário original (Figuras 2 e 3 do documento)
│   ├── clientes.csv
│   └── registros.csv
├── data/                          # dados em uso, gravados no encerramento
├── src/
│   ├── app/App.js                       # interface com o usuário (classe App)
│   ├── domain/
│   │   ├── clients/
│   │   │   ├── Cliente.js               # classe abstrata (raiz da herança)
│   │   │   ├── ClienteAvulso.js         # classe adicional: cliente não cadastrado
│   │   │   ├── Empresa.js
│   │   │   ├── Estudante.js
│   │   │   └── Professor.js
│   │   ├── discounts/
│   │   │   ├── Desconto.js              # classe abstrata do mecanismo de descontos
│   │   │   ├── DescontoClienteFrequente.js
│   │   │   └── PoliticaDescontos.js
│   │   ├── Placa.js                     # objeto de valor (validação e normalização)
│   │   ├── Tarifas.js                   # valores de cobrança em um só lugar
│   │   └── TicketEstacionamento.js      # registro de entrada/saída e valores
│   ├── infra/
│   │   ├── erros.js                     # exceções de domínio
│   │   └── tempo.js                     # diárias, virada de meia-noite, formatação
│   ├── services/
│   │   ├── CadastroClientes.js
│   │   ├── RegistroDeEntradas_E_Saidas.js
│   │   └── RelatoriosGerenciais.js
│   └── main.js
├── tests/testes.js
└── package.json
```

## Aderência ao diagrama da Figura 1

| Classe da Figura 1 | Arquivo |
| --- | --- |
| `App` | `src/app/App.js` |
| `RelatoriosGerenciais` | `src/services/RelatoriosGerenciais.js` |
| `RegistroDeEntradas_E_Saidas` | `src/services/RegistroDeEntradas_E_Saidas.js` |
| `TicketEstacionamento` | `src/domain/TicketEstacionamento.js` |
| `CadastroClientes` | `src/services/CadastroClientes.js` |
| `Cliente` (abstrata) | `src/domain/clients/Cliente.js` |
| `Estudante`, `Professor`, `Empresa` | `src/domain/clients/` |

Classes adicionais criadas (permitidas pelo documento, sem violar o modelo mínimo):
`ClienteAvulso`, `Placa`, `Tarifas`, `Desconto`, `DescontoClienteFrequente` e `PoliticaDescontos`.

## Regras de negócio implementadas

Todos os valores estão em `src/domain/Tarifas.js` e podem ser reajustados sem alterar as regras.

| Categoria | Regra de cobrança | Regras de acesso |
| --- | --- | --- |
| **Avulso** | R$ 5,00 por hora (fração conta como hora cheia) até o limite de 6 horas; acima disso, diária de R$ 35,00. Cada virada de meia-noite acrescenta uma nova diária, independentemente das horas do dia anterior. | Identificado apenas pela placa. Se recusar o pagamento, a saída é liberada e a placa entra na **lista de bloqueio**, impedindo entradas futuras. |
| **Estudante** | Ingresso fixo de R$ 12,00, válido quando entrada e saída ocorrem no mesmo dia; saída após a meia-noite gera um novo ingresso. Uso **pré-pago**: o valor é debitado dos créditos e o saldo pode ficar negativo, liberando a saída. | Uma única placa por CPF. Com saldo negativo, novas entradas são bloqueadas até a recarga. |
| **Professor** | Entrada **gratuita**; os registros existem apenas para controle e seguro. | Até duas placas por CPF, mas somente **um veículo por vez** no estacionamento. |
| **Empresa** | Cobrança **por diária** (R$ 30,00). Veículo que permanece após a meia-noite recebe **multa** de R$ 40,00 por dia. O valor não é pago na cancela: acumula como débito e é cobrado por boleto. | Quantas placas quiser, todas podem estacionar ao mesmo tempo. Boleto não quitado torna a empresa **inadimplente** e impede todos os seus veículos até a regularização. |

**Veículos pré-cadastrados nunca usam a modalidade avulsa:** ao ler a placa, o sistema procura o
proprietário no `CadastroClientes` e, se encontrado, aplica as regras da categoria dele.

**Descontos.** O único desconto ativo é o **“Cliente Frequente”**: clientes avulsos que utilizaram o
estacionamento três vezes nos últimos cinco dias recebem 20% de abatimento, concedido mesmo que já
tenham sido beneficiados antes. O identificador gravado no registro é exatamente a string
`Cliente Frequente` (ou `nenhum`, quando não há desconto). Novos descontos são criados herdando de
`Desconto` e registrados com `politicaDescontos.registrar(...)`, sem alterar nenhuma outra classe.

## Conceitos de POO aplicados

| Conceito | Onde aparece |
| --- | --- |
| **Abstração** | `Cliente` e `Desconto` são abstratas: não podem ser instanciadas e definem o contrato das subclasses. |
| **Herança** | `Estudante`, `Professor`, `Empresa` e `ClienteAvulso` herdam de `Cliente`; `DescontoClienteFrequente` herda de `Desconto`. |
| **Encapsulamento** | Todos os atributos são privados (`#atributo`) e expostos por *getters*; coleções são devolvidas como cópia (`placas`, `tickets`) para impedir alteração externa. |
| **Polimorfismo** | `RegistroDeEntradas_E_Saidas.processarSaida` chama sempre `cliente.calcularCusto(...)` e `cliente.registrarPagamento(...)`; cada categoria responde com a sua regra. O mesmo vale para `autorizarEntrada` e para os descontos. |
| **Composição / agregação** | O registro é composto pelos tickets; o cadastro agrega os clientes; o ticket é composto por uma `Placa`. |
| **Objeto de valor** | `Placa` é imutável (`Object.freeze`), valida-se no construtor e compara-se por valor. |

## Estruturas de dados exigidas

| Estrutura | Onde | Para quê |
| --- | --- | --- |
| `Set<string>` | `Cliente.#placas` e `CadastroClientes.#placasCadastradas` | Evitar o cadastro de placas duplicadas. |
| `Set<string>` | `RegistroDeEntradas_E_Saidas.#placasBloqueadas` | Verificação imediata de veículos bloqueados. |
| `Map<string, Cliente>` | `CadastroClientes.#clientePorPlaca` | Identificar o proprietário de um veículo em tempo constante. |
| `Map<string, Cliente>` | `CadastroClientes.#clientesPorDocumento` | Acesso direto ao cliente pelo CPF/CNPJ. |
| `Map<string, TicketEstacionamento>` | `RegistroDeEntradas_E_Saidas.#ticketsAbertos` | Recuperar o registro em aberto pela placa, na saída. |

## Funcionalidades

- Cadastro e remoção de clientes pré-cadastrados (CPF/CNPJ e nome).
- Cadastro e remoção de placas, respeitando o limite de cada categoria.
- Autorização de entrada: verificação de permissão, criação do ticket com placa, tipo de cliente e
  data/hora de entrada.
- Processamento de saída: recuperação do ticket pela placa, cálculo do custo conforme o tipo de
  cliente, registro de data/hora de saída, custo, identificador do desconto, valor do desconto,
  valor devido e valor efetivamente pago.
- Relatórios gerenciais:
  - valor arrecadado por período e por categorias (individuais ou combinadas);
  - situação de um cliente cadastrado (veículos estacionados e saldo/débito);
  - registros de um cliente cadastrado em determinado período;
  - registros de clientes não cadastrados em determinado período;
  - relação dos clientes impedidos de entrar;
  - relação dos 10 clientes mais frequentes do ano.
- Persistência em CSV: carga integral na inicialização, operações em memória e gravação automática
  no encerramento (`clientes.csv` e `registros.csv`, nos formatos das Figuras 2 e 3 do documento).

## Testes

`node tests/testes.js` executa 32 verificações automatizadas das regras: tarifas do avulso, virada de
meia-noite, desconto de cliente frequente, lista de bloqueio, ingresso e saldo do estudante,
gratuidade e limite de um veículo do professor, diária/multa/boleto da empresa, limites de placas,
exceções e leitura/gravação dos CSV. Todos passam na versão entregue.
