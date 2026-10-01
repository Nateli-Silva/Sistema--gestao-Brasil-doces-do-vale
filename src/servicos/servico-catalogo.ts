import { ErroDeNegocio, ErroDeValidacao, ErroNaoEncontrado, type ErrosPorCampo } from '../dominio/erros.js';
import type { Categoria, ChaveCategoria, Produto } from '../dominio/tipos.js';
import type { Repositorios } from '../repositorios/repositorios.js';

/** Categorias que existem desde a primeira execução, na ordem de exibição. */
const CATEGORIAS_INICIAIS: ReadonlyArray<{ chave: ChaveCategoria; nome: string }> = [
  { chave: 'trufas', nome: 'Trufas' },
  { chave: 'mini-trufas', nome: 'Mini Trufas' },
  { chave: 'cones-trufados', nome: 'Cones Trufados' },
  { chave: 'alfajor', nome: 'Alfajor' },
  { chave: 'brigadeiros', nome: 'Brigadeiros' },
];

export interface DadosNovoSabor {
  readonly categoriaId: string;
  readonly sabor: string;
  readonly precoCentavos: number;
  readonly estoqueMinimo: number;
}

export interface ProdutoDetalhado {
  readonly produto: Produto;
  readonly categoria: Categoria;
}

/** Catálogo: categorias fixas e sabores cadastrados dinamicamente pelo administrador. */
export class ServicoCatalogo {
  constructor(private readonly repos: Repositorios) {
    this.garantirCategoriasIniciais();
  }

  listarCategorias(): Categoria[] {
    return [...this.repos.categorias.listar()].sort((a, b) => a.ordem - b.ordem);
  }

  buscarCategoria(id: string): Categoria {
    const categoria = this.repos.categorias.buscarPorId(id);
    if (!categoria) throw new ErroNaoEncontrado('Categoria');
    return categoria;
  }

  buscarProduto(id: string): Produto {
    const produto = this.repos.produtos.buscarPorId(id);
    if (!produto) throw new ErroNaoEncontrado('Produto');
    return produto;
  }

  /** Produtos com categoria, ordenados por categoria e sabor. */
  listarProdutos(opcoes: { somenteAtivos?: boolean } = {}): ProdutoDetalhado[] {
    const categorias = new Map(this.listarCategorias().map((c) => [c.id, c]));
    const detalhados: ProdutoDetalhado[] = [];
    for (const produto of this.repos.produtos.listar()) {
      const categoria = categorias.get(produto.categoriaId);
      if (!categoria || (opcoes.somenteAtivos && !produto.ativo)) continue;
      detalhados.push({ produto, categoria });
    }
    return detalhados.sort(
      (a, b) => a.categoria.ordem - b.categoria.ordem || a.produto.sabor.localeCompare(b.produto.sabor, 'pt-BR'),
    );
  }

  /** Mapa id → produto detalhado, útil para telas que cruzam vendas e produtos (inclui inativos). */
  indexarProdutos(): Map<string, ProdutoDetalhado> {
    return new Map(this.listarProdutos().map((detalhe) => [detalhe.produto.id, detalhe]));
  }

  cadastrarSabor(dados: DadosNovoSabor): Produto {
    this.validarSabor(dados);
    return this.repos.produtos.inserir({ ...dados, sabor: dados.sabor.trim(), quantidadeEstoque: 0, ativo: true });
  }

  /** Edita nome do sabor, preço e estoque mínimo (a categoria não muda). */
  atualizarProduto(id: string, dados: Pick<DadosNovoSabor, 'sabor' | 'precoCentavos' | 'estoqueMinimo'>): Produto {
    const produto = this.buscarProduto(id);
    const erros: Record<string, string> = { ...this.errosNumericos(dados) };
    if (dados.sabor.trim().length < 2) erros.sabor = 'Informe o nome do sabor.';
    else if (this.saborJaExiste(produto.categoriaId, dados.sabor, id)) erros.sabor = 'Este sabor já existe nesta categoria.';
    if (Object.keys(erros).length > 0) throw new ErroDeValidacao(erros);
    return this.repos.produtos.atualizar({ ...produto, ...dados, sabor: dados.sabor.trim() });
  }

  /** Quantidade de registros (produção, movimentos e vendas) que referenciam o sabor. */
  contarUsos(id: string): number {
    return (
      this.repos.producoes.listar().filter((p) => p.produtoId === id).length +
      this.repos.movimentos.listar().filter((m) => m.produtoId === id).length +
      this.repos.vendas.listar().filter((v) => v.itens.some((i) => i.produtoId === id)).length
    );
  }

  /** Exclui um sabor sem histórico; se já foi produzido ou vendido, só pode ser desativado. */
  excluirProduto(id: string): void {
    const produto = this.buscarProduto(id);
    if (this.contarUsos(id) > 0) {
      throw new ErroDeNegocio(`"${produto.sabor}" já tem produção ou vendas registradas e não pode ser excluído. Use "Desativar" para escondê-lo das telas.`);
    }
    this.repos.produtos.remover(id);
  }

  alternarAtivo(id: string): Produto {
    const produto = this.buscarProduto(id);
    return this.repos.produtos.atualizar({ ...produto, ativo: !produto.ativo });
  }

  private validarSabor(dados: DadosNovoSabor): void {
    const erros: Record<string, string> = { ...this.errosNumericos(dados) };
    if (!this.repos.categorias.buscarPorId(dados.categoriaId)) erros.categoriaId = 'Escolha uma categoria.';
    if (dados.sabor.trim().length < 2) erros.sabor = 'Informe o nome do sabor.';
    else if (this.saborJaExiste(dados.categoriaId, dados.sabor)) erros.sabor = 'Este sabor já existe nesta categoria.';
    if (Object.keys(erros).length > 0) throw new ErroDeValidacao(erros);
  }

  private errosNumericos(dados: Pick<DadosNovoSabor, 'precoCentavos' | 'estoqueMinimo'>): ErrosPorCampo {
    const erros: Record<string, string> = {};
    if (!Number.isFinite(dados.precoCentavos) || dados.precoCentavos <= 0) erros.preco = 'Informe um preço válido.';
    if (!Number.isInteger(dados.estoqueMinimo) || dados.estoqueMinimo < 0) erros.estoqueMinimo = 'Informe um número inteiro.';
    return erros;
  }

  private saborJaExiste(categoriaId: string, sabor: string, ignorarId: string | null = null): boolean {
    const alvo = sabor.trim().toLocaleLowerCase('pt-BR');
    return this.repos.produtos
      .listar()
      .some((p) => p.id !== ignorarId && p.categoriaId === categoriaId && p.sabor.toLocaleLowerCase('pt-BR') === alvo);
  }

  private garantirCategoriasIniciais(): void {
    if (this.repos.categorias.listar().length > 0) return;
    this.repos.categorias.inserirVarios(CATEGORIAS_INICIAIS.map((c, ordem) => ({ ...c, ordem })));
  }
}
