import type { Categoria, Cliente, Produto } from '../dominio/tipos.js';
import type { Repositorios } from '../repositorios/repositorios.js';
import { somarTotal, type TotaisProduto } from '../utilitarios/estatisticas.js';
import { diaDe, hojeIso, somarDias } from '../utilitarios/formatacao.js';
import type { ServicoCatalogo } from './servico-catalogo.js';
import type { ServicoEstoque } from './servico-estoque.js';
import type { ServicoProducao } from './servico-producao.js';
import type { ServicoVenda } from './servico-venda.js';

export interface IndicadoresGerais {
  readonly faturamentoMesCentavos: number;
  readonly faturamentoHojeCentavos: number;
  readonly vendasNoMes: number;
  readonly ticketMedioCentavos: number;
  readonly produzidoHoje: number;
  readonly totalClientes: number;
}

export interface LinhaRanking {
  readonly rotulo: string;
  readonly categoria: Categoria;
  readonly unidades: number;
  readonly receitaCentavos: number;
}

export interface SaboresDaCategoria {
  readonly categoria: Categoria;
  readonly unidadesCategoria: number;
  readonly sabores: LinhaRanking[];
}

export interface MelhorCliente {
  readonly cliente: Cliente;
  readonly totalCentavos: number;
  readonly compras: number;
  readonly favorito: LinhaRanking | null;
}

export interface VendaDoDia {
  readonly dia: string;
  readonly totalCentavos: number;
}

export interface DadosPainel {
  readonly indicadores: IndicadoresGerais;
  readonly produtosMaisVendidos: LinhaRanking[];
  readonly saboresPorCategoria: SaboresDaCategoria[];
  readonly melhorCliente: MelhorCliente | null;
  readonly estoqueBaixo: Array<{ produto: Produto; categoria: Categoria }>;
  readonly ultimosSeteDias: VendaDoDia[];
}

/** Consolida as informações do dashboard a partir dos demais serviços (somente leitura). */
export class ServicoPainel {
  constructor(
    private readonly repos: Repositorios,
    private readonly catalogo: ServicoCatalogo,
    private readonly estoque: ServicoEstoque,
    private readonly producao: ServicoProducao,
    private readonly vendas: ServicoVenda,
  ) {}

  montar(limiteRanking = 5): DadosPainel {
    const indice = this.catalogo.indexarProdutos();
    const paraLinha = (totais: TotaisProduto): LinhaRanking | null => {
      const detalhe = indice.get(totais.produtoId);
      return detalhe
        ? { rotulo: detalhe.produto.sabor, categoria: detalhe.categoria, unidades: totais.unidades, receitaCentavos: totais.receitaCentavos }
        : null;
    };
    const ranking = this.vendas.rankingProdutos().map(paraLinha).filter((l): l is LinhaRanking => l !== null);

    return {
      indicadores: this.calcularIndicadores(),
      produtosMaisVendidos: ranking.slice(0, limiteRanking),
      saboresPorCategoria: this.catalogo.listarCategorias().map((categoria) => {
        const sabores = ranking.filter((l) => l.categoria.id === categoria.id);
        return { categoria, unidadesCategoria: sabores.reduce((s, l) => s + l.unidades, 0), sabores: sabores.slice(0, 3) };
      }),
      melhorCliente: this.encontrarMelhorCliente(paraLinha),
      estoqueBaixo: this.estoque
        .listarEstoqueBaixo()
        .flatMap((produto) => {
          const detalhe = indice.get(produto.id);
          return detalhe ? [{ produto, categoria: detalhe.categoria }] : [];
        }),
      ultimosSeteDias: this.vendasPorDia(7),
    };
  }

  private calcularIndicadores(): IndicadoresGerais {
    const hoje = hojeIso();
    const todas = this.repos.vendas.listar();
    const doMes = todas.filter((v) => diaDe(v.data).slice(0, 7) === hoje.slice(0, 7));
    const faturamentoMes = somarTotal(doMes);
    return {
      faturamentoMesCentavos: faturamentoMes,
      faturamentoHojeCentavos: somarTotal(todas.filter((v) => diaDe(v.data) === hoje)),
      vendasNoMes: doMes.length,
      ticketMedioCentavos: doMes.length > 0 ? Math.round(faturamentoMes / doMes.length) : 0,
      produzidoHoje: this.producao.totalProduzidoNoDia(hoje),
      totalClientes: this.repos.clientes.listar().length,
    };
  }

  private encontrarMelhorCliente(paraLinha: (t: TotaisProduto) => LinhaRanking | null): MelhorCliente | null {
    const topo = this.vendas.rankingClientes()[0];
    if (!topo) return null;
    const cliente = this.repos.clientes.buscarPorId(topo.clienteId);
    if (!cliente) return null;
    return {
      cliente,
      totalCentavos: topo.totalCentavos,
      compras: topo.compras,
      favorito: topo.favorito ? paraLinha(topo.favorito) : null,
    };
  }

  /** Faturamento dos últimos `dias` dias (incluindo hoje), dias sem venda com total zero. */
  private vendasPorDia(dias: number): VendaDoDia[] {
    const hoje = hojeIso();
    const totais = new Map<string, number>();
    for (const venda of this.repos.vendas.listar()) {
      const dia = diaDe(venda.data);
      totais.set(dia, (totais.get(dia) ?? 0) + venda.totalCentavos);
    }
    return Array.from({ length: dias }, (_, i) => {
      const dia = somarDias(hoje, i - (dias - 1));
      return { dia, totalCentavos: totais.get(dia) ?? 0 };
    });
  }
}

