import type { Categoria } from '../../dominio/tipos.js';
import { html, type HtmlSeguro, type Interpolavel } from '../html.js';
import { iconeCategoria, iconeInterface, type NomeIconeInterface } from './icones.js';

/** Blocos de interface reutilizáveis: cartões, indicadores, selos, cabeçalhos e estados vazios. */

export function cartao(titulo: Interpolavel, conteudo: Interpolavel, opcoes: { acao?: Interpolavel; classe?: string } = {}): HtmlSeguro {
  return html`<section class="cartao ${opcoes.classe ?? ''}">
    <header class="cartao__cabecalho"><h2>${titulo}</h2>${opcoes.acao}</header>
    <div class="cartao__corpo">${conteudo}</div>
  </section>`;
}

export function indicador(rotulo: string, valor: string, icone: NomeIconeInterface, detalhe = '', tom: 'caramelo' | 'rosa' | 'chocolate' = 'caramelo', href?: string): HtmlSeguro {
  const corpo = html`
    <span class="indicador__icone">${iconeInterface(icone, 22)}</span>
    <div><p class="indicador__rotulo">${rotulo}</p><p class="indicador__valor">${valor}</p>${detalhe ? html`<p class="indicador__detalhe">${detalhe}</p>` : ''}</div>`;
  return href
    ? html`<a class="indicador indicador--${tom} indicador--link" href="${href}">${corpo}</a>`
    : html`<article class="indicador indicador--${tom}">${corpo}</article>`;
}

export function cabecalhoPagina(titulo: string, subtitulo: string, acoes: Interpolavel = ''): HtmlSeguro {
  return html`<div class="pagina__topo"><div><h1>${titulo}</h1><p class="subtitulo">${subtitulo}</p></div><div class="pagina__acoes">${acoes}</div></div>`;
}

export function botao(texto: string, href: string, opcoes: { icone?: NomeIconeInterface; variante?: 'primario' | 'suave' } = {}): HtmlSeguro {
  return html`<a class="botao botao--${opcoes.variante ?? 'primario'}" href="${href}">${opcoes.icone ? iconeInterface(opcoes.icone, 18) : ''}${texto}</a>`;
}

export function selo(texto: string, tom: 'ok' | 'alerta' | 'critico' | 'neutro' | 'rosa' = 'neutro'): HtmlSeguro {
  return html`<span class="selo selo--${tom}">${texto}</span>`;
}

/** Ícone da categoria dentro de uma "bolha" suave. */
export function bolhaCategoria(categoria: Categoria, tamanho = 40): HtmlSeguro {
  return html`<span class="bolha-categoria" title="${categoria.nome}">${iconeCategoria(categoria.chave, tamanho)}</span>`;
}

export function estadoVazio(mensagem: string, acao: Interpolavel = ''): HtmlSeguro {
  return html`<div class="vazio">${iconeInterface('catalogo', 28)}<p>${mensagem}</p>${acao}</div>`;
}

export function alerta(mensagem: string, tom: 'sucesso' | 'erro' = 'erro'): HtmlSeguro {
  return html`<div class="aviso aviso--${tom}" role="${tom === 'erro' ? 'alert' : 'status'}">${mensagem}</div>`;
}

/** Barra de nível de estoque (verde-rosada → alerta quando abaixo do mínimo). */
export function barraEstoque(quantidade: number, minimo: number): HtmlSeguro {
  const referencia = Math.max(minimo * 3, 1);
  const percentual = Math.min(100, Math.round((quantidade / referencia) * 100));
  const tom = quantidade <= 0 ? 'critico' : quantidade <= minimo ? 'alerta' : 'ok';
  return html`<span class="barra barra--${tom}" role="img" aria-label="${quantidade} em estoque, mínimo ${minimo}"><span style="width:${percentual}%"></span></span>`;
}

export function seloEstoque(quantidade: number, minimo: number): HtmlSeguro {
  if (quantidade <= 0) return selo('Esgotado', 'critico');
  if (quantidade <= minimo) return selo('Estoque baixo', 'alerta');
  return selo('Em estoque', 'ok');
}
