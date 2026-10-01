import type { Request, Response } from 'express';
import type { ServicoCatalogo } from '../servicos/servico-catalogo.js';
import type { ServicoProducao } from '../servicos/servico-producao.js';
import { hojeIso } from '../utilitarios/formatacao.js';
import { inteiro, lerCampos, lista, texto, type CamposFormulario } from '../utilitarios/formulario.js';
import type { ContextoFormulario } from '../visoes/componentes/formulario.js';
import { paginaProducao } from '../visoes/paginas/producao.js';
import { ControladorBase } from './controlador-base.js';

type LinhaFormulario = { produtoId: string; quantidade: string };

export class ControladorProducao extends ControladorBase {
  protected readonly secao = 'producao';
  constructor(
    private readonly producao: ServicoProducao,
    private readonly catalogo: ServicoCatalogo,
  ) {
    super();
  }

  exibir = (req: Request, res: Response): void => {
    this.renderizarPagina(req, res, { valores: { data: hojeIso() }, erros: {} }, []);
  };

  registrar = (req: Request, res: Response): void => {
    const campos = lerCampos(req.body);
    const linhas = this.lerLinhas(campos);
    try {
      const producoes = this.producao.registrar({
        data: texto(campos, 'data'),
        observacao: texto(campos, 'observacao'),
        itens: linhas.map((l) => ({ produtoId: l.produtoId, quantidade: inteiro(l.quantidade) })),
      });
      const total = producoes.reduce((soma, p) => soma + p.quantidade, 0);
      this.redirecionar(res, '/producao', `Produção registrada: ${total} unidades adicionadas ao estoque.`);
    } catch (erro) {
      const { erros, erroGeral } = this.tratarFalha(erro);
      res.status(422);
      this.renderizarPagina(req, res, { valores: this.valoresPlanos(campos), erros }, linhas, erroGeral);
    }
  };

  /** Pareia as listas `produtoId` e `quantidade`; linhas sem sabor escolhido são ignoradas. */
  private lerLinhas(campos: CamposFormulario): LinhaFormulario[] {
    const quantidades = lista(campos, 'quantidade');
    return lista(campos, 'produtoId')
      .map((produtoId, i) => ({ produtoId, quantidade: quantidades[i] ?? '' }))
      .filter((l) => l.produtoId !== '');
  }

  private renderizarPagina(req: Request, res: Response, formulario: ContextoFormulario, linhas: LinhaFormulario[], erroGeral?: string): void {
    this.renderizar(
      req,
      res,
      'Produção',
      paginaProducao({
        categorias: this.catalogo.listarCategorias(),
        linhas: linhas.length > 0 ? linhas : [{ produtoId: '', quantidade: '' }],
        produtos: this.catalogo.listarProdutos({ somenteAtivos: true }),
        recentes: this.producao.listarRecentes(15),
        indice: this.catalogo.indexarProdutos(),
        formulario,
        erroGeral,
      }),
      ['/js/producao.js'],
    );
  }
}
