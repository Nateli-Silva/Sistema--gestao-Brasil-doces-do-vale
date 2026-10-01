import type { Categoria, Producao } from '../../dominio/tipos.js';
import type { ProdutoDetalhado } from '../../servicos/servico-catalogo.js';
import { formatarData, formatarInteiro } from '../../utilitarios/formatacao.js';
import { campoAreaTexto, campoTexto, type ContextoFormulario } from '../componentes/formulario.js';
import { alerta, bolhaCategoria, cabecalhoPagina, cartao, estadoVazio, selo } from '../componentes/interface.js';
import { botao } from '../componentes/interface.js';
import { html, jsonSeguro, type HtmlSeguro } from '../html.js';

export interface DadosPaginaProducao {
  readonly categorias: readonly Categoria[];
  /** Linhas já preenchidas (após erro de validação). */
  readonly linhas: ReadonlyArray<{ produtoId: string; quantidade: string }>;
  readonly produtos: readonly ProdutoDetalhado[];
  readonly recentes: readonly Producao[];
  readonly indice: ReadonlyMap<string, ProdutoDetalhado>;
  readonly formulario: ContextoFormulario;
  readonly erroGeral?: string;
}

function historico(dados: DadosPaginaProducao): HtmlSeguro {
  if (dados.recentes.length === 0) return estadoVazio('Nenhuma produção registrada ainda.');
  return html`<div class="tabela-rolavel"><table class="tabela">
    <thead><tr><th>Data</th><th>Sabor</th><th class="num">Qtd.</th></tr></thead>
    <tbody>${dados.recentes.map((p) => {
      const detalhe = dados.indice.get(p.produtoId);
      return html`<tr><td>${formatarData(p.data)}</td><td>${detalhe ? html`<span class="celula-produto">${bolhaCategoria(detalhe.categoria, 26)}<span>${detalhe.produto.sabor}<small>${detalhe.categoria.nome}</small></span></span>` : '—'}</td><td class="num">${selo(`+${formatarInteiro(p.quantidade)}`, 'ok')}</td></tr>`;
    })}</tbody></table></div>`;
}

/** Um bloco por categoria; as linhas (sabor + quantidade) são criadas pelo script do navegador. */
function blocoCategoria(categoria: Categoria): HtmlSeguro {
  return html`<fieldset class="grupo-producao" data-categoria="${categoria.id}">
    <legend>${bolhaCategoria(categoria, 30)} ${categoria.nome}</legend>
    <div class="grupo-producao__itens" data-linhas></div>
    <button type="button" class="botao botao--fantasma botao--pequeno" data-adicionar-sabor>+ Outro sabor de ${categoria.nome}</button>
  </fieldset>`;
}

export function paginaProducao(dados: DadosPaginaProducao): HtmlSeguro {
  const erroItens = dados.formulario.erros.itens ?? dados.erroGeral;
  // Sabores enviados ao script do navegador, que monta o seletor de cada categoria.
  const catalogoCliente = {
    produtos: dados.produtos.map(({ produto, categoria }) => ({ id: produto.id, categoriaId: categoria.id, sabor: produto.sabor })),
    linhas: dados.linhas,
  };
  const formulario = dados.produtos.length === 0
    ? estadoVazio('Cadastre sabores no catálogo para registrar a produção.', botao('Ir ao catálogo', '/catalogo'))
    : html`${erroItens ? alerta(erroItens) : ''}
    <form method="post" action="/producao" class="formulario" data-formulario-producao>
      <div class="formulario--grade">
        ${campoTexto(dados.formulario, { nome: 'data', rotulo: 'Data da produção', tipo: 'date', obrigatorio: true })}
        ${campoAreaTexto(dados.formulario, { nome: 'observacao', rotulo: 'Observação', placeholder: 'Ex.: lote da encomenda de sábado' })}
      </div>
      <p class="subtitulo">Em cada categoria, escolha o sabor e informe a quantidade produzida. Deixe em branco o que não foi feito. Cada quantidade entra automaticamente no estoque. Falta um sabor? <a href="/catalogo">Cadastre no catálogo</a>.</p>
      ${dados.categorias.map(blocoCategoria)}
      <div class="total-venda"><span>Total produzido</span><strong data-total>0 un.</strong></div>
      <div class="formulario__acoes"><button class="botao botao--primario" type="submit">Registrar produção</button></div>
    </form>
    <script type="application/json" id="dados-producao">${jsonSeguro(catalogoCliente)}</script>`;
  return html`${cabecalhoPagina('Produção diária', 'Registre o que saiu da cozinha hoje.')}
  <div class="grade grade--producao">
    ${cartao('Registrar produção', formulario)}
    ${cartao('Últimos lotes', historico(dados))}
  </div>`;
}
