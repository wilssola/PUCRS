# Sistema de Controle de Estacionamento — EstACME (Fases 1 e 2)

Projeto da disciplina **Programação Orientada a Objetos** — PUCRS.
Autor: **Wilson Oliveira Lima**

Sistema em JavaScript (Node.js, ES Modules) que controla o estacionamento subterrâneo compartilhado
pelo shopping, pelo edifício corporativo e pela universidade: cadastro de clientes pré-cadastrados,
autorização de entrada, processamento de saída com cálculo de cobrança, descontos e relatórios
gerenciais, com persistência em arquivos CSV.

A implementação segue o documento complementar **“Sistema de Controle de Estacionamento”** e o
diagrama de classes da **Figura 1**.

| Fase | Escopo entregue |
| --- | --- |
| **Fase 1** | Diagrama de classes, classes de domínio (clientes, placas, tickets e descontos) e o controle de entrada, saída e cobrança, com herança, encapsulamento e polimorfismo. |
| **Fase 2** | Interface com o usuário em menus, persistência em arquivos CSV (carga na inicialização, salvamento manual e automático) e os seis relatórios gerenciais, apoiados no uso obrigatório de `Set` e `Map`. |

## Como executar

Requisito: Node.js 18 ou superior (nenhuma dependência externa).

```bash
node src/main.js       # sistema com interface de menus      (npm start)
node src/demo.js       # demonstração automática das regras   (npm run demo)
node tests/testes.js   # 44 testes automatizados              (npm test)
```

`src/main.js` carrega `data/clientes.csv` e `data/registros.csv` (copiando o cenário inicial de
`seed-data/` quando a pasta está vazia), abre os menus e grava os dados atualizados ao sair.

`src/demo.js` executa um roteiro fixo que exercita todas as regras de negócio, sem interação, na
pasta `data-demo/` — assim a demonstração nunca altera os dados reais.

### Interface com o usuário

```
1. Clientes pré-cadastrados    listar, cadastrar (estudante/professor/empresa), adicionar e
                               remover placas, remover cliente, recarregar créditos e
                               emitir/vencer/quitar boletos de empresa
2. Movimentação de veículos    registrar entrada, registrar saída com cobrança (inclusive recusa
                               de pagamento), listar o pátio, consultar o histórico de uma placa
                               e administrar a lista de bloqueio
3. Relatórios gerenciais       os seis relatórios exigidos + um resumo consolidado
4. Dados                       salvar agora, recarregar do disco e conferir o que está em memória
0. Sair                        grava os arquivos CSV automaticamente
```

Toda a interação fica na classe `App` (a classe de interface da Figura 1), apoiada por `Terminal`,
que concentra a leitura do teclado e a formatação da saída (menus, tabelas e mensagens). As regras
de negócio continuam nas classes de domínio e de serviço.

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
│   ├── app/
│   │   ├── App.js                       # interface com o usuário (classe App)
│   │   └── Terminal.js                  # leitura do teclado e formatação da saída
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
│   ├── demo.js                          # demonstração automática das regras
│   └── main.js                          # inicia o sistema com a interface de menus
├── data/                                # arquivos CSV em uso (cadastro e registros)
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

**Descontos.** O único desconto ativo é o **ClienteFrequente**: clientes avulsos que utilizarem o
estacionamento **três vezes nos últimos cinco dias** recebem 20% de abatimento, concedido mesmo que
já tenham sido beneficiados antes. O identificador gravado no registro é exatamente a string
`ClienteFrequente` (ou `nenhum`, quando não há desconto), como exige o documento do projeto.

Interpretação adotada na contagem (`DescontoClienteFrequente`):

- a utilização que está sendo cobrada **conta** para o total, ou seja, o desconto já vale na
  **terceira** utilização dentro da janela — e não a partir da quarta;
- cada utilização é datada pela sua **entrada**, de modo que uma permanência longa não desloca a
  janela;
- a janela de cinco dias abrange o dia da utilização atual e os quatro dias anteriores;
- o benefício se repete nas utilizações seguintes que satisfaçam a regra;
- vale somente para clientes avulsos, identificados exclusivamente pela placa.

Novos descontos são criados herdando de `Desconto` e registrados com
`politicaDescontos.registrar(...)`, sem alterar nenhuma outra classe.

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
- Persistência em CSV: carga integral na inicialização, operações exclusivamente em memória e
  gravação manual (menu *Dados*) ou automática (ao sair e ao interromper com Ctrl+C), nos formatos
  das Figuras 2 e 3 do documento.

## Persistência em arquivos CSV

| Arquivo | Conteúdo | Formato |
| --- | --- | --- |
| `data/clientes.csv` | cadastro dos clientes pré-cadastrados | `cpf,nome,creditos,Estudante,placa` · `cpf,nome,Professor,placa1,placa2` · `cnpj,nome,debito,Empresa,placa1,...` |
| `data/registros.csv` | tickets de estacionamento | `placa,entrada,saida,custo,desconto,pago` — registros ainda abertos ficam incompletos, como na Figura 3 |
| `seed-data/` | cópia do cenário original das Figuras 2 e 3, usada para restaurar a demonstração | — |

O ciclo é: **ler tudo na inicialização → operar em memória → gravar ao final**. Se um arquivo não
existir, o sistema avisa e segue com o cadastro vazio; se a leitura falhar, a mensagem é exibida e o
programa continua com o que conseguiu carregar.

## Testes

`node tests/testes.js` executa 44 verificações automatizadas: tarifas do avulso, virada de
meia-noite, desconto ClienteFrequente (inclusive a terceira utilização, a repetição do benefício e a
janela de cinco dias), lista de bloqueio, ingresso e saldo do estudante, gratuidade e limite de um
veículo do professor, diária/multa/boleto da empresa, limites de placas, exceções, leitura e
gravação dos CSV, conversão de datas digitadas na interface e o ciclo completo de persistência
(gravar em disco e recarregar em outra instância do sistema). Todos passam na versão entregue.
