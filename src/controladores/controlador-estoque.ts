import type { Request, Response } from 'express';
import type { ServicoCatalogo } from '../servicos/servico-catalogo.js';
import type { ServicoEstoque } from '../servicos/servico-estoque.js';
import { paginaEstoque } from '../visoes/paginas/estoque.js';
import { ControladorBase } from './controlador-base.js';

export class ControladorEstoque extends ControladorBase {
  protected readonly secao = 'estoque';
  constructor(
    private readonly estoque: ServicoEstoque,
    private readonly catalogo: ServicoCatalogo,
  ) {
    super();
  }

  /** Aceita `?categoria=<id>` e `?sabor=<id>`; valores inválidos são ignorados. */
  exibir = (req: Request, res: Response): void => {
    const produtos = this.catalogo.listarProdutos({ somenteAtivos: true });
    const categorias = this.catalogo.listarCategorias();
    const sabor = produtos.find((p) => p.produto.id === req.query.sabor);
    const categoria = categorias.find((c) => c.id === (sabor?.categoria.id ?? req.query.categoria));

    this.renderizar(
      req,
      res,
      'Estoque',
      paginaEstoque({
        categorias,
        produtos,
        categoriaSelecionada: categoria,
        saborSelecionado: sabor,
        resumoSabor: sabor ? this.estoque.resumirSabor(sabor.produto.id) : undefined,
        produzidoPorSabor: this.estoque.totalProduzidoPorSabor(),
        movimentos: this.estoque.listarMovimentosRecentes(8),
        indice: this.catalogo.indexarProdutos(),
      }),
    );
  };
}
