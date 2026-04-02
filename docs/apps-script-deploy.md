# Como Publicar o Apps Script como Web App

## Pré-requisitos

- Conta Google com acesso à planilha de gastos
- A planilha deve estar na mesma conta ou compartilhada com a conta que publicará o script

---

## Passo a Passo

### 1. Abrir o editor do Apps Script

Na planilha do Google:
`Extensões → Apps Script`

Ou acesse diretamente: https://script.google.com

### 2. Criar o projeto

- Clique em "Novo projeto"
- Nomeie como `Gastos-API`

### 3. Copiar os arquivos

Copie cada arquivo da pasta `apps-script/` do repositório para o editor:

- `Code.gs` → substitui o arquivo padrão `Código.gs`
- Para cada arquivo adicional: clique em `+` → `Script` → cole o conteúdo

Ordem de criação:
```
Code.gs
Router.gs          (em controllers/)
DadosService.gs    (em services/)
KpiService.gs      (em services/)
FiltroService.gs   (em services/)
TimelineService.gs (em services/)
ComparacaoService.gs (em services/)
CacheUtil.gs       (em utils/)
CorsUtil.gs        (em utils/)
ErroUtil.gs        (em utils/)
LogUtil.gs         (em utils/)
```

> **Atenção**: o Apps Script não suporta pastas. Todos os arquivos ficam no mesmo nível. Os nomes já identificam a camada.

### 4. Configurar o ID da planilha

Em `DadosService.gs`, localize a constante:
```js
const SPREADSHEET_ID = 'COLE_O_ID_AQUI';
```

O ID está na URL da planilha:
```
https://docs.google.com/spreadsheets/d/ESTE_É_O_ID/edit
```

### 5. Configurar o nome da aba

Em `DadosService.gs`, localize:
```js
const NOME_ABA = 'Página1';
```

Confirme que é o nome exato da aba na sua planilha.

### 6. Publicar como Web App

`Implantar → Nova implantação`

Configurações obrigatórias:
- **Tipo**: Aplicativo da Web
- **Executar como**: Eu (sua conta Google)
- **Quem tem acesso**: Qualquer pessoa (para o frontend acessar sem login)

Clique em **Implantar** e autorize as permissões solicitadas.

### 7. Copiar a URL

Após publicar, copie a URL no formato:
```
https://script.google.com/macros/s/AKfy.../exec
```

### 8. Colar no Frontend

Abra `frontend/assets/js/config.js` e cole:
```js
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfy.../exec',
  // ...
};
```

---

## Atualizar o Apps Script

Sempre que alterar o código:

`Implantar → Gerenciar implantações → Editar → Nova versão → Implantar`

> **Importante**: A URL permanece a mesma após atualizar. Não é necessário alterar o `config.js`.

---

## Testar a API

Acesse no navegador:
```
https://script.google.com/macros/s/AKfy.../exec?rota=filtros
```

Deve retornar um JSON com os valores únicos da planilha.

Outros testes:
```
?rota=kpis
?rota=kpis&ano=2025
?rota=dados&sigla=SMIR&despesa=Combustível
?rota=timeline&inicio=2025-01&fim=2025-12
?rota=comparacao&cenario1=ano_2025&cenario2=ano_2026
```

---

## Atualização Automática com Trigger

Para que o cache seja limpo automaticamente quando a planilha mudar:

`Apps Script → Gatilhos → Adicionar gatilho`

- Função: `limparCache`
- Tipo de evento: `Da planilha → Ao editar`

Isso garante que alterações na planilha sejam refletidas na API em até 1 minuto.
