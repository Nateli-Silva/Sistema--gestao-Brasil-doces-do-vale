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

## Publicar na internet — Netlify (plano gratuito)

O arquivo `netlify.toml` já descreve tudo: o site (estilo e scripts) fica estático e o sistema roda como uma função do Netlify. Os **dados ficam no Netlify Blobs** (armazenamento do próprio Netlify), então atualizar o site **não apaga nada** e todos os aparelhos enxergam os mesmos dados.

1. Crie uma conta em <https://app.netlify.com> entrando com o GitHub (no plano gratuito não é preciso cartão).
2. **Add new project → Import an existing project → GitHub** e escolha este repositório. As configurações de build vêm do `netlify.toml`.
3. **Antes de confirmar**, em *Environment variables*, adicione `SENHA_ACESSO` com a senha que vocês usarão para entrar. (Depois também dá para mudar em *Project configuration → Environment variables*, refazendo o deploy.)
4. Toque em **Deploy**. Quando terminar, o endereço aparece no topo (algo como `https://nome-aleatorio.netlify.app`). Para trocar o nome: *Project configuration → Change project name*.
5. Abra o endereço, entre com a senha e use. Para levar dados de outro ambiente: em **Backup**, baixe a cópia lá e restaure aqui.

### Atualizações

Cada alteração aprovada no branch `main` é publicada sozinha. Os dados no Netlify Blobs são mantidos entre as atualizações.

### Cuidados e limites

- **Senha:** sem `SENHA_ACESSO` o site mostra apenas um aviso de configuração (nunca fica aberto).
- **Backup:** baixe uma cópia em **Backup** com frequência. A restauração pelo navegador aceita arquivos de até ~6 MB (limite das funções do Netlify).
- **Alterações ao mesmo tempo:** se duas pessoas salvarem exatamente juntas, a segunda vê o aviso "Tente de novo" e repete a ação; nada é perdido.
- **Plano gratuito:** tem limite mensal de uso (confira em netlify.com/pricing). Para uma doceria pequena costuma bastar; se passar do limite, o site pode ser pausado até o mês seguinte.
- A primeira abertura depois de um tempo parado pode levar alguns segundos.

## Publicar na internet — Render (alternativa paga, com disco)

O arquivo `render.yaml` descreve um servidor Node com **disco persistente** e deploy automático.

1. Crie uma conta em <https://render.com> entrando com o GitHub e autorize o repositório.
2. **New + → Blueprint** e escolha este repositório. O Render lê o `render.yaml`.
3. Quando pedir **SENHA_ACESSO**, digite a senha de entrada e confirme com **Apply**. O plano com disco persistente é pago (em torno de US$ 7 por mês; confira em render.com/pricing).
4. Aguarde o primeiro deploy; o endereço aparece no topo do serviço.

Cada merge no `main` publica sozinho; os dados ficam no disco (`/var/data`). Há apenas **uma instância** por causa do armazenamento em arquivos.

### Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `SENHA_ACESSO` | Senha de entrada (obrigatória em produção, Netlify e Render) |
| `DIRETORIO_DADOS` | Pasta dos dados em arquivos (`/var/data` no Render; `./dados` localmente) |
| `PORT` / `PORTA` | Porta do servidor (o Render define `PORT`) |
| `NODE_ENV` | `production` exige a senha para iniciar |

## Limitações conhecidas

Uma senha única compartilhada (sem perfis por pessoa), nenhum cancelamento/estorno de venda, e persistência em arquivos JSON, adequada a uma loja com um único servidor.
