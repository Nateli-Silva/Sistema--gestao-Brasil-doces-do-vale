# Brasil Doces do Vale — gestão

Mini ERP/CRM para a doceria: catálogo, produção, estoque, clientes (PF/PJ), vendas e painel com indicadores.

## Como rodar

```bash
npm install
npm run demo      # (opcional) dados de demonstração
npm run dev       # http://localhost:3000
```

Outros comandos: `npm run build && npm start`, `npm test`, `npm run verificar` (checagem de tipos).
Variáveis: `PORTA` (padrão 3000) e `DIRETORIO_DADOS` (padrão `./dados`, arquivos JSON).

## Arquitetura (MVC)

```
src/
  dominio/          tipos (interfaces) e erros de negócio
  repositorios/     persistência (RepositorioJson genérico, substituível por banco)
  servicos/         regras de negócio: catálogo, estoque, produção, clientes, vendas, painel
  controladores/    recebem a requisição, chamam serviços, escolhem a visão
  visoes/           templates em TypeScript (html seguro), componentes, ícones SVG e páginas
  rotas/            mapa de URLs → controladores
  aplicacao/        composição (container) e montagem do Express
  utilitarios/      formatação, CPF/CNPJ, leitura de formulários, estatísticas
cliente/            scripts do navegador em TS (linhas da venda, formulário PF/PJ)
publico/css/        tema (chocolate, creme, caramelo e rosa)
scripts/ testes/    dados de demonstração e testes automatizados
```

## Regras principais

- Produção registrada entra no estoque; venda baixa o estoque (recusada se faltar saldo, sem gravar nada).
- Cada alteração de saldo gera um movimento de estoque (auditoria).
- Preço do item é congelado na venda; valores monetários são guardados em centavos.
- PJ exige endereço comercial; CPF/CNPJ são validados e únicos.
- Novos sabores podem ser cadastrados a qualquer momento no Catálogo.

## Limitações conhecidas

Não há login/perfis (a tela de Catálogo é aberta), nem cancelamento/estorno de venda. Persistência em JSON é adequada para uma única loja/processo.
