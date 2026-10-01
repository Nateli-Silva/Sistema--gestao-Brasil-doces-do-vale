import { ErroDeValidacao, ErroNaoEncontrado } from '../dominio/erros.js';
import { FORMAS_PAGAMENTO, FORMATOS_VENDA, type FormaPagamento, type FormatoVenda, type ItemVenda, type Venda } from '../dominio/tipos.js';
import type { Repositorios } from '../repositorios/repositorios.js';
import { agruparPorProduto, ordenarPorUnidades, produtoFavorito, somarTotal, type TotaisProduto } from '../utilitarios/estatisticas.js';
import type { ServicoEstoque, PedidoMovimento } from './servico-estoque.js';

/** Linha da venda como informada na tela. */
export interface PedidoItemVenda {
  readonly produtoId: string;
  /** Padrão: UNIDADE. */
  readonly formato?: string;
  /** Unidades (formato UNIDADE) ou número de caixas (formato CAIXA). */
  readonly quantidade: number;
  /** Obrigatório no formato CAIXA: unidades dentro de cada caixa (varia a cada venda). */
  readonly unidadesPorCaixa?: number;
  /**
   * Valor definido por quem vende. No formato UNIDADE é por unidade; no formato CAIXA depende de `baseValor`.
   * Se omitido, usa o valor cadastrado do produto (na caixa: unidades × valor unitário).
   */
  readonly valorCentavos?: number;
  /** Formato CAIXA: `valorCentavos` é da CAIXA inteira (padrão) ou de cada UNIDADE da caixa. */
  readonly baseValor?: string;
}

export interface DadosVenda {
  readonly clienteId: string;
  readonly formaPagamento: string;
  readonly observacao: string;
  readonly itens: readonly PedidoItemVenda[];
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
    // Estoque é controlado em unidades; várias linhas do mesmo sabor são somadas na checagem.
    const consumo = this.consolidarConsumo(itens);
    this.estoque.garantirDisponibilidade(consumo);
    const venda = this.repos.vendas.inserir({
      clienteId: dados.clienteId,
      data: new Date().toISOString(),
      itens,
      totalCentavos: itens.reduce((soma, i) => soma + i.subtotalCentavos, 0),
      formaPagamento: dados.formaPagamento as FormaPagamento,
      observacao: dados.observacao.trim(),
    });
    this.estoque.saida(consumo, 'VENDA', venda.id);
    return venda;
  }

  private consolidarConsumo(itens: readonly ItemVenda[]): PedidoMovimento[] {
    const soma = new Map<string, number>();
    for (const item of itens) soma.set(item.produtoId, (soma.get(item.produtoId) ?? 0) + item.quantidade);
    return [...soma].map(([produtoId, quantidade]) => ({ produtoId, quantidade }));
  }

  /** Valida o pedido e calcula, por linha, as unidades que saem do estoque e o valor combinado. */
  private montarItens(dados: DadosVenda): ItemVenda[] {
    const erros: Record<string, string> = {};
    if (!this.repos.clientes.buscarPorId(dados.clienteId)) erros.clienteId = 'Escolha o cliente.';
    if (!(FORMAS_PAGAMENTO as readonly string[]).includes(dados.formaPagamento)) erros.formaPagamento = 'Escolha a forma de pagamento.';
    if (dados.itens.length === 0) erros.itens = 'Adicione ao menos um item à venda.';

    const itens: ItemVenda[] = [];
    for (const pedido of dados.itens) {
      const produto = this.repos.produtos.buscarPorId(pedido.produtoId);
      const formato = pedido.formato ?? 'UNIDADE';
      if (!produto) {
        erros.itens = 'Selecione o produto em todas as linhas.';
      } else if (!produto.ativo) {
        erros.itens = `O sabor "${produto.sabor}" está inativo.`;
      } else if (!(FORMATOS_VENDA as readonly string[]).includes(formato)) {
        erros.itens = 'Escolha se a venda é por unidade ou por caixa.';
      } else if (!Number.isInteger(pedido.quantidade) || pedido.quantidade <= 0) {
        erros.itens = 'Informe quantidades inteiras maiores que zero.';
      } else {
        const item = this.calcularItem(pedido, formato as FormatoVenda, produto.precoCentavos);
        if (item) itens.push(item);
        else erros.itens = 'Confira as unidades por caixa e o valor de cada item (maiores que zero).';
      }
    }
    if (Object.keys(erros).length > 0) throw new ErroDeValidacao(erros);
    return itens;
  }

  /** Retorna undefined se unidades por caixa ou valor forem inválidos. */
  private calcularItem(pedido: PedidoItemVenda, formato: FormatoVenda, precoUnitario: number): ItemVenda | undefined {
    const porCaixa = formato === 'CAIXA' ? pedido.unidadesPorCaixa : undefined;
    if (formato === 'CAIXA' && (porCaixa === undefined || !Number.isInteger(porCaixa) || porCaixa <= 0)) return undefined;
    const unidades = pedido.quantidade * (porCaixa ?? 1);
    // Valor padrão: o do cadastro (por unidade); na caixa, unidades da caixa × valor unitário.
    const valorPorUnidade = formato === 'CAIXA' && pedido.baseValor === 'UNIDADE';
    if (formato === 'CAIXA' && pedido.baseValor !== undefined && pedido.baseValor !== 'CAIXA' && !valorPorUnidade) return undefined;
    const valor = pedido.valorCentavos ?? precoUnitario * (porCaixa ?? 1);
    if (!Number.isFinite(valor) || valor <= 0) return undefined;
    // Valor por unidade dentro de uma caixa: multiplica pelas unidades de todas as caixas.
    const subtotal = Math.round(valorPorUnidade ? unidades * valor : pedido.quantidade * valor);
    return {
      produtoId: pedido.produtoId,
      formato,
      quantidade: unidades,
      caixas: formato === 'CAIXA' ? pedido.quantidade : null,
      unidadesPorCaixa: porCaixa ?? null,
      subtotalCentavos: subtotal,
      precoUnitarioCentavos: Math.round(subtotal / unidades),
    };
  }
}
