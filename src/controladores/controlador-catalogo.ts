import type { Request, Response } from 'express';
import type { ServicoCatalogo } from '../servicos/servico-catalogo.js';
import { converterParaCentavos } from '../utilitarios/formatacao.js';
import { inteiro, lerCampos, texto } from '../utilitarios/formulario.js';
import { FORMULARIO_VAZIO, type ContextoFormulario } from '../visoes/componentes/formulario.js';
import { paginaCatalogo } from '../visoes/paginas/catalogo.js';
import { ControladorBase } from './controlador-base.js';

export class ControladorCatalogo extends ControladorBase {
  protected readonly secao = 'catalogo';
  constructor(private readonly catalogo: ServicoCatalogo) {
    super();
  }

  exibir = (req: Request, res: Response): void => {
    this.renderizarPagina(req, res, FORMULARIO_VAZIO);
  };

  cadastrarSabor = (req: Request, res: Response): void => {
    const campos = lerCampos(req.body);
    try {
      this.catalogo.cadastrarSabor({
        categoriaId: texto(campos, 'categoriaId'),
        sabor: texto(campos, 'sabor'),
        precoCentavos: converterParaCentavos(texto(campos, 'preco')),
        estoqueMinimo: texto(campos, 'estoqueMinimo') === '' ? 10 : inteiro(texto(campos, 'estoqueMinimo')),
      });
      this.redirecionar(res, '/catalogo', 'Sabor cadastrado com sucesso.');
    } catch (erro) {
      const { erros, erroGeral } = this.tratarFalha(erro);
      res.status(422);
      this.renderizarPagina(req, res, { valores: this.valoresPlanos(campos), erros }, erroGeral);
    }
  };

  atualizarSabor = (req: Request, res: Response): void => {
    const campos = lerCampos(req.body);
    try {
      this.catalogo.atualizarProduto(String(req.params.id), {
        precoCentavos: converterParaCentavos(texto(campos, 'preco')),
        estoqueMinimo: inteiro(texto(campos, 'estoqueMinimo')),
      });
      this.redirecionar(res, '/catalogo', 'Sabor atualizado.');
    } catch (erro) {
      const { erros, erroGeral } = this.tratarFalha(erro);
      this.redirecionar(res, '/catalogo', erroGeral ?? Object.values(erros)[0] ?? 'Não foi possível atualizar.');
    }
  };

  alternarAtivo = (req: Request, res: Response): void => {
    const produto = this.catalogo.alternarAtivo(String(req.params.id));
    this.redirecionar(res, '/catalogo', produto.ativo ? 'Sabor reativado.' : 'Sabor desativado.');
  };

  private renderizarPagina(req: Request, res: Response, formulario: ContextoFormulario, erroGeral?: string): void {
    this.renderizar(
      req,
      res,
      'Catálogo',
      paginaCatalogo({
        categorias: this.catalogo.listarCategorias(),
        produtos: this.catalogo.listarProdutos(),
        formulario,
        erroGeral,
      }),
    );
  }
}
