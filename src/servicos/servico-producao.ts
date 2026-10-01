import { ErroDeValidacao } from '../dominio/erros.js';
import type { Producao } from '../dominio/tipos.js';
import type { Repositorios } from '../repositorios/repositorios.js';
import { hojeIso } from '../utilitarios/formatacao.js';
import type { ServicoEstoque, PedidoMovimento } from './servico-estoque.js';

export interface DadosProducaoDiaria {
  readonly data: string;
  readonly observacao: string;
  /** Apenas itens com quantidade informada; chave de erro de cada linha é `quantidade_<produtoId>`. */
  readonly itens: readonly PedidoMovimento[];
}

/** Produção diária: cada lote registrado entra automaticamente no estoque. */
export class ServicoProducao {
  constructor(
    private readonly repos: Repositorios,
    private readonly estoque: ServicoEstoque,
  ) {}

  registrar(dados: DadosProducaoDiaria): Producao[] {
    this.validar(dados);
    const producoes = this.repos.producoes.inserirVarios(
      dados.itens.map((item) => ({ data: dados.data, produtoId: item.produtoId, quantidade: item.quantidade, observacao: dados.observacao })),
    );
    this.estoque.entrada(dados.itens, 'PRODUCAO', producoes[0]?.id ?? null);
    return producoes;
  }

  /** Produções de um dia, mais recentes primeiro. */
  listarDoDia(data: string): Producao[] {
    return this.repos.producoes
      .listar()
      .filter((p) => p.data === data)
      .reverse();
  }

  listarRecentes(limite: number): Producao[] {
    return [...this.repos.producoes.listar()].reverse().slice(0, limite);
  }

  totalProduzidoNoDia(data: string = hojeIso()): number {
    return this.listarDoDia(data).reduce((soma, p) => soma + p.quantidade, 0);
  }

  private validar(dados: DadosProducaoDiaria): void {
    const erros: Record<string, string> = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.data)) erros.data = 'Informe a data da produção.';
    else if (dados.data > hojeIso()) erros.data = 'A data não pode ser futura.';
    if (dados.itens.length === 0) erros.itens = 'Informe a quantidade produzida de ao menos um sabor.';
    for (const item of dados.itens) {
      if (!this.repos.produtos.buscarPorId(item.produtoId)) erros.itens = 'Há um sabor inexistente na lista.';
      else if (!Number.isInteger(item.quantidade) || item.quantidade <= 0) erros[`quantidade_${item.produtoId}`] = 'Quantidade inválida.';
    }
    if (Object.keys(erros).length > 0) throw new ErroDeValidacao(erros);
  }
}
