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

  exibir = (req: Request, res: Response): void => {
    this.renderizar(
      req,
      res,
      'Estoque',
      paginaEstoque({
        produtos: this.catalogo.listarProdutos({ somenteAtivos: true }),
        movimentos: this.estoque.listarMovimentosRecentes(12),
        indice: this.catalogo.indexarProdutos(),
      }),
    );
  };
}
