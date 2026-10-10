# Questionário de engenharia reversa do aplicativo móvel

Respostas baseadas no código atual. Os caminhos dos arquivos são relativos à raiz do projeto.

## 1. Estrutura do projeto

O aplicativo está organizado por responsabilidade:

- **Interface e telas:** `src/app/index.tsx` contém `TaskListScreen`, a lista e os filtros; `src/app/task/[id].tsx` contém `TaskEditorScreen`, usado para criar e editar tarefas; `src/app/categories.tsx` contém `CategoriesScreen`, para criar, renomear e excluir categorias.
- **Modelos de dados:** `src/types.ts` define os tipos TypeScript `Task`, `Category` e `TaskStatusFilter`. O tipo `Task` inclui título, descrição, conclusão, prazo, criação, categoria e identificador de notificação.
- **SQLite e acesso a dados:** `src/lib/database.ts` cria o esquema e implementa as consultas e operações de escrita.
- **Navegação e inicialização:** `src/app/_layout.tsx` declara a pilha do Expo Router e envolve as rotas em um `SQLiteProvider`. O banco é aberto como `rotina.db`, e `migrateDatabase` é executada na inicialização.
- **Notificações:** `src/lib/reminders.ts` solicita permissões, agenda e cancela lembretes locais e oferece `scheduleTestReminder`, usado pelo botão de teste no editor.
- **Formatação auxiliar:** `src/lib/format.ts` formata a data e o horário exibidos na lista.

Em resumo, as rotas e componentes ficam em `src/app`, os tipos compartilhados ficam em `src/types.ts` e as operações de persistência e notificações ficam separadas em `src/lib`.

## 2. Arquitetura e estado

O app usa estado local de React (`useState`) em cada tela, não uma biblioteca global como Redux. A lista guarda em estado as tarefas, categorias, filtros e estado de carregamento. A tela do editor mantém em estado os valores do formulário.

O SQLite é a fonte persistente dos dados. Depois de criar ou editar uma tarefa, `TaskEditorScreen.handleSave` grava os dados e retorna à lista. A lista usa `useIsFocused` e `useEffect` para consultar novamente tarefas e categorias (`getTasks` e `getCategories`) quando volta ao foco. Assim, a tarefa aparece com os dados atualizados.

Ao marcar uma tarefa como concluída ou pendente, `TaskListScreen.toggleTask` grava a alteração com `setTaskCompleted`, atualiza o lembrete correspondente e chama `refresh` para recarregar os dados do banco.

Não há implementação formal de MVVM, Clean Architecture ou outro padrão abrangente. É uma organização simples por telas, com um módulo de acesso ao banco que desempenha um papel semelhante ao de um repositório pequeno. O estado da interface é local às telas, e o banco é a fonte de verdade persistente.

## 3. Persistência SQLite

O `SQLiteProvider` em `src/app/_layout.tsx` abre `rotina.db` e chama `migrateDatabase`, em `src/lib/database.ts`. Essa função ativa chaves estrangeiras e o modo WAL, e cria, se ainda não existirem, as tabelas:

- `categories`: `id` e `name`; o nome é único sem diferenciar maiúsculas de minúsculas.
- `tasks`: `id`, `title`, `description`, `completed`, `dueDateTime`, `createdAt`, `categoryId` e `notificationId`.

`categoryId` referencia `categories(id)` com `ON DELETE SET NULL`. Por isso, excluir uma categoria não exclui suas tarefas: elas ficam sem categoria.

As operações estão em `src/lib/database.ts`:

- **Criar/atualizar tarefas:** `saveTask` usa `INSERT ... ON CONFLICT DO UPDATE`.
- **Consultar tarefas:** `getTasks` lista e associa o nome da categoria; `getTask` consulta uma tarefa pelo identificador.
- **Marcar concluída/pendente:** `setTaskCompleted`.
- **Excluir tarefa:** `deleteTask`.
- **Salvar ou renomear categoria:** `saveCategory`.
- **Consultar categorias:** `getCategories`.
- **Excluir categoria:** `deleteCategory`.
- **Salvar o identificador da notificação:** `setTaskNotificationId`.

## 4. Rastreamento de uma operação: criar uma tarefa

1. Na lista (`src/app/index.tsx`), tocar em **+ Nova tarefa** chama `openTask('new')`, que navega para `/task/new`.
2. A rota `src/app/task/[id].tsx` renderiza `TaskEditorScreen`. Como o parâmetro `id` é `new`, o efeito de carregamento cria o estado inicial de uma tarefa com `createId`, título vazio e sem prazo ou categoria.
3. Tocar em **Salvar tarefa** chama `handleSave`. A função valida o título, prepara a tarefa e chama `saveTask(database, nextTask)`.
4. `saveTask`, em `src/lib/database.ts`, insere a tarefa em SQLite, incluindo seu prazo e um `notificationId` inicialmente nulo. Em edição, a mesma função atualiza os campos da tarefa existente.
5. Após a gravação, `handleSave` chama `syncTaskReminder(database, nextTask)`, de `src/lib/reminders.ts`. Sem prazo futuro, não é agendado um lembrete. Se houver um prazo futuro e as permissões forem concedidas, `scheduleNotificationAsync` agenda a notificação local. O identificador retornado é persistido com `setTaskNotificationId`.
6. Após concluir o salvamento, o editor chama `router.back()`. A tela da lista volta ao foco e o efeito de `TaskListScreen` consulta `getTasks` e `getCategories`; os resultados são colocados em estado, e a nova tarefa aparece.

