import { ErroDeNegocio } from '../dominio/erros.js';
import type { MovimentoEstoque, Produto, TipoMovimento } from '../dominio/tipos.js';
import type { Repositorios } from '../repositorios/repositorios.js';

export interface PedidoMovimento {
  readonly produtoId: string;
  readonly quantidade: number;
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
