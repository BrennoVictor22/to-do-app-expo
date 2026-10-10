# Histórico de Desenvolvimento

## Registro 1 — Configuração do projeto

### Solicitação / pedido

A especificação fornecida solicita um aplicativo de tarefas para dispositivos móveis usando Expo e React Native, com tarefas e categorias persistidas em SQLite, filtros por tarefa e categoria, edição de tarefas, prazos opcionais e notificações locais agendadas. Também exige que este histórico seja mantido ao longo do desenvolvimento.

### Resumo das decisões

Começar com um aplicativo Expo em TypeScript e manter a arquitetura pequena e orientada a funcionalidades. Usar SQLite como fonte principal dos dados das tarefas e categorias.

### Ações realizadas

- Criado este arquivo `BUILD_LOG.md` antes do início da implementação.

### Resultado

O histórico de desenvolvimento está criado. A implementação ainda não havia começado.

### Problemas / erros

- Nenhum ainda.

### Correções tentadas

- Nenhuma correção necessária.

### Status atual

Parcialmente concluído

## Registro 2 — Recuperação da criação do projeto Expo

### Solicitação / pedido

Continuar a implementação da especificação fornecida para o aplicativo de tarefas Expo.

### Resumo das decisões

Usar o modelo TypeScript em branco oficial do `create-expo-app`. A execução na pasta atual foi recusada por já existir o `BUILD_LOG.md`; portanto, o projeto será criado em uma pasta filha temporária e os arquivos gerados serão copiados para a raiz do projeto sem substituir este histórico.

### Ações realizadas

- Tentada a execução de `npx create-expo-app@latest . --template blank-typescript --yes`.

### Resultado

O comando de criação foi interrompido antes de gerar os arquivos do projeto porque o diretório não estava vazio.

### Problemas / erros

- O `create-expo-app` informou que o `BUILD_LOG.md` existente poderia ser sobrescrito.

### Correções tentadas

- Será criado o projeto em uma pasta filha temporária, e seus arquivos gerados serão integrados à raiz do projeto.

### Status atual

Parcialmente concluído

## Registro 3 — Projeto Expo inicializado

### Solicitação / pedido

Continuar a implementação da especificação fornecida para o aplicativo de tarefas Expo.

### Resumo das decisões

O projeto usa Expo SDK 57 com TypeScript. Seguindo as orientações Expo do projeto, usar Expo Router com rotas em `src/app`, `expo-sqlite` como fonte persistente dos dados, `expo-notifications` para lembretes locais e um seletor de data e horário compatível com Expo. Manter o acesso a tarefas e categorias explícito e local, sem introduzir uma dependência maior de gerenciamento de estado ou ORM.

### Ações realizadas

- Gerado o modelo oficial TypeScript em branco do Expo em uma pasta filha temporária e integrados os arquivos resultantes à raiz do projeto.
- Consultada a documentação correspondente ao Expo SDK 57 para SQLite, notificações e Expo Router.

### Resultado

O projeto Expo está presente e pronto para receber as dependências e a implementação das funcionalidades.

### Problemas / erros

- A tentativa de criar o projeto diretamente na pasta atual foi recusada porque o `BUILD_LOG.md` já existia; a abordagem com uma pasta temporária funcionou.
- A instalação do projeto inicial informou 22 problemas de auditoria de dependências (7 moderados e 15 altos); não foram aplicadas atualizações automáticas incompatíveis.

### Correções tentadas

- Gerado o projeto em `mobile-scaffold` e copiados seus arquivos para a pasta atual, preservando o `BUILD_LOG.md`.

### Status atual

Parcialmente concluído

## Registro 4 — Implementação principal do aplicativo

### Solicitação / pedido

Implementar a especificação fornecida para o aplicativo móvel de tarefas.

### Resumo das decisões

- Usar Expo Router com três rotas: lista de tarefas, editor/detalhes da tarefa e gerenciamento de categorias.
- Usar `expo-sqlite` com um pequeno módulo de acesso SQL e `SQLiteProvider`; tarefas e categorias são armazenadas localmente no banco persistente `rotina.db`.
- Adicionar `categoryName` como propriedade de tarefa usada somente em consultas e `notificationId` como campo persistido da tarefa, para que lembretes agendados possam ser atualizados ou cancelados.
- Usar a regra SQLite `ON DELETE SET NULL` ao excluir categorias, preservando as tarefas sem categoria.
- Usar Expo Notifications para lembretes locais com data única e o DateTimePicker da comunidade para seleção nativa de data e horário. Solicitar permissão somente quando uma tarefa com lembrete futuro for salva.
- Usar estado React local em cada tela e recarregar os dados do SQLite quando a tela receber foco; não foi necessária uma biblioteca separada de estado global.
- Filtrar em memória a coleção de tarefas carregada, considerando estado de conclusão e categoria.
- Não incluir categorias iniciais; o usuário cria e gerencia as categorias.