## 5. Navegação

A navegação usa Expo Router, com a pilha configurada em `src/app/_layout.tsx`.

- Da lista, `TaskListScreen.openTask(taskId)` executa `router.push(`/task/${taskId}`)`.
- Para criar, o identificador especial `new` abre `/task/new`.
- Para editar, a rota recebe apenas o **ID da tarefa**. `TaskEditorScreen` usa `useLocalSearchParams` e consulta a tarefa com `getTask(database, id)`; o objeto completo não é enviado pela navegação nem mantido em estado global.
- A lista abre a tela de categorias com `router.push('/categories')`.
- Ao salvar ou cancelar, as telas retornam usando `router.back()`.

## 6. Notificações

Os lembretes são locais e implementados em `src/lib/reminders.ts`, sem servidor de push remoto.

`syncTaskReminder(database, task)` primeiro cancela o lembrete anterior se `task.notificationId` existir e limpa o identificador no SQLite. Em seguida, não agenda nada se a tarefa estiver concluída, não tiver prazo ou se o prazo já tiver passado. Para uma tarefa pendente com prazo futuro, verifica ou solicita permissão e chama `scheduleNotificationAsync` com um gatilho do tipo data. Se o sistema negar a permissão, a tarefa continua salva, mas sem lembrete. No Expo Go para Android, o app não tenta criar o canal Android nativo; em outros builds Android, configura o canal `task-reminders`.

O ID da tarefa também é incluído em `content.data.taskId`, e o identificador retornado pelo sistema de notificações é armazenado no campo SQLite `notificationId`.

- **Prazo alterado ou removido:** o editor chama `syncTaskReminder` após salvar. A função cancela o identificador anterior e, se o novo prazo estiver no futuro, agenda outro.
- **Tarefa concluída:** `TaskListScreen.toggleTask` atualiza o estado no SQLite e chama `syncTaskReminder`; a função cancela o lembrete e não cria outro.
- **Tarefa reaberta:** o mesmo fluxo pode agendar novamente se o prazo continuar no futuro.
- **Tarefa excluída:** `TaskEditorScreen.confirmDelete` chama `cancelTaskReminder` antes de `deleteTask`.
- **Teste rápido:** `scheduleTestReminder` usa o mesmo fluxo de permissão e agenda uma notificação de teste para cinco segundos depois; o editor expõe essa ação para facilitar diagnóstico.

## 7. Decisões do agente

Algumas decisões de implementação não foram determinadas pela especificação:

1. **Navegação por rotas Expo Router:** foi escolhida a navegação baseada em arquivos, com uma pilha de três telas. Para edição, passa-se apenas o ID da tarefa na rota; os detalhes são carregados novamente do SQLite.
2. **SQLite como fonte de verdade e acesso por módulo:** em vez de adicionar um ORM ou biblioteca de estado, foi usado `expo-sqlite` com funções explícitas em `src/lib/database.ts`. As telas carregam dados para estado local e consultam novamente o banco ao voltar ao foco.
3. **Excluir categoria sem excluir tarefas:** foi adotado `ON DELETE SET NULL`, mantendo as tarefas e removendo somente sua associação com a categoria excluída.
4. **Importações específicas de notificações:** para contornar a inicialização de registro remoto do ponto de entrada de `expo-notifications` no Expo Go para Android, `src/lib/reminders.ts` importa os módulos locais específicos. A criação do canal Android também é ignorada apenas no Expo Go.
5. **Categorias inicialmente vazias:** nenhuma categoria padrão é inserida no banco; o usuário cria as categorias que desejar.

## 8. Análise do BUILD_LOG

Um problema documentado foi a falha do aplicativo ao iniciar no Expo Go para Android. O erro de importação de `expo-notifications` indicava indisponibilidade de notificações push remotas, embora o app precisasse de notificações locais.

Primeiro, foram substituídas as importações do ponto de entrada do pacote por importações específicas dos módulos de notificação local. Isso removeu o efeito colateral de registro de push remoto e permitiu que as rotas fossem compiladas; o bundle Android foi exportado e os avisos de exportação padrão ausente desapareceram. Porém, essa primeira correção não resolveu todo o problema em execução: depois, o usuário relatou outro erro, porque o Expo Go também não disponibilizava o gerenciador nativo de canais Android.

A correção seguinte verificou `isRunningInExpoGo()` e deixou de chamar `setNotificationChannelAsync` ou associar um canal explicitamente apenas nesse ambiente. Em paralelo, o DateTimePicker foi atualizado para deixar de usar o callback obsoleto `onChange`. Foi acrescentado um botão de teste de notificação local de cinco segundos para ajudar a diferenciar problemas de permissão e agendamento. Depois das mudanças, o usuário confirmou: “Agora está funcionando.”

O histórico tornou visível que a primeira correção foi parcial: a exportação e a análise estática passaram, mas isso não detectou a limitação do gerenciador de canais no cliente Expo Go. Consultar apenas o código final não mostraria com a mesma clareza a sequência do erro em execução, a tentativa inicial, a falha restante e a confirmação posterior do usuário. O `BUILD_LOG.md` também preservou os resultados de validação e problemas de dependências encontrados durante o desenvolvimento.
