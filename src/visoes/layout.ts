import { html, type HtmlSeguro, type Interpolavel } from './html.js';
import { alerta } from './componentes/interface.js';
import { iconeInterface, logotipo, type NomeIconeInterface } from './componentes/icones.js';

export type SecaoMenu = 'painel' | 'vendas' | 'faturamento' | 'producao' | 'estoque' | 'clientes' | 'catalogo';

const ITENS_MENU: ReadonlyArray<{ secao: SecaoMenu; rotulo: string; href: string; icone: NomeIconeInterface }> = [
  { secao: 'painel', rotulo: 'Painel', href: '/', icone: 'painel' },
  { secao: 'vendas', rotulo: 'Vendas', href: '/vendas', icone: 'vendas' },
  { secao: 'faturamento', rotulo: 'Faturamento', href: '/faturamento', icone: 'moeda' },
  { secao: 'producao', rotulo: 'Produção', href: '/producao', icone: 'producao' },
  { secao: 'estoque', rotulo: 'Estoque', href: '/estoque', icone: 'estoque' },
  { secao: 'clientes', rotulo: 'Clientes', href: '/clientes', icone: 'clientes' },
  { secao: 'catalogo', rotulo: 'Catálogo', href: '/catalogo', icone: 'catalogo' },
];

export interface DadosPagina {
  readonly titulo: string;
  readonly secao: SecaoMenu;
  readonly conteudo: Interpolavel;
  /** Mensagem de sucesso (vinda do redirecionamento após uma ação). */
  readonly aviso?: string;
  readonly scripts?: readonly string[];
}

/** Estrutura comum: barra lateral no computador e barra inferior no celular. */
export function paginaCompleta(dados: DadosPagina): string {
  const menu = (classe: string): HtmlSeguro => html`<nav class="${classe}" aria-label="Navegação principal">
    ${ITENS_MENU.map((item) => html`<a href="${item.href}" class="menu__item ${item.secao === dados.secao ? 'menu__item--ativo' : ''}" ${item.secao === dados.secao ? 'aria-current="page"' : ''}>${iconeInterface(item.icone, 22)}<span>${item.rotulo}</span></a>`)}
  </nav>`;

  return `<!doctype html>${html`<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${dados.titulo} · Brasil Doces do Vale</title>
  <link rel="stylesheet" href="/css/estilo.css">
</head>
<body>
  <div class="app">
    <aside class="lateral">
      <a class="marca" href="/">${logotipo(40)}<span class="marca__texto"><strong>Brasil Doces</strong><small>do Vale · gestão</small></span></a>
      ${menu('menu menu--lateral')}
      <p class="lateral__rodape">Feito com carinho<br>e muito chocolate</p>
    </aside>
    <header class="topo-movel"><a class="marca" href="/">${logotipo(32)}<span class="marca__texto"><strong>Brasil Doces do Vale</strong></span></a></header>
    <main class="pagina">
      ${dados.aviso ? alerta(dados.aviso, 'sucesso') : ''}
      ${dados.conteudo}
    </main>
    ${menu('menu menu--inferior')}
  </div>
  ${(dados.scripts ?? []).map((src) => html`<script type="module" src="${src}"></script>`)}
</body>
</html>`.valor}`;
}