### Ações realizadas

- Adicionadas dependências do Expo Router, SQLite, notificações, seletor de data e horário e dependências nativas do Router em versões compatíveis com o SDK.
- Configurados o nome do aplicativo, o esquema de URL, o ponto de entrada do Router e os plugins dos módulos nativos.
- Implementados o esquema SQLite e as operações para criar, consultar, atualizar e excluir tarefas e categorias.
- Implementadas a lista de tarefas, a criação/edição/detalhes de tarefas, a gestão de categorias, os filtros por estado/categoria, o prazo opcional e a atualização/cancelamento de notificações.
- Adicionadas mensagens de feedback em português para títulos ausentes, erros de armazenamento e notificações recusadas ou com falha.
- Adicionado o README com instruções de compilação, execução e validação, decisões de arquitetura e informações sobre o questionário ausente.
- Removidos os arquivos de entrada da raiz que não eram mais usados pelo modelo em branco.

### Resultado

- A exportação do pacote JavaScript para Android foi concluída com sucesso.
- A verificação de compatibilidade com o Expo SDK foi concluída com sucesso.
- A verificação de tipos TypeScript passou após a correção das importações do contexto SQLite.
- A primeira tentativa de lint falhou durante a instalação automática das dependências porque o npm resolveu `react-dom@19.3.0` junto com o React `19.2.3` do Expo. A instalação das versões de `react-dom` e `react-native-web` compatíveis com o SDK usando `npx expo install` resolveu o conflito de dependências.
- O lint do Expo identificou atualizações de estado acionadas por efeitos; os efeitos de carregamento das telas foram reescritos para atualizar o estado somente depois que as consultas assíncronas ao banco terminam.
- Ainda era necessária uma nova execução do lint.

### Problemas / erros

- A primeira verificação TypeScript encontrou `useSQLiteContext` importado incorretamente de `expo-router`.
- A configuração do lint selecionou uma dependência opcional `react-dom` incompatível até que fossem instaladas as versões web correspondentes ao Expo SDK.
- O espaço de trabalho não inclui as perguntas do questionário mencionadas na atividade.
- A instalação das dependências informou 29 problemas de auditoria (10 moderados e 19 altos), além de um aviso de dependência entre pares envolvendo `react-native-worklets`; não foram aplicadas atualizações forçadas.

### Correções tentadas

- Importado `useSQLiteContext` de `expo-sqlite`; a verificação TypeScript passou em seguida.
- Instalados `react-dom` e `react-native-web` com o instalador compatível com o SDK; em seguida, o carregamento de listas e categorias foi ajustado para usar atualizações de estado após consultas assíncronas.

### Status atual

Precisa de testes

## Registro 5 — Validação e situação da entrega

### Solicitação / pedido

Continuar validando a especificação fornecida para o aplicativo de tarefas Expo e preparar a documentação do projeto.

### Resumo das decisões

Documentar somente resultados de validação confirmados.

### Ações realizadas

- Executados `npx expo lint`, `npm run typecheck`, `npx expo install --check`, `npx expo-doctor` e `npx expo export --platform android`.
- Verificados as ferramentas Android e os remotos Git.

### Resultado

- O lint passou.
- A verificação de tipos TypeScript passou.
- A verificação de compatibilidade das dependências Expo passou.
- O Expo Doctor passou em todas as 21 verificações.
- A exportação do pacote JavaScript para Android passou.

### Problemas / erros

- Nenhum ainda.

### Correções tentadas

- Nenhum ainda.

### Status atual

Parcialmente concluído

## Registro 6 — Revisão da auditoria de dependências

### Solicitação / pedido

Registrar problemas relevantes de dependências encontrados durante a validação do projeto Expo.

### Resumo das decisões

Não executar `npm audit fix --force`: a correção proposta pelo npm faria downgrade do Expo para o SDK 44 (e alteraria o Expo Router entre versões principais), o que quebraria o projeto no SDK 57. Preservar o conjunto de dependências testado e comunicar os resultados para uma atualização planejada.

### Ações realizadas

- Executados `npm audit --omit=dev` e a simulação do caminho de correção com `npm audit fix --dry-run`.

### Resultado

- A árvore de dependências de produção apresenta 29 avisos transitivos: 10 moderados e 19 altos, incluindo problemas em dependências relacionadas ao Metro, `node-forge`, `uuid` e dependências de decodificação de URI.
- A simulação não alterou nenhuma versão das dependências.

### Problemas / erros

- O npm não oferece uma correção automática, sem alterações incompatíveis, para o conjunto completo; a proposta com `--force` faria downgrade do Expo para `44.0.6` e upgrade do Expo Router para `58.0.17`.

### Correções tentadas

