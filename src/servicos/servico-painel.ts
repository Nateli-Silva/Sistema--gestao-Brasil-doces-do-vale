import type { Categoria, Cliente, Produto } from '../dominio/tipos.js';
import type { Repositorios } from '../repositorios/repositorios.js';
import type { TotaisProduto } from '../utilitarios/estatisticas.js';
import type { ServicoCatalogo } from './servico-catalogo.js';
import type { ServicoEstoque } from './servico-estoque.js';
import type { ServicoFaturamento } from './servico-faturamento.js';
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

export interface DadosPainel {
  readonly indicadores: IndicadoresGerais;
  readonly produtosMaisVendidos: LinhaRanking[];
  readonly saboresPorCategoria: SaboresDaCategoria[];
  readonly melhorCliente: MelhorCliente | null;
  readonly estoqueBaixo: Array<{ produto: Produto; categoria: Categoria }>;
}

/** Consolida as informações do dashboard a partir dos demais serviços (somente leitura). */
export class ServicoPainel {
  constructor(
    private readonly repos: Repositorios,
    private readonly catalogo: ServicoCatalogo,
    private readonly estoque: ServicoEstoque,
    private readonly producao: ServicoProducao,
    private readonly vendas: ServicoVenda,
    private readonly faturamento: ServicoFaturamento,
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
    };
  }

  private calcularIndicadores(): IndicadoresGerais {
    const mes = this.faturamento.resumir('mes');
    return {
      faturamentoMesCentavos: mes.totalCentavos,
      faturamentoHojeCentavos: this.faturamento.resumir('dia').totalCentavos,
      vendasNoMes: mes.vendas,
      ticketMedioCentavos: mes.ticketMedioCentavos,
      produzidoHoje: this.producao.totalProduzidoNoDia(),
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
}
