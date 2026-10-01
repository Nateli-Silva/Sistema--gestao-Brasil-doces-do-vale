import type { Categoria } from '../../dominio/tipos.js';
import type { ProdutoDetalhado } from '../../servicos/servico-catalogo.js';
import { centavosParaCampo, formatarMoeda } from '../../utilitarios/formatacao.js';
import { campoSelecao, campoTexto, type ContextoFormulario } from '../componentes/formulario.js';
import { alerta, bolhaCategoria, cabecalhoPagina, cartao, estadoVazio, selo } from '../componentes/interface.js';
import { html, type HtmlSeguro } from '../html.js';

function formularioNovoSabor(categorias: readonly Categoria[], contexto: ContextoFormulario, mensagemErro?: string): HtmlSeguro {
  return html`${mensagemErro ? alerta(mensagemErro) : ''}
  <form method="post" action="/catalogo/sabores" class="formulario formulario--grade">
    ${campoSelecao(contexto, { nome: 'categoriaId', rotulo: 'Categoria', obrigatorio: true, vazio: 'Selecione…', opcoes: categorias.map((c) => ({ valor: c.id, rotulo: c.nome })) })}
    ${campoTexto(contexto, { nome: 'sabor', rotulo: 'Nome do sabor', obrigatorio: true, placeholder: 'Ex.: Maracujá com chocolate branco' })}
    ${campoTexto(contexto, { nome: 'preco', rotulo: 'Preço unitário (R$)', obrigatorio: true, placeholder: '0,00', atributos: 'inputmode="decimal"' })}
    ${campoTexto(contexto, { nome: 'estoqueMinimo', rotulo: 'Estoque mínimo', tipo: 'number', placeholder: '10', atributos: 'min="0" step="1"', ajuda: 'Abaixo disso o painel emite alerta.' })}
    <div class="formulario__acoes"><button class="botao botao--primario" type="submit">Cadastrar sabor</button></div>
  </form>`;
}

function linhaSabor(detalhe: ProdutoDetalhado): HtmlSeguro {
  const { produto } = detalhe;
  return html`<li class="linha-sabor ${produto.ativo ? '' : 'linha-sabor--inativa'}">
    <div class="linha-sabor__nome"><strong>${produto.sabor}</strong>${produto.ativo ? '' : selo('Inativo', 'neutro')}</div>
    <form method="post" action="/catalogo/sabores/${produto.id}" class="linha-sabor__edicao">
      <label><span class="sr-only">Preço</span><input name="preco" value="${centavosParaCampo(produto.precoCentavos)}" inputmode="decimal" aria-label="Preço em reais" size="6"></label>
      <label><span class="sr-only">Mínimo</span><input name="estoqueMinimo" type="number" min="0" value="${produto.estoqueMinimo}" aria-label="Estoque mínimo" size="3"></label>
      <button class="botao botao--suave botao--pequeno" type="submit">Salvar</button>
    </form>
    <form method="post" action="/catalogo/sabores/${produto.id}/alternar"><button class="botao botao--fantasma botao--pequeno" type="submit">${produto.ativo ? 'Desativar' : 'Reativar'}</button></form>
    <span class="linha-sabor__preco">${formatarMoeda(produto.precoCentavos)}</span>
  </li>`;
}

export interface DadosPaginaCatalogo {
  readonly categorias: readonly Categoria[];
  readonly produtos: readonly ProdutoDetalhado[];
  readonly formulario: ContextoFormulario;
  readonly erroGeral?: string;
}

export function paginaCatalogo(dados: DadosPaginaCatalogo): HtmlSeguro {
  const grupos = dados.categorias.map((categoria) => ({ categoria, itens: dados.produtos.filter((p) => p.categoria.id === categoria.id) }));
  return html`${cabecalhoPagina('Catálogo', 'Categorias e sabores. Cadastre novos sabores quando quiser.')}
  ${cartao('Novo sabor', formularioNovoSabor(dados.categorias, dados.formulario, dados.erroGeral))}
  <div class="grade grade--catalogo">${grupos.map(({ categoria, itens }) => cartao(
    html`<span class="titulo-com-icone">${bolhaCategoria(categoria, 38)}${categoria.nome}</span>`,
    itens.length === 0 ? estadoVazio('Nenhum sabor cadastrado nesta categoria.') : html`<ul class="lista-sabores">${itens.map(linhaSabor)}</ul>`,
    { acao: selo(`${itens.length} ${itens.length === 1 ? 'sabor' : 'sabores'}`, 'rosa') },
  ))}</div>`;
}

