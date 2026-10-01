import type { Producao } from '../../dominio/tipos.js';
import type { ProdutoDetalhado } from '../../servicos/servico-catalogo.js';
import { formatarData, formatarInteiro } from '../../utilitarios/formatacao.js';
import { campoAreaTexto, campoTexto, type ContextoFormulario } from '../componentes/formulario.js';
import { alerta, bolhaCategoria, cabecalhoPagina, cartao, estadoVazio, selo } from '../componentes/interface.js';
import { botao } from '../componentes/interface.js';
import { html, type HtmlSeguro } from '../html.js';

export interface DadosPaginaProducao {
  readonly produtos: readonly ProdutoDetalhado[];
  readonly recentes: readonly Producao[];
  readonly indice: ReadonlyMap<string, ProdutoDetalhado>;
  readonly formulario: ContextoFormulario;
  readonly erroGeral?: string;
}

function gradeDeQuantidades(dados: DadosPaginaProducao): HtmlSeguro {
  if (dados.produtos.length === 0) return estadoVazio('Cadastre sabores no catálogo para registrar a produção.', botao('Ir ao catálogo', '/catalogo'));
  const porCategoria = new Map<string, ProdutoDetalhado[]>();
  for (const item of dados.produtos) porCategoria.set(item.categoria.id, [...(porCategoria.get(item.categoria.id) ?? []), item]);

  return html`${[...porCategoria.values()].map((itens) => {
    const categoria = itens[0]?.categoria;
    if (!categoria) return '';
    return html`<fieldset class="grupo-producao">
      <legend>${bolhaCategoria(categoria, 30)} ${categoria.nome}</legend>
      <div class="grupo-producao__itens">${itens.map(({ produto }) => {
        const nome = `quantidade_${produto.id}`;
        const erro = dados.formulario.erros[nome];
        return html`<label class="item-producao ${erro ? 'item-producao--erro' : ''}">
          <span>${produto.sabor}<small>em estoque: ${formatarInteiro(produto.quantidadeEstoque)}</small></span>
          <input type="number" min="0" step="1" name="${nome}" value="${dados.formulario.valores[nome] ?? ''}" placeholder="0" inputmode="numeric">
        </label>`;
      })}</div>
    </fieldset>`;
  })}`;
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

export function paginaProducao(dados: DadosPaginaProducao): HtmlSeguro {
  const erroItens = dados.formulario.erros.itens ?? dados.erroGeral;
  const formulario = html`${erroItens ? alerta(erroItens) : ''}
    <form method="post" action="/producao" class="formulario">
      <div class="formulario--grade">
        ${campoTexto(dados.formulario, { nome: 'data', rotulo: 'Data da produção', tipo: 'date', obrigatorio: true })}
        ${campoAreaTexto(dados.formulario, { nome: 'observacao', rotulo: 'Observação', placeholder: 'Ex.: lote da encomenda de sábado' })}
      </div>
      <p class="subtitulo">Informe só o que foi produzido. Cada quantidade entra automaticamente no estoque.</p>
      ${gradeDeQuantidades(dados)}
      <div class="formulario__acoes"><button class="botao botao--primario" type="submit">Registrar produção</button></div>
    </form>`;
  return html`${cabecalhoPagina('Produção diária', 'Registre o que saiu da cozinha hoje.')}
  <div class="grade grade--producao">
    ${cartao('Registrar produção', formulario)}
    ${cartao('Últimos lotes', historico(dados))}
  </div>`;
}
