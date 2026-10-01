import type { Periodo } from '../../utilitarios/periodos.js';
import type { Granularidade } from '../../utilitarios/periodos.js';
import type { PontoSerie, ResumoPeriodo, TotalPorPagamento } from '../../servicos/servico-faturamento.js';
import { formatarData, formatarInteiro, formatarMoeda } from '../../utilitarios/formatacao.js';
import { graficoColunas } from '../componentes/graficos.js';
import { cabecalhoPagina, cartao, estadoVazio, selo } from '../componentes/interface.js';
import { html, type HtmlSeguro } from '../html.js';

export interface DadosPaginaFaturamento {
  readonly hoje: string;
  readonly selecionado: Granularidade;
  /** Um resumo para cada período, na ordem dia, semana, mês, ano. */
  readonly resumos: readonly ResumoPeriodo[];
  readonly serie: readonly PontoSerie[];
  readonly formasPagamento: readonly TotalPorPagamento[];
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_DA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const TITULO: Readonly<Record<Granularidade, { cartao: string; detalhe: string; comparacao: string }>> = {
  dia: { cartao: 'Hoje', detalhe: 'Últimos 14 dias', comparacao: 'ontem' },
  semana: { cartao: 'Esta semana', detalhe: 'Últimas 8 semanas', comparacao: 'semana passada' },
  mes: { cartao: 'Este mês', detalhe: 'Meses do ano', comparacao: 'mês passado' },
  ano: { cartao: 'Este ano', detalhe: 'Últimos 5 anos', comparacao: 'ano passado' },
};

const ROTULO_PAGAMENTO = { PIX: 'Pix', DINHEIRO: 'Dinheiro', CARTAO: 'Cartão', FATURADO: 'Faturado (PJ)' } as const;

const curto = (dia: string): string => formatarData(dia).slice(0, 5);

/** Texto do intervalo: "01/10", "28/09 a 04/10", "Outubro de 2026" ou "2026". */
function descreverPeriodo(g: Granularidade, p: Periodo): string {
  switch (g) {
    case 'dia':
      return `${DIAS_DA_SEMANA[new Date(`${p.inicio}T12:00:00Z`).getUTCDay()]} ${curto(p.inicio)}`;
    case 'semana':
      return `${curto(p.inicio)} a ${curto(p.fim)}`;
    case 'mes':
      return `${MESES[Number(p.inicio.slice(5, 7)) - 1]} de ${p.inicio.slice(0, 4)}`;
    case 'ano':
      return p.inicio.slice(0, 4);
  }
}

/** Rótulo do gráfico (curto) e da tabela (completo) para cada ponto da série. */
function rotuloGrafico(g: Granularidade, p: Periodo): string {
  if (g === 'mes') return (MESES[Number(p.inicio.slice(5, 7)) - 1] ?? '').slice(0, 3);
  return g === 'ano' ? p.inicio.slice(0, 4) : curto(p.inicio);
}

function variacao(resumo: ResumoPeriodo): HtmlSeguro {
  const v = resumo.variacaoPercentual;
  const comparacao = TITULO[resumo.granularidade].comparacao;
  if (v === null) return html`<small>${`Sem vendas ${comparacao} para comparar`}</small>`;
  const tom = v > 0 ? 'ok' : v < 0 ? 'critico' : 'neutro';
  return html`<small>${selo(`${v > 0 ? '▲' : v < 0 ? '▼' : '='} ${Math.abs(v)}%`, tom)} vs. ${comparacao}</small>`;
}

function cartoesDePeriodo(dados: DadosPaginaFaturamento): HtmlSeguro {
  return html`<div class="grade grade--faturamento">${dados.resumos.map((r) => html`<a class="cartao-periodo ${r.granularidade === dados.selecionado ? 'cartao-periodo--ativo' : ''}" href="/faturamento?periodo=${r.granularidade}" ${r.granularidade === dados.selecionado ? 'aria-current="true"' : ''}>
    <span class="cartao-periodo__titulo">${TITULO[r.granularidade].cartao}</span>
    <strong class="cartao-periodo__valor">${formatarMoeda(r.totalCentavos)}</strong>
    <small>${descreverPeriodo(r.granularidade, r.periodo)}</small>
    <small>${formatarInteiro(r.vendas)} ${r.vendas === 1 ? 'venda' : 'vendas'}${r.vendas > 0 ? ` · ticket ${formatarMoeda(r.ticketMedioCentavos)}` : ''}</small>
    ${variacao(r)}
  </a>`)}</div>`;
}

function tabelaDaSerie(dados: DadosPaginaFaturamento): HtmlSeguro {
  // Meses seguem o calendário (jan→dez); os demais mostram o mais recente primeiro.
  const linhas = dados.selecionado === 'mes' ? dados.serie : [...dados.serie].reverse();
  return html`<div class="tabela-rolavel"><table class="tabela">
    <thead><tr><th>Período</th><th class="num">Vendas</th><th class="num">Ticket médio</th><th class="num">Faturamento</th></tr></thead>
    <tbody>${linhas.map((p) => html`<tr class="${p.atual ? 'linha-atual' : ''}">
      <td>${descreverPeriodo(dados.selecionado, p.periodo)} ${p.atual ? selo('atual', 'rosa') : ''}</td>
      <td class="num">${formatarInteiro(p.vendas)}</td>
      <td class="num">${p.vendas > 0 ? formatarMoeda(Math.round(p.totalCentavos / p.vendas)) : '—'}</td>
      <td class="num"><strong>${formatarMoeda(p.totalCentavos)}</strong></td>
    </tr>`)}</tbody></table></div>`;
}

function formasDePagamento(dados: DadosPaginaFaturamento, total: number): HtmlSeguro {
  if (dados.formasPagamento.length === 0) return estadoVazio('Nenhuma venda neste período.');
  return html`<ul class="ranking">${dados.formasPagamento.map((f) => html`<li>
    <div class="ranking__texto"><strong>${ROTULO_PAGAMENTO[f.forma]}</strong><small>${f.vendas} ${f.vendas === 1 ? 'venda' : 'vendas'}</small>
      <span class="barra barra--ok"><span style="width:${total > 0 ? Math.round((f.totalCentavos / total) * 100) : 0}%"></span></span></div>
    <span class="ranking__valor">${formatarMoeda(f.totalCentavos)}</span>
  </li>`)}</ul>`;
}

export function paginaFaturamento(dados: DadosPaginaFaturamento): HtmlSeguro {
  const resumo = dados.resumos.find((r) => r.granularidade === dados.selecionado);
  const titulo = TITULO[dados.selecionado];
  const barras = dados.serie.map((p) => ({ rotulo: rotuloGrafico(dados.selecionado, p.periodo), valorCentavos: p.totalCentavos, destaque: p.atual }));
  return html`${cabecalhoPagina('Faturamento', 'Tudo o que entrou nas vendas: hoje, na semana, no mês e no ano.')}
  ${cartoesDePeriodo(dados)}
  ${cartao(titulo.detalhe, html`${graficoColunas(barras, `Faturamento — ${titulo.detalhe}`)}${tabelaDaSerie(dados)}`)}
  ${resumo ? cartao(html`Formas de pagamento — ${titulo.cartao.toLowerCase()}`, formasDePagamento(dados, resumo.totalCentavos)) : ''}`;
}
