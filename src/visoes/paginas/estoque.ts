import type { MovimentoEstoque } from '../../dominio/tipos.js';
import type { ProdutoDetalhado } from '../../servicos/servico-catalogo.js';
import { formatarDataHora, formatarInteiro } from '../../utilitarios/formatacao.js';
import { barraEstoque, bolhaCategoria, botao, cabecalhoPagina, cartao, estadoVazio, indicador, selo, seloEstoque } from '../componentes/interface.js';
import { html, type HtmlSeguro } from '../html.js';

export interface DadosPaginaEstoque {
  readonly produtos: readonly ProdutoDetalhado[];
  readonly movimentos: readonly MovimentoEstoque[];
  readonly indice: ReadonlyMap<string, ProdutoDetalhado>;
}

const ROTULO_MOVIMENTO = { PRODUCAO: 'Produção', VENDA: 'Venda', AJUSTE: 'Ajuste' } as const;

function tabelaEstoque(produtos: readonly ProdutoDetalhado[]): HtmlSeguro {
  if (produtos.length === 0) return estadoVazio('Nenhum sabor ativo.', botao('Cadastrar sabores', '/catalogo'));
  return html`<div class="tabela-rolavel"><table class="tabela">
    <thead><tr><th>Produto</th><th class="num">Saldo</th><th class="num">Mínimo</th><th>Nível</th><th>Situação</th></tr></thead>
    <tbody>${produtos.map(({ produto, categoria }) => html`<tr>
      <td><span class="celula-produto">${bolhaCategoria(categoria, 28)}<span>${produto.sabor}<small>${categoria.nome}</small></span></span></td>
      <td class="num"><strong>${formatarInteiro(produto.quantidadeEstoque)}</strong></td>
      <td class="num">${formatarInteiro(produto.estoqueMinimo)}</td>
      <td>${barraEstoque(produto.quantidadeEstoque, produto.estoqueMinimo)}</td>
      <td>${seloEstoque(produto.quantidadeEstoque, produto.estoqueMinimo)}</td>
    </tr>`)}</tbody></table></div>`;
}

function tabelaMovimentos(dados: DadosPaginaEstoque): HtmlSeguro {
  if (dados.movimentos.length === 0) return estadoVazio('Sem movimentações ainda.');
  return html`<ul class="linha-do-tempo">${dados.movimentos.map((m) => {
    const detalhe = dados.indice.get(m.produtoId);
    return html`<li><span class="linha-do-tempo__qtd ${m.quantidade > 0 ? 'positivo' : 'negativo'}">${m.quantidade > 0 ? '+' : ''}${m.quantidade}</span>
      <div><strong>${detalhe?.produto.sabor ?? '—'}</strong><small>${ROTULO_MOVIMENTO[m.tipo]} · ${formatarDataHora(m.data)}</small></div></li>`;
  })}</ul>`;
}

export function paginaEstoque(dados: DadosPaginaEstoque): HtmlSeguro {
  const total = dados.produtos.reduce((soma, { produto }) => soma + produto.quantidadeEstoque, 0);
  const baixos = dados.produtos.filter(({ produto }) => produto.quantidadeEstoque <= produto.estoqueMinimo).length;
  return html`${cabecalhoPagina('Estoque', 'Saldo atualizado automaticamente por produções e vendas.', botao('Registrar produção', '/producao', { icone: 'producao' }))}
  <div class="grade grade--indicadores">
    ${indicador('Unidades em estoque', formatarInteiro(total), 'estoque')}
    ${indicador('Sabores ativos', formatarInteiro(dados.produtos.length), 'catalogo', '', 'rosa')}
    ${indicador('Em alerta', formatarInteiro(baixos), 'alerta', baixos > 0 ? 'Reponha em breve' : 'Tudo em dia', 'chocolate')}
  </div>
  <div class="grade grade--estoque">
    ${cartao('Saldo por sabor', tabelaEstoque(dados.produtos), { acao: baixos > 0 ? selo(`${baixos} em alerta`, 'alerta') : '' })}
    ${cartao('Movimentações recentes', tabelaMovimentos(dados))}
  </div>`;
}
