import type { Cliente, FormaPagamento, Venda } from '../../dominio/tipos.js';
import { FORMAS_PAGAMENTO } from '../../dominio/tipos.js';
import type { ProdutoDetalhado } from '../../servicos/servico-catalogo.js';
import { formatarDataHora, formatarInteiro, formatarMoeda } from '../../utilitarios/formatacao.js';
import { campoAreaTexto, campoSelecao, type ContextoFormulario } from '../componentes/formulario.js';
import { alerta, bolhaCategoria, botao, cabecalhoPagina, cartao, estadoVazio, selo } from '../componentes/interface.js';
import { descricaoItem } from '../componentes/venda.js';
import { html, jsonSeguro, type HtmlSeguro } from '../html.js';

const ROTULO_PAGAMENTO: Readonly<Record<FormaPagamento, string>> = {
  PIX: 'Pix',
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão',
  FATURADO: 'Faturado (PJ)',
};

// ---------- Lista ----------

export interface DadosListaVendas {
  readonly vendas: readonly Venda[];
  readonly clientes: ReadonlyMap<string, Cliente>;
  readonly indice: ReadonlyMap<string, ProdutoDetalhado>;
}

export function paginaListaVendas({ vendas, clientes, indice }: DadosListaVendas): HtmlSeguro {
  const tabela = vendas.length === 0
    ? estadoVazio('Nenhuma venda registrada ainda.', botao('Registrar a primeira venda', '/vendas/nova', { icone: 'mais' }))
    : html`<div class="tabela-rolavel"><table class="tabela">
      <thead><tr><th>Data</th><th>Cliente</th><th>Itens</th><th>Pagamento</th><th class="num">Total</th></tr></thead>
      <tbody>${vendas.map((v) => html`<tr>
        <td><a href="/vendas/${v.id}">${formatarDataHora(v.data)}</a></td>
        <td>${clientes.has(v.clienteId) ? html`<a href="/clientes/${v.clienteId}">${clientes.get(v.clienteId)?.nome}</a>` : '—'}</td>
        <td>${v.itens.map((i) => html`<span class="ficha">${indice.get(i.produtoId)?.produto.sabor ?? '—'} · ${descricaoItem(i)}</span>`)}</td>
        <td>${selo(ROTULO_PAGAMENTO[v.formaPagamento], 'neutro')}</td>
        <td class="num"><strong>${formatarMoeda(v.totalCentavos)}</strong></td>
      </tr>`)}</tbody></table></div>`;
  return html`${cabecalhoPagina('Vendas', 'Todas as vendas, da mais recente para a mais antiga.', botao('Nova venda', '/vendas/nova', { icone: 'mais' }))}${cartao('Histórico de vendas', tabela)}`;
}

// ---------- Formulário ----------

export interface DadosFormularioVenda {
  readonly clientes: readonly Cliente[];
  readonly produtos: readonly ProdutoDetalhado[];
  /** Linhas já preenchidas (após erro de validação ou pré-seleção). */
  readonly linhas: ReadonlyArray<{ produtoId: string; formato: string; quantidade: string; unidadesPorCaixa: string; valor: string }>;
  readonly formulario: ContextoFormulario;
  readonly erroGeral?: string;
}

