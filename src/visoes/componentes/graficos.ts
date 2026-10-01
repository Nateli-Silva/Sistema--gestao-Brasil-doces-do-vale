import { html, type HtmlSeguro } from '../html.js';
import { formatarMoeda } from '../../utilitarios/formatacao.js';

export interface BarraGrafico {
  readonly rotulo: string;
  readonly valorCentavos: number;
  /** Barra destacada (ex.: o período atual). Se nenhuma for marcada, destaca a última. */
  readonly destaque?: boolean;
}

/** Gráfico de colunas em SVG simples e acessível (faturamento por dia). */
export function graficoColunas(barras: readonly BarraGrafico[], descricao = 'Faturamento'): HtmlSeguro {
  const largura = 420;
  const altura = 170;
  const margemBase = 28;
  const maximo = Math.max(...barras.map((b) => b.valorCentavos), 1);
  const passo = largura / barras.length;
  const larguraBarra = passo * 0.56;
  const alturaUtil = altura - margemBase - 14;
  const temDestaque = barras.some((b) => b.destaque);
  const tamanhoRotulo = barras.length > 10 ? 9 : 11;

  return html`<svg class="grafico" viewBox="0 0 ${largura} ${altura}" role="img" aria-label="${descricao}">
    <line x1="0" y1="${altura - margemBase}" x2="${largura}" y2="${altura - margemBase}" class="grafico__eixo"/>
    ${barras.map((barra, i) => {
      const h = Math.max(barra.valorCentavos > 0 ? 4 : 0, (barra.valorCentavos / maximo) * alturaUtil);
      const x = i * passo + (passo - larguraBarra) / 2;
      const y = altura - margemBase - h;
      return html`<g>
        <title>${barra.rotulo}: ${formatarMoeda(barra.valorCentavos)}</title>
        <rect class="grafico__barra ${(temDestaque ? barra.destaque : i === barras.length - 1) ? 'grafico__barra--hoje' : ''}" x="${x}" y="${y}" width="${larguraBarra}" height="${h}" rx="6"/>
        <text class="grafico__rotulo" style="font-size:${tamanhoRotulo}px" x="${x + larguraBarra / 2}" y="${altura - 9}" text-anchor="middle">${barra.rotulo}</text>
      </g>`;
    })}
  </svg>`;
}
