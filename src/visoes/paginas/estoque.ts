import type { Categoria, MovimentoEstoque } from '../../dominio/tipos.js';
import type { ProdutoDetalhado } from '../../servicos/servico-catalogo.js';
import type { ResumoSabor } from '../../servicos/servico-estoque.js';
import { formatarData, formatarDataHora, formatarInteiro } from '../../utilitarios/formatacao.js';
import { barraEstoque, bolhaCategoria, botao, cabecalhoPagina, cartao, estadoVazio, indicador, selo, seloEstoque } from '../componentes/interface.js';
import { html, type HtmlSeguro } from '../html.js';

export interface DadosPaginaEstoque {
  readonly categorias: readonly Categoria[];
  readonly produtos: readonly ProdutoDetalhado[];
  readonly categoriaSelecionada: Categoria | undefined;
  readonly saborSelecionado: ProdutoDetalhado | undefined;
  readonly resumoSabor: ResumoSabor | undefined;
  readonly produzidoPorSabor: ReadonlyMap<string, number>;
  readonly movimentos: readonly MovimentoEstoque[];
  readonly indice: ReadonlyMap<string, ProdutoDetalhado>;
}

const ROTULO_MOVIMENTO = { PRODUCAO: 'Produção', VENDA: 'Venda', AJUSTE: 'Ajuste' } as const;

const emAlerta = ({ produto }: ProdutoDetalhado): boolean => produto.quantidadeEstoque <= produto.estoqueMinimo;

/** Atalhos de categoria: filtram a página sem precisar rolar por todos os sabores. */
function seletorDeCategorias(dados: DadosPaginaEstoque): HtmlSeguro {
  return html`<nav class="chips" aria-label="Categorias">
    <a class="chip ${dados.categoriaSelecionada ? '' : 'chip--ativo'}" href="/estoque">Todas</a>
    ${dados.categorias.map((c) => html`<a class="chip ${c.id === dados.categoriaSelecionada?.id ? 'chip--ativo' : ''}" href="/estoque?categoria=${c.id}">${bolhaCategoria(c, 22)}${c.nome}</a>`)}
  </nav>`;
}

/** Escolha do sabor dentro da categoria; envia o formulário ao trocar a opção. */
function seletorDeSabor(dados: DadosPaginaEstoque, daCategoria: readonly ProdutoDetalhado[]): HtmlSeguro {
  return html`<form method="get" action="/estoque" class="seletor-sabor">
    <input type="hidden" name="categoria" value="${dados.categoriaSelecionada?.id ?? ''}">
    <label for="sabor">Consultar um sabor</label>
    <select id="sabor" name="sabor" onchange="this.form.submit()">
      <option value="">Escolha o sabor…</option>
      ${daCategoria.map(({ produto }) => html`<option value="${produto.id}" ${produto.id === dados.saborSelecionado?.produto.id ? 'selected' : ''}>${produto.sabor}</option>`)}
    </select>
    <noscript><button class="botao botao--suave" type="submit">Ver</button></noscript>
  </form>`;
}

function detalheDoSabor({ produto, categoria }: ProdutoDetalhado, resumo: ResumoSabor): HtmlSeguro {
  const numero = (rotulo: string, valor: number, destaque = false): HtmlSeguro =>
    html`<div class="numero ${destaque ? 'numero--destaque' : ''}"><strong>${formatarInteiro(valor)}</strong><small>${rotulo}</small></div>`;
  return html`<div class="detalhe-sabor">
    <header>${bolhaCategoria(categoria, 44)}<div><h3>${produto.sabor}</h3><small>${categoria.nome}</small></div>${seloEstoque(produto.quantidadeEstoque, produto.estoqueMinimo)}</header>
    <div class="numeros">
      ${numero('Produzido (total)', resumo.produzido, true)}
      ${numero('Vendido', resumo.vendido)}
      ${numero('Em estoque', produto.quantidadeEstoque, true)}
      ${numero('Mínimo', produto.estoqueMinimo)}
    </div>
    ${barraEstoque(produto.quantidadeEstoque, produto.estoqueMinimo)}
    <h4>Últimos lotes produzidos</h4>
    ${resumo.ultimasProducoes.length === 0
      ? html`<p class="texto-suave">Nenhuma produção registrada para este sabor.</p>`
      : html`<ul class="lista-compacta">${resumo.ultimasProducoes.map((p) => html`<li><span>${formatarData(p.data)}${p.observacao ? html` · <small class="em-linha">${p.observacao}</small>` : ''}</span><strong>+${formatarInteiro(p.quantidade)}</strong></li>`)}</ul>`}
  </div>`;
}

