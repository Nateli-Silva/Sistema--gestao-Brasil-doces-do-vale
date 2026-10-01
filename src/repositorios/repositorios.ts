import path from 'node:path';
import type { Categoria, Cliente, ItemVenda, MovimentoEstoque, Producao, Produto, Venda } from '../dominio/tipos.js';
import { RepositorioJson } from './repositorio-json.js';

/** Conjunto de repositórios da aplicação, todos gravados no mesmo diretório de dados. */
export interface Repositorios {
  readonly categorias: RepositorioJson<Categoria>;
  readonly produtos: RepositorioJson<Produto>;
  readonly movimentos: RepositorioJson<MovimentoEstoque>;
  readonly producoes: RepositorioJson<Producao>;
  readonly clientes: RepositorioJson<Cliente>;
  readonly vendas: RepositorioJson<Venda>;
}

/** Item como gravado antes das caixas: só unidades e preço unitário. */
type ItemVendaAntigo = Pick<ItemVenda, 'produtoId' | 'quantidade' | 'precoUnitarioCentavos'> & Partial<ItemVenda>;

function normalizarVenda(venda: Venda): Venda {
  return {
    ...venda,
    itens: (venda.itens as readonly ItemVendaAntigo[]).map(
      (item): ItemVenda => ({
        produtoId: item.produtoId,
        formato: item.formato ?? 'UNIDADE',
        quantidade: item.quantidade,
        caixas: item.caixas ?? null,
        unidadesPorCaixa: item.unidadesPorCaixa ?? null,
        subtotalCentavos: item.subtotalCentavos ?? item.quantidade * item.precoUnitarioCentavos,
        precoUnitarioCentavos: item.precoUnitarioCentavos,
      }),
    ),
  };
}

export function criarRepositorios(diretorioDados: string): Repositorios {
  const arquivo = (nome: string): string => path.join(diretorioDados, `${nome}.json`);
  return {
    categorias: new RepositorioJson<Categoria>(arquivo('categorias')),
    produtos: new RepositorioJson<Produto>(arquivo('produtos')),
    movimentos: new RepositorioJson<MovimentoEstoque>(arquivo('movimentos')),
    producoes: new RepositorioJson<Producao>(arquivo('producoes')),
    clientes: new RepositorioJson<Cliente>(arquivo('clientes')),
    vendas: new RepositorioJson<Venda>(arquivo('vendas'), normalizarVenda),
  };
}
