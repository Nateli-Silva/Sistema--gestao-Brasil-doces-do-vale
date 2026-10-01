import { ErroDeNegocio } from '../dominio/erros.js';
import type { MovimentoEstoque, Producao, Produto, TipoMovimento } from '../dominio/tipos.js';
import type { Repositorios } from '../repositorios/repositorios.js';

export interface PedidoMovimento {
  readonly produtoId: string;
  readonly quantidade: number;
}

/** Visão consolidada de um sabor: quanto foi produzido, vendido e o que há em estoque. */
export interface ResumoSabor {
  readonly produzido: number;
  readonly vendido: number;
  readonly ultimasProducoes: Producao[];
}

/** Único ponto que altera saldos de estoque; cada alteração gera um movimento auditável. */
export class ServicoEstoque {
  constructor(private readonly repos: Repositorios) {}

  /** Produtos ativos cujo saldo está igual ou abaixo do mínimo, do mais crítico ao menos. */
  listarEstoqueBaixo(): Produto[] {
    return this.repos.produtos
      .listar()
      .filter((p) => p.ativo && p.quantidadeEstoque <= p.estoqueMinimo)
      .sort((a, b) => a.quantidadeEstoque - b.quantidadeEstoque);
  }

  /** Totais históricos de um sabor (produção e vendas) e seus lotes mais recentes. */
  resumirSabor(produtoId: string, limiteLotes = 5): ResumoSabor {
    const producoes = this.repos.producoes.listar().filter((p) => p.produtoId === produtoId);
    const vendido = this.repos.vendas
      .listar()
      .flatMap((v) => v.itens)
      .filter((i) => i.produtoId === produtoId)
      .reduce((soma, i) => soma + i.quantidade, 0);
    return {
      produzido: producoes.reduce((soma, p) => soma + p.quantidade, 0),
      vendido,
      ultimasProducoes: [...producoes].reverse().slice(0, limiteLotes),
    };
  }

  /** Total produzido por sabor, em uma única passada (usado nas listas por categoria). */
  totalProduzidoPorSabor(): Map<string, number> {
    const totais = new Map<string, number>();
    for (const p of this.repos.producoes.listar()) totais.set(p.produtoId, (totais.get(p.produtoId) ?? 0) + p.quantidade);
    return totais;
  }

  listarMovimentosRecentes(limite: number): MovimentoEstoque[] {
    return [...this.repos.movimentos.listar()].reverse().slice(0, limite);
  }

  /** Soma ao estoque (ex.: produção). */
  entrada(pedidos: readonly PedidoMovimento[], tipo: TipoMovimento, referenciaId: string | null): void {
    this.aplicar(pedidos, 1, tipo, referenciaId);
  }

  /** Subtrai do estoque (ex.: venda). Valida todos os itens antes de alterar qualquer saldo. */
  saida(pedidos: readonly PedidoMovimento[], tipo: TipoMovimento, referenciaId: string | null): void {
    this.garantirDisponibilidade(pedidos);
    this.aplicar(pedidos, -1, tipo, referenciaId);
  }

  /** Lança erro se algum item exceder o saldo disponível; não altera nada. */
  garantirDisponibilidade(pedidos: readonly PedidoMovimento[]): void {
    for (const pedido of pedidos) {
      const produto = this.repos.produtos.buscarPorId(pedido.produtoId);
      if (produto && produto.quantidadeEstoque < pedido.quantidade) {
        throw new ErroDeNegocio(
          `Estoque insuficiente de "${produto.sabor}": disponível ${produto.quantidadeEstoque}, solicitado ${pedido.quantidade}.`,
        );
      }
    }
  }

  private aplicar(
    pedidos: readonly PedidoMovimento[],
    sinal: 1 | -1,
    tipo: TipoMovimento,
    referenciaId: string | null,
  ): void {
    const data = new Date().toISOString();
    for (const pedido of pedidos) {
      const produto = this.repos.produtos.buscarPorId(pedido.produtoId);
      if (!produto) throw new ErroDeNegocio('Produto inexistente no movimento de estoque.');
      this.repos.produtos.atualizar({ ...produto, quantidadeEstoque: produto.quantidadeEstoque + sinal * pedido.quantidade });
    }
    this.repos.movimentos.inserirVarios(
      pedidos.map((p) => ({ produtoId: p.produtoId, tipo, quantidade: sinal * p.quantidade, referenciaId, data })),
    );
  }
}
