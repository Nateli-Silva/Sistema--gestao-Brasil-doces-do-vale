import { criarRepositorios, type Repositorios } from '../repositorios/repositorios.js';
import { ServicoCatalogo } from '../servicos/servico-catalogo.js';
import { ServicoCliente } from '../servicos/servico-cliente.js';
import { ServicoEstoque } from '../servicos/servico-estoque.js';
import { ServicoPainel } from '../servicos/servico-painel.js';
import { ServicoProducao } from '../servicos/servico-producao.js';
import { ServicoVenda } from '../servicos/servico-venda.js';

/** Raiz de composição: instancia e conecta repositórios e serviços (injeção de dependências manual). */
export interface Servicos {
  readonly repositorios: Repositorios;
  readonly catalogo: ServicoCatalogo;
  readonly estoque: ServicoEstoque;
  readonly producao: ServicoProducao;
  readonly clientes: ServicoCliente;
  readonly vendas: ServicoVenda;
  readonly painel: ServicoPainel;
}

export function criarServicos(diretorioDados: string): Servicos {
  const repositorios = criarRepositorios(diretorioDados);
  const catalogo = new ServicoCatalogo(repositorios);
  const estoque = new ServicoEstoque(repositorios);
  const producao = new ServicoProducao(repositorios, estoque);
  const clientes = new ServicoCliente(repositorios);
  const vendas = new ServicoVenda(repositorios, estoque);
  const painel = new ServicoPainel(repositorios, catalogo, estoque, producao, vendas);
  return { repositorios, catalogo, estoque, producao, clientes, vendas, painel };
}
