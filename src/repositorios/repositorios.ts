import path from 'node:path';
import type { Categoria, Cliente, MovimentoEstoque, Producao, Produto, Venda } from '../dominio/tipos.js';
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

export function criarRepositorios(diretorioDados: string): Repositorios {
  const arquivo = (nome: string): string => path.join(diretorioDados, `${nome}.json`);
  return {
    categorias: new RepositorioJson<Categoria>(arquivo('categorias')),
    produtos: new RepositorioJson<Produto>(arquivo('produtos')),
    movimentos: new RepositorioJson<MovimentoEstoque>(arquivo('movimentos')),
    producoes: new RepositorioJson<Producao>(arquivo('producoes')),
    clientes: new RepositorioJson<Cliente>(arquivo('clientes')),
    vendas: new RepositorioJson<Venda>(arquivo('vendas')),
  };
}
