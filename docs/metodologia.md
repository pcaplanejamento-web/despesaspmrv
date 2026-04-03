# Metodologia de Trabalho — Sistema de Gastos RV

## Princípio Central

Os **Arquivos do Projeto** são a única fonte de verdade. Toda ação começa pela leitura dos arquivos antes de qualquer modificação.

## Hierarquia de Decisão

```
Arquivo do Projeto > Instrução explícita do usuário > Memória de contexto
```

## Regras Obrigatórias

1. Ler todos os `.md` antes de qualquer ação
2. Criar/atualizar `.md` correspondente a cada entrega de código
3. Nunca assumir estado do código sem verificar o arquivo
4. Atualizar `changelog.md` a cada entrega

## Estrutura de Documentos

| Arquivo | Conteúdo |
|---|---|
| `arquitetura.md` | Camadas, responsabilidades, fluxo de dados, responsividade |
| `mapeamento-colunas.md` | Estrutura da planilha, tipos, campos internos |
| `apps-script-deploy.md` | Guia de publicação e atualização do Apps Script |
| `metodologia.md` | Este arquivo — fluxo de trabalho |
| `changelog.md` | Histórico de versões |

## Integração com PCA

Módulo do ecossistema PCA. Seguir padrão visual, componentes e convenções sem criar padrões paralelos.

## Padrão de Changelog

```
## vX.Y.Z — [Módulo] — YYYY-MM-DD
### Adicionado / Alterado / Corrigido / Documentação
```