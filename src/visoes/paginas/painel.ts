import type { DadosPainel, LinhaRanking } from '../../servicos/servico-painel.js';
import { formatarData, formatarInteiro, formatarMoeda } from '../../utilitarios/formatacao.js';
import { graficoColunas } from '../componentes/graficos.js';
import { iconeInterface } from '../componentes/icones.js';
import { barraEstoque, bolhaCategoria, botao, cabecalhoPagina, cartao, estadoVazio, indicador, selo } from '../componentes/interface.js';
import { html, type HtmlSeguro } from '../html.js';

function rankingProdutos(linhas: readonly LinhaRanking[]): HtmlSeguro {
  if (linhas.length === 0) return estadoVazio('As vendas aparecerão aqui assim que forem registradas.');
  const maior = linhas[0]?.unidades ?? 1;
  return html`<ol class="ranking">${linhas.map((linha, i) => html`<li>
    <span class="ranking__posicao">${i + 1}</span>
    ${bolhaCategoria(linha.categoria, 34)}
    <div class="ranking__texto">
      <strong>${linha.rotulo}</strong><small>${linha.categoria.nome}</small>
      <span class="barra barra--ok"><span style="width:${Math.round((linha.unidades / maior) * 100)}%"></span></span>
    </div>
    <span class="ranking__valor">${formatarInteiro(linha.unidades)} <small>un.</small></span>
  </li>`)}</ol>`;
}

function cartaoMelhorCliente(dados: DadosPainel): HtmlSeguro {
  const melhor = dados.melhorCliente;
  if (!melhor) return estadoVazio('Ainda não há compras registradas.');
  return html`<div class="destaque-cliente">
    <span class="destaque-cliente__coroa">${iconeInterface('coroa', 22)}</span>
    <div>
      <a class="destaque-cliente__nome" href="/clientes/${melhor.cliente.id}">${melhor.cliente.nome}</a>
      <p class="subtitulo">${selo(melhor.cliente.tipo === 'PJ' ? 'Pessoa jurídica' : 'Pessoa física', 'neutro')} · ${melhor.compras} ${melhor.compras === 1 ? 'compra' : 'compras'}</p>
    </div>
    <p class="destaque-cliente__total">${formatarMoeda(melhor.totalCentavos)}</p>
  </div>
  ${melhor.favorito
    ? html`<div class="favorito">${bolhaCategoria(melhor.favorito.categoria, 38)}<div><small>Produto favorito</small><strong>${melhor.favorito.rotulo}</strong><small>${melhor.favorito.categoria.nome} · ${formatarInteiro(melhor.favorito.unidades)} un. compradas</small></div></div>`
    : ''}`;
}

function cartoesSabores(dados: DadosPainel): HtmlSeguro {
  return html`<div class="grade grade--sabores">${dados.saboresPorCategoria.map(({ categoria, sabores, unidadesCategoria }) => html`<article class="mini-cartao">
    <header>${bolhaCategoria(categoria, 38)}<div><h3>${categoria.nome}</h3><small>${formatarInteiro(unidadesCategoria)} un. vendidas</small></div></header>
    ${sabores.length === 0
      ? html`<p class="texto-suave">Sem vendas ainda.</p>`
      : html`<ol class="lista-compacta">${sabores.map((s, i) => html`<li><span>${i + 1}. ${s.rotulo}</span><strong>${formatarInteiro(s.unidades)}</strong></li>`)}</ol>`}
  </article>`)}</div>`;
}

function alertasEstoque(dados: DadosPainel): HtmlSeguro {
  if (dados.estoqueBaixo.length === 0) return estadoVazio('Tudo certo! Nenhum sabor abaixo do estoque mínimo.');
  return html`<ul class="lista-alertas">${dados.estoqueBaixo.map(({ produto, categoria }) => html`<li>
    ${bolhaCategoria(categoria, 30)}
    <div class="lista-alertas__texto"><strong>${produto.sabor}</strong><small>${categoria.nome} · mínimo ${produto.estoqueMinimo}</small>${barraEstoque(produto.quantidadeEstoque, produto.estoqueMinimo)}</div>
    ${selo(produto.quantidadeEstoque <= 0 ? 'Esgotado' : `${produto.quantidadeEstoque} un.`, produto.quantidadeEstoque <= 0 ? 'critico' : 'alerta')}
  </li>`)}</ul>`;
}

export function paginaPainel(dados: DadosPainel): HtmlSeguro {
  const { indicadores } = dados;
  return html`${cabecalhoPagina('Painel', 'Resumo do que está acontecendo na doceria.', [botao('Nova venda', '/vendas/nova', { icone: 'mais' }), botao('Registrar produção', '/producao', { icone: 'producao', variante: 'suave' })])}
  <div class="grade grade--indicadores">
    ${indicador('Faturamento do mês', formatarMoeda(indicadores.faturamentoMesCentavos), 'moeda', `Hoje: ${formatarMoeda(indicadores.faturamentoHojeCentavos)}`)}
    ${indicador('Vendas no mês', formatarInteiro(indicadores.vendasNoMes), 'recibo', `Ticket médio ${formatarMoeda(indicadores.ticketMedioCentavos)}`, 'rosa')}
    ${indicador('Produzido hoje', `${formatarInteiro(indicadores.produzidoHoje)} un.`, 'producao', '', 'chocolate')}
    ${indicador('Clientes', formatarInteiro(indicadores.totalClientes), 'clientes', 'PF e PJ cadastrados', 'rosa')}
  </div>
  <div class="grade grade--duas">
    ${cartao('Produtos mais vendidos', rankingProdutos(dados.produtosMaisVendidos))}
    ${cartao('Faturamento — últimos 7 dias', graficoColunas(dados.ultimosSeteDias.map((d) => ({ rotulo: formatarData(d.dia).slice(0, 5), valorCentavos: d.totalCentavos }))))}
  </div>
  ${cartao('Sabores mais vendidos por categoria', cartoesSabores(dados))}
  <div class="grade grade--duas">
    ${cartao('Cliente que mais compra', cartaoMelhorCliente(dados))}
    ${cartao(html`Alertas de estoque ${dados.estoqueBaixo.length > 0 ? selo(String(dados.estoqueBaixo.length), 'alerta') : ''}`, alertasEstoque(dados), { acao: botao('Ver estoque', '/estoque', { variante: 'suave' }) })}
  </div>`;
}
