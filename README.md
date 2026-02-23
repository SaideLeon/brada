# Documentação do Componente App.tsx

O componente `App.tsx` é o ponto de entrada principal e o orquestrador da aplicação **Brada Iota**. Ele gerencia o estado global, o roteamento de visualizações (entrada de repositório vs. dashboard) e a comunicação com os serviços de IA.

## Funcionalidades Principais

1.  **Análise de Repositórios GitHub**: Permite ao usuário inserir uma URL de repositório público do GitHub para análise.
2.  **Navegador de Arquivos (File Tree)**: Exibe a estrutura de arquivos do repositório com funcionalidade de busca.
3.  **Visualizador de Arquivos (File Viewer)**: Exibe o conteúdo dos arquivos com realce de sintaxe (syntax highlighting).
4.  **Interface de Chat com IA**: Um assistente de "Raciocínio Profundo" que responde a perguntas sobre o código, sugere melhorias e fornece referências.
5.  **Layout Responsivo e Flexível**: Suporta layouts de 2 e 3 colunas, além de modo de tela cheia para o chat e o visualizador de arquivos.

## Gerenciamento de Estado

O componente utiliza o hook `useState` do React para gerenciar os seguintes estados:

-   `repoUrl`: A URL do repositório atual sendo analisado.
-   `files`: A lista de arquivos (árvore) do repositório.
-   `isLoading`: Indica se uma análise ou carregamento está em andamento.
-   `analysis`: O texto da análise inicial gerada pela IA.
-   `chatHistory`: O histórico de mensagens entre o usuário e a IA.
-   `isThinking`: Indica se a IA está processando uma resposta.
-   `error`: Armazena mensagens de erro para exibição.
-   `hasKey`: Verifica se a chave da API Gemini está configurada.
-   `selectedFile`: O arquivo atualmente selecionado para visualização (caminho e conteúdo).
-   `maximizedPanel`: Controla qual painel está maximizado (`'chat'`, `'file'` ou `null`).

## Interação entre Painéis

A interface é dividida em três painéis principais que interagem dinamicamente:

1.  **Barra Lateral (File Tree)**:
    -   Sempre visível no layout padrão.
    -   Oculta quando `maximizedPanel` é `'chat'` ou `'file'`.
    -   Ao selecionar um arquivo, o estado `selectedFile` é atualizado, acionando a exibição do painel de visualização.

2.  **Painel Central (Chat Interface)**:
    -   Exibe o histórico de conversas e a análise inicial.
    -   No layout padrão (sem arquivo selecionado), ocupa a maior parte da tela (`lg:col-span-9`).
    -   Quando um arquivo é selecionado, encolhe para `lg:col-span-5` para acomodar o visualizador.
    -   Pode ser maximizado para `lg:col-span-12`, ocultando os outros painéis.

3.  **Painel Direito (File Viewer)**:
    -   Só aparece quando `selectedFile` não é nulo.
    -   Entra na tela com uma animação suave (`framer-motion`).
    -   Pode ser maximizado para `lg:col-span-12`, ocultando a árvore de arquivos e o chat.
    -   Pode ser fechado, retornando o layout para 2 colunas.

## Serviços Externos

-   **GitHub API**: Utilizada para buscar a árvore de arquivos e o conteúdo dos arquivos (via proxy `/api/github`).
-   **Gemini API**: Utilizada através do serviço `src/services/ai.ts` para:
    -   `analyzeCode`: Gerar a análise inicial do projeto.
    -   `thinkAndSuggest`: Processar perguntas do usuário e gerar respostas com raciocínio profundo.

## Componentes Auxiliares

-   `Header`: Cabeçalho fixo da aplicação.
-   `RepoInput`: Formulário para entrada da URL do repositório.
-   `FileTree`: Componente recursivo ou de lista para navegação de arquivos.
-   `ChatInterface`: Área de mensagens com suporte a Markdown e blocos de código.
-   `FileViewer`: Visualizador de código com realce de sintaxe.
-   `CodeBlock`: Bloco de código com funcionalidade de cópia.

## Tratamento de Erros

O componente implementa tratamento de erros robusto para:
-   Falhas na API do GitHub (404, 403, etc.).
-   Falta de chave de API.
-   Erros de cota da API Gemini (com fallback automático implementado no serviço).
-   Erros de rede genéricos.

Os erros são exibidos em alertas visuais na interface, permitindo que o usuário tente novamente ou corrija a configuração.
