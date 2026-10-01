import { ErroDeNegocio, ErroDeValidacao, ErroNaoEncontrado } from '../dominio/erros.js';
import { FORMAS_PAGAMENTO, type FormaPagamento, type ItemVenda, type Venda } from '../dominio/tipos.js';
import type { Repositorios } from '../repositorios/repositorios.js';
import { agruparPorProduto, ordenarPorUnidades, produtoFavorito, somarTotal, type TotaisProduto } from '../utilitarios/estatisticas.js';
import type { ServicoEstoque, PedidoMovimento } from './servico-estoque.js';

export interface DadosVenda {
  readonly clienteId: string;
  readonly formaPagamento: string;
  readonly observacao: string;
  readonly itens: readonly PedidoMovimento[];
}

export interface HistoricoCliente {
  readonly vendas: Venda[];
  readonly totalGastoCentavos: number;
  readonly ticketMedioCentavos: number;
  readonly ultimaCompra: string | null;
  readonly favorito: TotaisProduto | undefined;
}

/** Vendas: registra a venda vinculada ao cliente e baixa os itens do estoque na mesma operação. */
export class ServicoVenda {
  constructor(
    private readonly repos: Repositorios,
    private readonly estoque: ServicoEstoque,
  ) {}

  /** Vendas mais recentes primeiro. */
  listar(): Venda[] {
    return [...this.repos.vendas.listar()].sort((a, b) => b.data.localeCompare(a.data));
  }

  buscarPorId(id: string): Venda {
    const venda = this.repos.vendas.buscarPorId(id);
    if (!venda) throw new ErroNaoEncontrado('Venda');
    return venda;
  }

  listarDoCliente(clienteId: string): Venda[] {
    return this.listar().filter((v) => v.clienteId === clienteId);
  }

  historicoDoCliente(clienteId: string): HistoricoCliente {
    const vendas = this.listarDoCliente(clienteId);
    const total = somarTotal(vendas);
    return {
      vendas,
      totalGastoCentavos: total,
      ticketMedioCentavos: vendas.length > 0 ? Math.round(total / vendas.length) : 0,
      ultimaCompra: vendas[0]?.data ?? null,
      favorito: produtoFavorito(vendas),
    };
  }

  /** Ranking de compradores por valor total gasto, já com o produto favorito de cada um. */
  rankingClientes(): Array<{ clienteId: string; totalCentavos: number; compras: number; favorito: TotaisProduto | undefined }> {
    const porCliente = new Map<string, Venda[]>();
    for (const venda of this.repos.vendas.listar()) {
      porCliente.set(venda.clienteId, [...(porCliente.get(venda.clienteId) ?? []), venda]);
    }
    return [...porCliente]
      .map(([clienteId, vendas]) => ({
        clienteId,
        totalCentavos: somarTotal(vendas),
        compras: vendas.length,
        favorito: produtoFavorito(vendas),
      }))
      .sort((a, b) => b.totalCentavos - a.totalCentavos);
  }

  /** Ranking de produtos por unidades vendidas. */
  rankingProdutos(): TotaisProduto[] {
    return ordenarPorUnidades(agruparPorProduto(this.repos.vendas.listar()));
  }

  registrar(dados: DadosVenda): Venda {
    const itens = this.montarItens(dados);
    // Valida o estoque antes de gravar a venda, para que uma recusa não deixe registros órfãos.
    this.estoque.garantirDisponibilidade(itens);
    const venda = this.repos.vendas.inserir({
      clienteId: dados.clienteId,
      data: new Date().toISOString(),
      itens,
      totalCentavos: itens.reduce((soma, i) => soma + i.quantidade * i.precoUnitarioCentavos, 0),
      formaPagamento: dados.formaPagamento as FormaPagamento,
      observacao: dados.observacao.trim(),
    });
    this.estoque.saida(itens, 'VENDA', venda.id);
    return venda;
  }

  /** Valida o pedido e consolida linhas repetidas do mesmo produto, fixando o preço vigente. */
  private montarItens(dados: DadosVenda): ItemVenda[] {
    const erros: Record<string, string> = {};
    if (!this.repos.clientes.buscarPorId(dados.clienteId)) erros.clienteId = 'Escolha o cliente.';
    if (!(FORMAS_PAGAMENTO as readonly string[]).includes(dados.formaPagamento)) erros.formaPagamento = 'Escolha a forma de pagamento.';

    const consolidado = new Map<string, number>();
    for (const item of dados.itens) {
      if (!this.repos.produtos.buscarPorId(item.produtoId)) erros.itens = 'Selecione o produto em todas as linhas.';
      else if (!Number.isInteger(item.quantidade) || item.quantidade <= 0) erros.itens = 'Informe quantidades inteiras maiores que zero.';
      else consolidado.set(item.produtoId, (consolidado.get(item.produtoId) ?? 0) + item.quantidade);
    }
    if (dados.itens.length === 0) erros.itens = 'Adicione ao menos um item à venda.';
    if (Object.keys(erros).length > 0) throw new ErroDeValidacao(erros);

    return [...consolidado].map(([produtoId, quantidade]) => {
      const produto = this.repos.produtos.buscarPorId(produtoId);
      if (!produto?.ativo) throw new ErroDeNegocio('Há um sabor inativo na venda.');
      return { produtoId, quantidade, precoUnitarioCentavos: produto.precoCentavos };
    });
  }
}