- Analisada a proposta simulada; o downgrade incompatível não foi aplicado intencionalmente.

### Status atual

Precisa de acompanhamento

## Registro 7 — Correção da importação de notificações no Expo Go

### Solicitação / pedido

“AVISO: A rota `./index.tsx` não tem a exportação padrão obrigatória… ERRO: a funcionalidade de notificações push do Android (notificações remotas) fornecida por `expo-notifications` foi removida do Expo Go…”

O usuário relatou que o Expo Go falhava ao iniciar e depois indicava que as rotas da lista e do editor não tinham exportações padrão.

### Resumo das decisões

Os componentes das rotas já tinham exportações padrão. A exceção no Expo Go ocorria ao carregar o ponto de entrada raiz de `expo-notifications`: o efeito colateral de registro automático inicializa um listener de token para notificações push remotas, recurso não compatível com o Expo Go para Android. Manter os lembretes locais agendados importando somente os módulos locais de agendamento, cancelamento, permissões, canal e tratamento em primeiro plano do pacote. Assim, evita-se inicializar o registro de push remoto, que não é necessário para o fluxo documentado de notificações locais no Expo Go.

### Ações realizadas

- Substituída a importação raiz do namespace por importações específicas de APIs locais em `src/lib/reminders.ts`.
- Substituída a importância numérica do canal de notificações pela constante tipada `AndroidImportance.DEFAULT`.
- Adicionada uma observação de compatibilidade ao `README.md` para que os caminhos dos submódulos internos sejam revistos durante atualizações do SDK Expo.
- Reexecutadas as verificações TypeScript e de lint.

### Resultado

- A verificação de tipos TypeScript passou após a alteração das importações.
- O lint do Expo passou após a alteração das importações.
- A exportação do pacote Android terminou com sucesso, incluindo todos os 1.314 módulos e sem avisos de ausência de exportação padrão.
- A verificação de compatibilidade do Expo SDK passou.

### Problemas / erros

- O efeito colateral de registro de push no Expo Go impedia a avaliação dos arquivos de rota; os avisos do Router sobre exportações padrão eram consequência da falha durante a importação.
- O ambiente não oferece dispositivo ou emulador Android, então não foi possível demonstrar a entrega real das notificações locais.

### Correções tentadas

- Removido o ponto de entrada do pacote que avaliava o efeito colateral de registro de push remoto e importados somente os módulos de notificações locais usados pelo aplicativo.

### Status atual

Precisa de testes no Expo Go

## Registro 8 — Compatibilidade com o Expo Go e atualização do seletor

### Solicitação / pedido

“DateTimePicker: `onChange` está obsoleto. Use `onValueChange`, `onDismiss` e `onNeutralButtonPress` em seu lugar.
ERRO: A tarefa foi salva, mas não foi possível atualizar o lembrete: a chamada à função `ExpoNotificationChannelManager.setNotificationChannelAsync` foi rejeitada…”

### Resumo das decisões

- Trocar o callback obsoleto `onChange` do seletor por `onValueChange` e `onDismiss`, preservando a seleção atual e o fechamento do seletor.
- No Expo Go, não chamar `setNotificationChannelAsync` nem associar explicitamente um canal ao agendamento. Os lembretes locais usarão o canal padrão do Expo Go. Em builds nativos, manter o canal dedicado existente.

### Ações realizadas

- Atualizada a tela de edição da tarefa para usar os callbacks atuais de `@react-native-community/datetimepicker`.
- Adicionada a detecção `isRunningInExpoGo()` para ignorar somente a criação e associação do canal Android no Expo Go.
- Atualizada a documentação para explicar a diferença de canal entre o Expo Go e os builds nativos.

### Resultado

A correção foi implementada. As verificações TypeScript, lint e exportação ainda estavam pendentes.

### Problemas / erros

- A implementação anterior criava um canal Android no Expo Go, mas o Expo Go não fornecia um `NotificationsChannelsProvider`; a chamada falhava antes de o lembrete ser salvo.
- O seletor usava `onChange`, agora obsoleto na versão instalada.

### Correções tentadas

- Verificar `isRunningInExpoGo()` antes de chamar o gerenciador de canais e omitir `channelId` do gatilho somente nesse ambiente.
- Migrar para `onValueChange` e `onDismiss`, removendo o uso do callback obsoleto.

### Status atual

Precisa de validação no Expo Go

## Registro 9 — Ação para limpar o prazo no seletor

### Solicitação / pedido

“DateTimePicker: `onChange` está obsoleto. Use `onValueChange`, `onDismiss` e `onNeutralButtonPress` em seu lugar.”

### Resumo das decisões

Conectar também o callback `onNeutralButtonPress` e exibir a opção “Limpar” no diálogo Android. Assim, os três callbacks recomendados pela versão instalada ficam tratados, e o prazo pode ser removido pelo seletor, além de pelo botão na tela.

