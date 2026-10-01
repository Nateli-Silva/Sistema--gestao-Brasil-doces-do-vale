import type { Categoria, Cliente, ItemVenda, MovimentoEstoque, Producao, Produto, Venda } from '../dominio/tipos.js';
import type { ArmazenamentoDados } from './armazenamento.js';
import { RepositorioJson } from './repositorio-json.js';

/** Conjunto de repositórios da aplicação, todos usando o mesmo armazenamento. */
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

/** Clientes gravados antes do arquivamento não tinham o campo "ativo": todos eram ativos. */
function normalizarCliente(cliente: Cliente): Cliente {
  return { ...cliente, ativo: (cliente as Partial<Pick<Cliente, 'ativo'>>).ativo ?? true };
}

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

export function criarRepositorios(armazenamento: ArmazenamentoDados): Repositorios {
  return {
    categorias: new RepositorioJson<Categoria>(armazenamento, 'categorias'),
    produtos: new RepositorioJson<Produto>(armazenamento, 'produtos'),
    movimentos: new RepositorioJson<MovimentoEstoque>(armazenamento, 'movimentos'),
    producoes: new RepositorioJson<Producao>(armazenamento, 'producoes'),
    clientes: new RepositorioJson<Cliente>(armazenamento, 'clientes', normalizarCliente),
    vendas: new RepositorioJson<Venda>(armazenamento, 'vendas', normalizarVenda),
  };
}
