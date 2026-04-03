# Metodologia de Trabalho — Sistema de Análise de Despesas

## Princípio Central

Os **Arquivos do Projeto** são a única fonte de verdade do sistema.
Toda ação de desenvolvimento, atualização ou criação de funcionalidade deve começar pela leitura dos arquivos disponíveis no projeto antes de qualquer outra coisa.

---

## Regras Obrigatórias de Fluxo

### 1. Antes de qualquer ação
- Ler **todos** os arquivos `.md` do projeto para entender o estado atual da arquitetura, metodologias ativas e decisões de design já tomadas
- Ler os arquivos de código relevantes à tarefa antes de propor ou aplicar qualquer alteração
- Nunca assumir o estado do código a partir de memória — sempre verificar o arquivo

### 2. Ao criar funcionalidades novas
- Criar ou atualizar o `.md` correspondente à funcionalidade antes ou junto com a entrega do código
- O `.md` deve descrever: o que faz, como se integra à arquitetura existente, quais arquivos foram criados/alterados e exemplos de uso quando aplicável
- Atualizar o `changelog.md` com a versão, data e descrição clara do que foi adicionado

### 3. Ao atualizar funcionalidades existentes
- Localizar o `.md` que documenta a funcionalidade e aplicar as alterações necessárias
- Atualizar o `changelog.md`
- Nunca deixar um `.md` desatualizado em relação ao código em produção

### 4. Ao refatorar ou corrigir
- Verificar se a refatoração impacta a documentação existente
- Atualizar todos os `.md` afetados na mesma entrega

---

## Estrutura de Arquivos de Documentação

| Arquivo | Conteúdo |
|---------|----------|
| `arquitetura.md` | Visão geral técnica, camadas, responsabilidades, dependências |
| `mapeamento-colunas.md` | Estrutura da planilha, tipos de dados, campos internos |
| `apps-script-deploy.md` | Guia de publicação e atualização do Apps Script |
| `metodologia.md` | Este arquivo — fluxo de trabalho e regras de entrega |
| `changelog.md` | Histórico de versões e alterações |

Novos módulos ou funcionalidades de maior complexidade devem ganhar seu próprio `.md` (ex: `comparacao.md`, `exportacao.md`, `integracao-pca.md`).

---

## Padrão de Atualização do Changelog

```
## vX.Y.Z — [Etapa ou módulo] — YYYY-MM-DD

### Adicionado
- Descrição objetiva do que foi criado

### Alterado
- Descrição do que foi modificado e por quê

### Corrigido
- Descrição do bug corrigido

### Documentação
- Arquivos .md criados ou atualizados
```

---

## Hierarquia de Decisão

Quando houver conflito entre memória, suposição ou arquivo do projeto:

```
Arquivo do Projeto > Instrução explícita do usuário > Memória de contexto
```

Se um arquivo do projeto contradiz uma instrução do usuário, sinalizar o conflito antes de agir.

---

## Integração com o Sistema PCA

Este sistema é um módulo do PCA. Qualquer decisão de design, componente ou padrão de código deve ser verificada contra os arquivos do PCA antes de ser implementada de forma independente. Nunca criar padrões paralelos ao PCA sem aprovação explícita.