function listaDaCategoria(dados: DadosPaginaEstoque, daCategoria: readonly ProdutoDetalhado[]): HtmlSeguro {
  if (daCategoria.length === 0) return estadoVazio('Nenhum sabor ativo nesta categoria.', botao('Cadastrar sabores', '/catalogo'));
  return html`<div class="tabela-rolavel"><table class="tabela tabela--linhas-clicaveis">
    <thead><tr><th>Sabor</th><th class="num">Produzido</th><th class="num">Estoque</th></tr></thead>
    <tbody>${daCategoria.map((item) => html`<tr>
      <td><a href="/estoque?sabor=${item.produto.id}">${item.produto.sabor}</a><br>${seloEstoque(item.produto.quantidadeEstoque, item.produto.estoqueMinimo)}</td>
      <td class="num">${formatarInteiro(dados.produzidoPorSabor.get(item.produto.id) ?? 0)}</td>
      <td class="num"><strong>${formatarInteiro(item.produto.quantidadeEstoque)}</strong></td>
    </tr>`)}</tbody></table></div>`;
}

/** Visão geral: um cartão resumido por categoria, em vez de uma lista longa de sabores. */
function resumoPorCategoria(dados: DadosPaginaEstoque): HtmlSeguro {
  return html`<div class="grade grade--sabores">${dados.categorias.map((categoria) => {
    const itens = dados.produtos.filter((p) => p.categoria.id === categoria.id);
    const saldo = itens.reduce((soma, { produto }) => soma + produto.quantidadeEstoque, 0);
    const alertas = itens.filter(emAlerta).length;
    return html`<a class="mini-cartao mini-cartao--link" href="/estoque?categoria=${categoria.id}">
      <header>${bolhaCategoria(categoria, 38)}<div><h3>${categoria.nome}</h3><small>${itens.length} ${itens.length === 1 ? 'sabor' : 'sabores'}</small></div></header>
      <p class="mini-cartao__valor">${formatarInteiro(saldo)} <small class="em-linha">un. em estoque</small></p>
      ${alertas > 0 ? selo(`${alertas} em alerta`, 'alerta') : selo('Tudo em dia', 'ok')}
    </a>`;
  })}</div>`;
}

function movimentacoes(dados: DadosPaginaEstoque): HtmlSeguro {
  if (dados.movimentos.length === 0) return estadoVazio('Sem movimentações ainda.');
  return html`<ul class="linha-do-tempo">${dados.movimentos.map((m) => {
    const detalhe = dados.indice.get(m.produtoId);
    return html`<li><span class="linha-do-tempo__qtd ${m.quantidade > 0 ? 'positivo' : 'negativo'}">${m.quantidade > 0 ? '+' : ''}${m.quantidade}</span>
      <div><strong>${detalhe?.produto.sabor ?? '—'}</strong><small>${ROTULO_MOVIMENTO[m.tipo]} · ${formatarDataHora(m.data)}</small></div></li>`;
  })}</ul>`;
}

export function paginaEstoque(dados: DadosPaginaEstoque): HtmlSeguro {
  const total = dados.produtos.reduce((soma, { produto }) => soma + produto.quantidadeEstoque, 0);
  const baixos = dados.produtos.filter(emAlerta).length;
  const daCategoria = dados.categoriaSelecionada
    ? dados.produtos.filter((p) => p.categoria.id === dados.categoriaSelecionada?.id)
    : [];

  const consulta = html`${seletorDeCategorias(dados)}
    ${dados.categoriaSelecionada ? seletorDeSabor(dados, daCategoria) : ''}
    ${dados.saborSelecionado && dados.resumoSabor ? detalheDoSabor(dados.saborSelecionado, dados.resumoSabor) : ''}
    ${dados.categoriaSelecionada ? listaDaCategoria(dados, daCategoria) : resumoPorCategoria(dados)}`;

  return html`${cabecalhoPagina('Estoque', 'Saldo atualizado automaticamente por produções e vendas.', botao('Registrar produção', '/producao', { icone: 'producao' }))}
  <div class="grade grade--indicadores">
    ${indicador('Unidades em estoque', formatarInteiro(total), 'estoque')}
    ${indicador('Em alerta', formatarInteiro(baixos), 'alerta', baixos > 0 ? 'Reponha em breve' : 'Tudo em dia', 'chocolate')}
  </div>
  ${cartao(dados.categoriaSelecionada ? dados.categoriaSelecionada.nome : 'Estoque por categoria', consulta)}
  <details class="recolhivel"><summary>Movimentações recentes</summary>${movimentacoes(dados)}</details>`;
}
