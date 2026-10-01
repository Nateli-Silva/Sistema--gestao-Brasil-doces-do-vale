import type { Venda } from '../dominio/tipos.js';

export interface TotaisProduto {
  readonly produtoId: string;
  readonly unidades: number;
  readonly receitaCentavos: number;
}

/** Agrega unidades e receita por produto em um conjunto de vendas (base de dashboard e CRM). */
export function agruparPorProduto(vendas: readonly Venda[]): TotaisProduto[] {
  const mapa = new Map<string, { unidades: number; receitaCentavos: number }>();
  for (const venda of vendas) {
    for (const item of venda.itens) {
      const atual = mapa.get(item.produtoId) ?? { unidades: 0, receitaCentavos: 0 };
      mapa.set(item.produtoId, {
        unidades: atual.unidades + item.quantidade,
        receitaCentavos: atual.receitaCentavos + item.quantidade * item.precoUnitarioCentavos,
      });
    }
  }
  return [...mapa].map(([produtoId, totais]) => ({ produtoId, ...totais }));
}

/** Ordena por unidades vendidas (desc); desempata pela receita. */
export function ordenarPorUnidades(totais: readonly TotaisProduto[]): TotaisProduto[] {
  return [...totais].sort((a, b) => b.unidades - a.unidades || b.receitaCentavos - a.receitaCentavos);
}

/** Produto mais comprado em um conjunto de vendas, ou undefined se não houver itens. */
export function produtoFavorito(vendas: readonly Venda[]): TotaisProduto | undefined {
  return ordenarPorUnidades(agruparPorProduto(vendas))[0];
}

export function somarTotal(vendas: readonly Venda[]): number {
  return vendas.reduce((soma, venda) => soma + venda.totalCentavos, 0);
}