### Ações realizadas

- Adicionada a ação neutra “Limpar” ao DateTimePicker no Android.
- Ao acioná-la, o prazo da tarefa é removido e o diálogo é fechado.

### Resultado

A seleção, o cancelamento do diálogo e a remoção do prazo usam callbacks dedicados, sem recorrer à propriedade obsoleta `onChange`.

### Problemas / erros

Nenhum problema novo identificado.

### Correções tentadas

Nenhuma tentativa adicional foi necessária.

### Status atual

Implementado; validação final pendente

## Registro 10 — Validação da correção

### Solicitação / pedido

Confirmar se as correções das notificações no Expo Go e dos callbacks do DateTimePicker compilam.

### Resumo das decisões

Executar a verificação de tipos, o lint e a exportação para Android, validando o código e a descoberta das rotas sem alegar que notificações foram entregues em um dispositivo.

### Ações realizadas

- Executados `npm run typecheck`, `npx expo lint` e `npx expo export --platform android`.

### Resultado

- O TypeScript passou.
- O lint passou.
- O pacote Android foi exportado com sucesso; as rotas foram incluídas.

### Problemas / erros

Não foi possível validar a entrega nativa de notificações porque este ambiente não tinha dispositivo nem emulador Android conectado.

### Correções tentadas

Nenhuma correção adicional foi necessária.

### Status atual

Verificações estáticas e exportação do pacote concluídas; teste em dispositivo pendente

## Registro 11 — Diagnóstico de lembretes locais

### Solicitação / pedido

“As notificações não estão funcionando”

### Resumo das decisões

Como não havia registro de qual parte do fluxo falhava, foi adicionado ao editor de tarefas um teste local de cinco segundos. Ele reutiliza o mesmo fluxo de permissões e agendamento das tarefas, ajudando a distinguir problemas de permissão/sistema de problemas na escolha do prazo. Também foi explicitado quando a data e o horário selecionados já passaram, pois nesse caso não se agenda uma notificação.

### Ações realizadas

- Extraída a verificação do canal e das permissões para um único fluxo, usado pelos lembretes de tarefas e pelo teste.
- Adicionado o botão “Testar notificação (5 segundos)” à tela de criação e edição de tarefas.
- Adicionado feedback específico quando o prazo salvo já passou.
- Documentado no README o teste rápido.

### Resultado

O aplicativo informa se o teste foi agendado ou se o sistema/permissão o recusou; a entrega efetiva precisa ser observada no dispositivo.

### Problemas / erros

O ambiente atual não tem dispositivo nem emulador para reproduzir uma notificação Android. Portanto, não era possível afirmar se a falha relatada pelo usuário vinha da permissão no Expo Go, da configuração do Android ou da entrega nativa.

### Correções tentadas

- Fornecido um teste de notificação de curto prazo que não depende de configurar manualmente uma data/hora futura.
- Reutilizada a mesma rotina de permissão, canal e gatilho usada pelo agendamento normal.

### Status atual

Implementado; requer teste no dispositivo

## Registro 12 — Correção do teste e validação

### Solicitação / pedido

“As notificações não estão funcionando”

### Resumo das decisões

Validar a nova ação de teste com as ferramentas de análise estática e a exportação do pacote Android. Registrar também um erro de escopo TypeScript encontrado durante a implementação e sua correção, sem omitir a tentativa malsucedida.

### Ações realizadas

- Corrigida a posição da função de teste para que ficasse no escopo do componente e pudesse ser chamada pelo botão.
- Executados novamente `npm run typecheck`, `npx expo lint` e `npx expo export --platform android`.

### Resultado

- O TypeScript passou.
- O lint passou.
- A exportação para Android passou e encontrou as rotas sem avisos.
- A nova ação de teste está incluída no pacote. A entrega da notificação ainda precisava de teste no aparelho onde o problema ocorria.

### Problemas / erros

A primeira verificação TypeScript encontrou a função de teste aninhada dentro de `handleSave`, impedindo que o botão da tela a referisse.

### Correções tentadas

A função foi movida para o escopo do componente. Em seguida, as verificações foram repetidas e passaram.

### Status atual

Implementação validada por lint, TypeScript e pacote; ainda é necessária a confirmação da entrega no dispositivo

## Registro 13 — Confirmação no dispositivo

### Solicitação / pedido

“Agora está funcionando.”

### Resumo das decisões

Registrar a confirmação do usuário de que os lembretes passaram a funcionar depois da correção e do teste local.

### Ações realizadas

- Atualizado o histórico com o resultado confirmado pelo usuário.

### Resultado

O usuário confirmou que as notificações estão funcionando.

### Problemas / erros

Nenhum problema pendente foi relatado.

### Correções tentadas

Nenhuma correção adicional necessária.

### Status atual

Concluído
