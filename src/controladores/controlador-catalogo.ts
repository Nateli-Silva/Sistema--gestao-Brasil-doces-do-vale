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

  /** Aceita `?categoria=<id>` e `?sabor=<id>`; valores inválidos são ignorados. */
  exibir = (req: Request, res: Response): void => {
    this.renderizarPagina(req, res, FORMULARIO_VAZIO);
  };

  cadastrarSabor = (req: Request, res: Response): void => {
    const campos = lerCampos(req.body);
    try {
      const novo = this.catalogo.cadastrarSabor({
        categoriaId: texto(campos, 'categoriaId'),
        sabor: texto(campos, 'sabor'),
        precoCentavos: converterParaCentavos(texto(campos, 'preco')),
        estoqueMinimo: texto(campos, 'estoqueMinimo') === '' ? 10 : inteiro(texto(campos, 'estoqueMinimo')),
      });
      this.redirecionar(res, `/catalogo?sabor=${novo.id}`, 'Sabor cadastrado com sucesso.');
    } catch (erro) {
      const { erros, erroGeral } = this.tratarFalha(erro);
      res.status(422);
      this.renderizarPagina(req, res, { valores: this.valoresPlanos(campos), erros }, erroGeral);
    }
  };

  atualizarSabor = (req: Request, res: Response): void => {
    const campos = lerCampos(req.body);
    const id = String(req.params.id);
    try {
      this.catalogo.atualizarProduto(id, {
        sabor: texto(campos, 'sabor'),
        precoCentavos: converterParaCentavos(texto(campos, 'preco')),
        estoqueMinimo: inteiro(texto(campos, 'estoqueMinimo')),
      });
      this.redirecionar(res, `/catalogo?sabor=${id}`, 'Sabor atualizado.');
    } catch (erro) {
      const { erros, erroGeral } = this.tratarFalha(erro);
      this.redirecionar(res, `/catalogo?sabor=${id}`, erroGeral ?? Object.values(erros)[0] ?? 'Não foi possível atualizar.');
    }
  };

  excluirSabor = (req: Request, res: Response): void => {
    const id = String(req.params.id);
    const categoriaId = this.catalogo.buscarProduto(id).categoriaId;
    try {
      this.catalogo.excluirProduto(id);
      this.redirecionar(res, `/catalogo?categoria=${categoriaId}`, 'Sabor excluído.');
    } catch (erro) {
      const { erroGeral } = this.tratarFalha(erro);
      this.redirecionar(res, `/catalogo?sabor=${id}`, erroGeral ?? 'Não foi possível excluir.');
    }
  };

  alternarAtivo = (req: Request, res: Response): void => {
    const produto = this.catalogo.alternarAtivo(String(req.params.id));
    this.redirecionar(res, `/catalogo?sabor=${produto.id}`, produto.ativo ? 'Sabor reativado.' : 'Sabor desativado.');
  };

  private renderizarPagina(req: Request, res: Response, formulario: ContextoFormulario, erroGeral?: string): void {
    const produtos = this.catalogo.listarProdutos();
    const categorias = this.catalogo.listarCategorias();
    const sabor = produtos.find((p) => p.produto.id === req.query.sabor);
    const categoria = categorias.find((c) => c.id === (sabor?.categoria.id ?? req.query.categoria));
    this.renderizar(
      req,
      res,
      'Catálogo',
      paginaCatalogo({ categorias, produtos, categoriaSelecionada: categoria, saborSelecionado: sabor, formulario, erroGeral }),
      ['/js/busca-sabor.js'],
    );
  }
}
