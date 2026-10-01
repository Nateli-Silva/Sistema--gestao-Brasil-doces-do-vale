import type { FormaPagamento, Venda } from '../dominio/tipos.js';
import type { Repositorios } from '../repositorios/repositorios.js';
import { diaDe, hojeIso, somarDias } from '../utilitarios/formatacao.js';
import { contem, diferencaEmDias, periodoAnterior, periodoDe, type Granularidade, type Periodo } from '../utilitarios/periodos.js';

export interface ResumoPeriodo {
  readonly granularidade: Granularidade;
  readonly periodo: Periodo;
  readonly totalCentavos: number;
  readonly vendas: number;
  readonly ticketMedioCentavos: number;
  /** Total do período anterior até o mesmo ponto (ex.: mês passado até o mesmo dia do mês). */
  readonly anteriorCentavos: number;
  /** Variação em % sobre o período anterior; null se o anterior foi zero. */
  readonly variacaoPercentual: number | null;
}

export interface PontoSerie {
  readonly periodo: Periodo;
  readonly totalCentavos: number;
  readonly vendas: number;
  /** Verdadeiro para o período que contém hoje. */
  readonly atual: boolean;
}

export interface TotalPorPagamento {
  readonly forma: FormaPagamento;
  readonly totalCentavos: number;
  readonly vendas: number;
}

const PONTOS_DA_SERIE: Readonly<Record<Granularidade, number>> = { dia: 14, semana: 8, mes: 12, ano: 5 };

/** Faturamento por dia, semana, mês e ano, sempre no calendário da loja (UTC−3). */
export class ServicoFaturamento {
  constructor(private readonly repos: Repositorios) {}

  resumir(granularidade: Granularidade, hoje: string = hojeIso()): ResumoPeriodo {
    const periodo = periodoDe(granularidade, hoje);
    const vendas = this.vendasNo(periodo);
    const total = this.somar(vendas);

    // Compara com o período anterior até o mesmo ponto (evita comparar mês parcial com mês inteiro).
    const anterior = periodoAnterior(granularidade, hoje);
    const mesmoPonto: Periodo = {
      inicio: anterior.inicio,
      fim: this.menorDia(anterior.fim, somarDias(anterior.inicio, diferencaEmDias(periodo.inicio, hoje))),
    };
    const anteriorTotal = this.somar(this.vendasNo(mesmoPonto));

    return {
      granularidade,
      periodo,
      totalCentavos: total,
      vendas: vendas.length,
      ticketMedioCentavos: vendas.length > 0 ? Math.round(total / vendas.length) : 0,
      anteriorCentavos: anteriorTotal,
      variacaoPercentual: anteriorTotal > 0 ? Math.round(((total - anteriorTotal) / anteriorTotal) * 100) : null,
    };
  }

  /** Série para o gráfico: 14 dias, 8 semanas, 12 meses do ano corrente ou 5 anos. */
  serie(granularidade: Granularidade, hoje: string = hojeIso()): PontoSerie[] {
    return this.periodosDaSerie(granularidade, hoje).map((periodo) => {
      const vendas = this.vendasNo(periodo);
      return { periodo, totalCentavos: this.somar(vendas), vendas: vendas.length, atual: contem(periodo, hoje) };
    });
  }

  /** Quanto entrou em cada forma de pagamento no período, do maior para o menor. */
  porFormaPagamento(periodo: Periodo): TotalPorPagamento[] {
    const mapa = new Map<FormaPagamento, { totalCentavos: number; vendas: number }>();
    for (const venda of this.vendasNo(periodo)) {
      const atual = mapa.get(venda.formaPagamento) ?? { totalCentavos: 0, vendas: 0 };
      mapa.set(venda.formaPagamento, { totalCentavos: atual.totalCentavos + venda.totalCentavos, vendas: atual.vendas + 1 });
    }
    return [...mapa].map(([forma, dados]) => ({ forma, ...dados })).sort((a, b) => b.totalCentavos - a.totalCentavos);
  }

  private periodosDaSerie(granularidade: Granularidade, hoje: string): Periodo[] {
    const quantidade = PONTOS_DA_SERIE[granularidade];
    if (granularidade === 'mes') {
      // Janeiro a dezembro do ano corrente.
      const ano = hoje.slice(0, 4);
      return Array.from({ length: 12 }, (_, i) => periodoDe('mes', `${ano}-${String(i + 1).padStart(2, '0')}-01`));
    }
    const periodos: Periodo[] = [periodoDe(granularidade, hoje)];
    while (periodos.length < quantidade) {
      const primeiro = periodos[0];
      if (!primeiro) break;
      periodos.unshift(periodoAnterior(granularidade, primeiro.inicio));
    }
    return periodos;
  }

  private vendasNo(periodo: Periodo): Venda[] {
    return this.repos.vendas.listar().filter((v) => contem(periodo, diaDe(v.data)));
  }

  private somar(vendas: readonly Venda[]): number {
    return vendas.reduce((soma, v) => soma + v.totalCentavos, 0);
  }

  private menorDia(a: string, b: string): string {
    return a < b ? a : b;
  }
}
