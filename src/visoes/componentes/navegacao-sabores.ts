import type { Categoria } from '../../dominio/tipos.js';
import type { ProdutoDetalhado } from '../../servicos/servico-catalogo.js';
import { html, jsonSeguro, type HtmlSeguro } from '../html.js';
import { bolhaCategoria } from './interface.js';

/**
 * Navegação compartilhada por Catálogo e Estoque: atalhos de categoria + busca de sabor,
 * para encontrar um sabor sem rolar listas longas. A página é sempre renderizada no servidor
 * (`?categoria=<id>` e `?sabor=<id>`); o campo de busca só leva o usuário ao sabor escolhido.
 */

export function seletorDeCategorias(categorias: readonly Categoria[], selecionadaId: string | undefined, urlBase: string): HtmlSeguro {
  return html`<nav class="chips" aria-label="Categorias">
    <a class="chip ${selecionadaId ? '' : 'chip--ativo'}" href="${urlBase}">Todas</a>
    ${categorias.map((c) => html`<a class="chip ${c.id === selecionadaId ? 'chip--ativo' : ''}" href="${urlBase}?categoria=${c.id}">${bolhaCategoria(c, 22)}${c.nome}</a>`)}
  </nav>`;
}

export interface OpcoesBuscaSabor {
  /** Página que mostra o sabor escolhido (recebe `?sabor=<id>`). */
  readonly urlBase: string;
  /** Sabores pesquisáveis (já filtrados pela categoria, se houver). */
  readonly produtos: readonly ProdutoDetalhado[];
  readonly selecionado?: ProdutoDetalhado | undefined;
  /** Texto exibido abaixo do nome de cada sugestão (ex.: categoria e estoque). */
  readonly detalhe: (item: ProdutoDetalhado) => string;
}

export function buscaSabor(opcoes: OpcoesBuscaSabor): HtmlSeguro {
  const dados = {
    urlBase: opcoes.urlBase,
    selecionadoId: opcoes.selecionado?.produto.id ?? '',
    opcoes: opcoes.produtos.map((item) => ({ id: item.produto.id, rotulo: item.produto.sabor, detalhe: opcoes.detalhe(item) })),
  };
  return html`<div class="busca-sabor" data-busca-sabor>
    <label>Buscar sabor</label>
    <div data-espaco-busca></div>
    <script type="application/json" data-dados-busca>${jsonSeguro(dados)}</script>
  </div>`;
}
