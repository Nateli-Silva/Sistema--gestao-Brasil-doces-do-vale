import type { Categoria } from '../../dominio/tipos.js';
import type { ProdutoDetalhado } from '../../servicos/servico-catalogo.js';
import { centavosParaCampo, formatarInteiro, formatarMoeda } from '../../utilitarios/formatacao.js';
import { campoSelecao, campoTexto, type ContextoFormulario } from '../componentes/formulario.js';
import { alerta, bolhaCategoria, cabecalhoPagina, cartao, estadoVazio, selo, seloEstoque } from '../componentes/interface.js';
import { buscaSabor, seletorDeCategorias } from '../componentes/navegacao-sabores.js';
import { html, type HtmlSeguro } from '../html.js';

function formularioNovoSabor(categorias: readonly Categoria[], contexto: ContextoFormulario, mensagemErro?: string): HtmlSeguro {
  return html`${mensagemErro ? alerta(mensagemErro) : ''}
  <form method="post" action="/catalogo/sabores" class="formulario formulario--grade">
    ${campoSelecao(contexto, { nome: 'categoriaId', rotulo: 'Categoria', obrigatorio: true, vazio: 'Selecione…', opcoes: categorias.map((c) => ({ valor: c.id, rotulo: c.nome })) })}
    ${campoTexto(contexto, { nome: 'sabor', rotulo: 'Nome do sabor', obrigatorio: true, placeholder: 'Ex.: Maracujá com chocolate branco' })}
    <div class="formulario__acoes"><button class="botao botao--primario" type="submit">Cadastrar sabor</button></div>
  </form>`;
}

/** Edição de um único sabor: nome, valor, mínimo, desativar e excluir (com o estoque como informação). */
function editorDoSabor({ produto, categoria }: ProdutoDetalhado): HtmlSeguro {
  return html`<div class="detalhe-sabor ${produto.ativo ? '' : 'linha-sabor--inativa'}">
    <header>${bolhaCategoria(categoria, 44)}<div><h3>${produto.sabor}</h3><small>${categoria.nome}</small></div>
      ${produto.ativo ? seloEstoque(produto.quantidadeEstoque, produto.estoqueMinimo) : selo('Inativo', 'neutro')}</header>
    <p class="subtitulo">Em estoque agora: <strong>${formatarInteiro(produto.quantidadeEstoque)} un.</strong></p>
    <form method="post" action="/catalogo/sabores/${produto.id}" class="linha-sabor__edicao">
      <label class="linha-sabor__campo linha-sabor__campo--nome"><span>Nome do sabor</span><input name="sabor" value="${produto.sabor}" required></label>
      <label class="linha-sabor__campo"><span>Valor sugerido (R$)</span><input name="preco" value="${produto.precoCentavos > 0 ? centavosParaCampo(produto.precoCentavos) : ''}" inputmode="decimal" placeholder="opcional"></label>
      <label class="linha-sabor__campo"><span>Estoque mínimo</span><input name="estoqueMinimo" type="number" min="0" value="${produto.estoqueMinimo}" required></label>
      <button class="botao botao--primario botao--pequeno" type="submit">Salvar</button>
    </form>
    <div class="linha-sabor__acoes">
      <form method="post" action="/catalogo/sabores/${produto.id}/alternar"><button class="botao botao--fantasma botao--pequeno" type="submit">${produto.ativo ? 'Desativar' : 'Reativar'}</button></form>
      <form method="post" action="/catalogo/sabores/${produto.id}/excluir" onsubmit="return confirm('Excluir o sabor ${produto.sabor.replace(/['"\\<>&]/g, '')}?')"><button class="botao botao--perigo botao--pequeno" type="submit">Excluir</button></form>
    </div>
  </div>`;
}

/** Lista curta de uma categoria; cada linha abre o sabor para editar. */
function listaDaCategoria(itens: readonly ProdutoDetalhado[]): HtmlSeguro {
  if (itens.length === 0) return estadoVazio('Nenhum sabor cadastrado nesta categoria.');
  return html`<ul class="lista-toque">${itens.map(({ produto }) => html`<li><a href="/catalogo?sabor=${produto.id}">
    <span>${produto.sabor}${produto.ativo ? '' : selo('Inativo', 'neutro')}</span>
    <small>${produto.precoCentavos > 0 ? `${formatarMoeda(produto.precoCentavos)} · ` : ''}${formatarInteiro(produto.quantidadeEstoque)} em estoque</small></a></li>`)}</ul>`;
}

/** Visão geral: um cartão por categoria, sem listar todos os sabores. */
function resumoDasCategorias(categorias: readonly Categoria[], produtos: readonly ProdutoDetalhado[]): HtmlSeguro {
  return html`<div class="grade grade--sabores">${categorias.map((categoria) => {
    const total = produtos.filter((p) => p.categoria.id === categoria.id).length;
    return html`<a class="mini-cartao mini-cartao--link" href="/catalogo?categoria=${categoria.id}">
      <header>${bolhaCategoria(categoria, 38)}<div><h3>${categoria.nome}</h3><small>${total} ${total === 1 ? 'sabor' : 'sabores'}</small></div></header></a>`;
  })}</div>`;
}

export interface DadosPaginaCatalogo {
  readonly categorias: readonly Categoria[];
  readonly produtos: readonly ProdutoDetalhado[];
  readonly categoriaSelecionada: Categoria | undefined;
  readonly saborSelecionado: ProdutoDetalhado | undefined;
  readonly formulario: ContextoFormulario;
  readonly erroGeral?: string;
}

export function paginaCatalogo(dados: DadosPaginaCatalogo): HtmlSeguro {
  const daCategoria = dados.categoriaSelecionada ? dados.produtos.filter((p) => p.categoria.id === dados.categoriaSelecionada?.id) : [];
  const pesquisaveis = dados.categoriaSelecionada ? daCategoria : dados.produtos;
  const temErroNoCadastro = dados.erroGeral !== undefined || Object.keys(dados.formulario.erros).length > 0;

  const sabores = html`${buscaSabor({ urlBase: '/catalogo', produtos: pesquisaveis, selecionado: dados.saborSelecionado, detalhe: (i) => `${i.categoria.nome} · ${formatarInteiro(i.produto.quantidadeEstoque)} em estoque` })}
    ${seletorDeCategorias(dados.categorias, dados.categoriaSelecionada?.id, '/catalogo')}
    ${dados.saborSelecionado ? editorDoSabor(dados.saborSelecionado) : ''}
    ${dados.categoriaSelecionada ? listaDaCategoria(daCategoria) : resumoDasCategorias(dados.categorias, dados.produtos)}`;

  return html`${cabecalhoPagina('Catálogo', 'Encontre um sabor pela categoria ou digitando o nome. Cadastre novos sabores quando quiser.')}
  <details class="recolhivel" ${temErroNoCadastro ? 'open' : ''}><summary>+ Cadastrar novo sabor</summary>${formularioNovoSabor(dados.categorias, dados.formulario, dados.erroGeral)}</details>
  ${cartao('Sabores', sabores)}`;
}
