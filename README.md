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

## Publicar na internet (Render)

O arquivo `render.yaml` já descreve tudo: servidor Node, **disco persistente** para os dados e deploy automático.

1. Crie uma conta em <https://render.com> entrando com o GitHub e autorize o repositório.
2. **New + → Blueprint** e escolha este repositório. O Render lê o `render.yaml`.
3. Quando pedir **SENHA_ACESSO**, digite a senha que vocês usarão para entrar no sistema (não fica salva no código) e confirme com **Apply**. O plano com disco persistente é pago (em torno de US$ 7 por mês; confira em render.com/pricing).
4. Aguarde o primeiro deploy terminar. O endereço aparece no topo do serviço (algo como `https://brasil-doces-do-vale.onrender.com`).
5. Abra o endereço, entre com a senha e use normalmente. Para levar os dados de um computador/celular para lá: em **Backup**, baixe a cópia do ambiente antigo e restaure no novo.

### Como ficam as atualizações

Cada alteração aprovada no branch `main` é publicada sozinha em poucos minutos. Os dados ficam no disco persistente (`/var/data`) e **não** são apagados nas atualizações. Se algo falhar, veja **Logs** e **Events** do serviço no Render.

### Cuidados

- **Senha:** o sistema não inicia em produção sem `SENHA_ACESSO`. Para trocar a senha, mude a variável no Render (todas as sessões abertas são encerradas).
- **Backup:** baixe uma cópia em **Backup** com frequência e guarde fora do sistema. Antes de restaurar, o sistema guarda uma cópia do que existia no próprio disco.
- **Domínio próprio:** em *Settings → Custom Domains* do serviço.
- Há apenas **uma instância** do serviço por causa do armazenamento em arquivos JSON; não aumente o número de instâncias.

### Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `SENHA_ACESSO` | Senha de entrada (obrigatória em produção) |
| `DIRETORIO_DADOS` | Pasta dos dados (`/var/data` no Render; `./dados` localmente) |
| `PORT` / `PORTA` | Porta do servidor (o Render define `PORT`) |
| `NODE_ENV` | `production` exige a senha para iniciar |

## Limitações conhecidas

Uma senha única compartilhada (sem perfis por pessoa), nenhum cancelamento/estorno de venda, e persistência em arquivos JSON, adequada a uma loja com um único servidor.