export function paginaFormularioVenda(dados: DadosFormularioVenda): HtmlSeguro {
  // O catálogo viaja como JSON para o script do cliente montar as linhas de itens.
  const catalogoCliente = dados.produtos.map(({ produto, categoria }) => ({
    id: produto.id,
    categoria: categoria.nome,
    sabor: produto.sabor,
    precoCentavos: produto.precoCentavos,
    estoque: produto.quantidadeEstoque,
  }));
  const erroItens = dados.formulario.erros.itens ?? dados.erroGeral;
  const formulario = html`
    <form method="post" action="/vendas" class="formulario" data-formulario-venda>
      ${erroItens ? alerta(erroItens) : ''}
      <div class="formulario--grade">
        ${campoSelecao(dados.formulario, { nome: 'clienteId', rotulo: 'Cliente', obrigatorio: true, vazio: 'Selecione o cliente…', opcoes: dados.clientes.map((c) => ({ valor: c.id, rotulo: `${c.nome} (${c.tipo})` })), ajuda: dados.clientes.length === 0 ? 'Cadastre um cliente antes de vender.' : undefined })}
        ${campoSelecao(dados.formulario, { nome: 'formaPagamento', rotulo: 'Pagamento', obrigatorio: true, opcoes: FORMAS_PAGAMENTO.map((f) => ({ valor: f, rotulo: ROTULO_PAGAMENTO[f] })) })}
      </div>
      <h3 class="subtitulo-secao">Itens</h3>
      <p class="subtitulo">Venda por <strong>unidade</strong> ou por <strong>caixa</strong> (informe quantas unidades vêm na caixa). O valor vem do cadastro, mas você pode alterar em cada item.</p>
      <div class="itens-venda" data-itens></div>
      <button type="button" class="botao botao--suave" data-adicionar-item>+ Adicionar item</button>
      ${campoAreaTexto(dados.formulario, { nome: 'observacao', rotulo: 'Observação', placeholder: 'Entrega, recado no cartão…' })}
      <div class="total-venda"><span>Total da venda</span><strong data-total>R$ 0,00</strong></div>
      <div class="formulario__acoes"><a class="botao botao--suave" href="/vendas">Cancelar</a><button class="botao botao--primario" type="submit">Finalizar venda</button></div>
    </form>
    <script type="application/json" id="dados-venda">${jsonSeguro({ produtos: catalogoCliente, linhas: dados.linhas })}</script>`;
  return html`${cabecalhoPagina('Nova venda', 'Os itens vendidos saem do estoque automaticamente.')}${cartao('Dados da venda', formulario)}`;
}

// ---------- Detalhe ----------

export interface DadosDetalheVenda {
  readonly venda: Venda;
  readonly cliente: Cliente | undefined;
  readonly indice: ReadonlyMap<string, ProdutoDetalhado>;
}

export function paginaDetalheVenda({ venda, cliente, indice }: DadosDetalheVenda): HtmlSeguro {
  const itens = html`<div class="tabela-rolavel"><table class="tabela">
    <thead><tr><th>Produto</th><th>Vendido</th><th class="num">Valor</th></tr></thead>
    <tbody>${venda.itens.map((i) => {
      const detalhe = indice.get(i.produtoId);
      return html`<tr>
        <td>${detalhe ? html`<span class="celula-produto">${bolhaCategoria(detalhe.categoria, 28)}<span>${detalhe.produto.sabor}<small>${detalhe.categoria.nome}</small></span></span>` : '—'}</td>
        <td>${descricaoItem(i)}${i.formato === 'CAIXA' ? html`<small>= ${formatarInteiro(i.quantidade)} unidades</small>` : ''}</td>
        <td class="num"><strong>${formatarMoeda(i.subtotalCentavos)}</strong></td></tr>`;
    })}</tbody>
    <tfoot><tr><td colspan="2">Total</td><td class="num"><strong>${formatarMoeda(venda.totalCentavos)}</strong></td></tr></tfoot></table></div>`;
  return html`${cabecalhoPagina('Venda', formatarDataHora(venda.data), botao('Voltar às vendas', '/vendas', { variante: 'suave' }))}
  <div class="grade grade--duas">
    ${cartao('Itens', itens)}
    ${cartao('Resumo', html`<dl class="dados">
      <div><dt>Cliente</dt><dd>${cliente ? html`<a href="/clientes/${cliente.id}">${cliente.nome}</a>` : '—'}</dd></div>
      <div><dt>Pagamento</dt><dd>${ROTULO_PAGAMENTO[venda.formaPagamento]}</dd></div>
      ${venda.observacao ? html`<div><dt>Observação</dt><dd>${venda.observacao}</dd></div>` : ''}
    </dl>`)}
  </div>`;
}
