import type { Request, Response } from 'express';
import type { ServicoCatalogo } from '../servicos/servico-catalogo.js';
import type { ServicoProducao } from '../servicos/servico-producao.js';
import { hojeIso } from '../utilitarios/formatacao.js';
import { inteiro, lerCampos, texto, type CamposFormulario } from '../utilitarios/formulario.js';
import type { ContextoFormulario } from '../visoes/componentes/formulario.js';
import { paginaProducao } from '../visoes/paginas/producao.js';
import { ControladorBase } from './controlador-base.js';

const PREFIXO_QUANTIDADE = 'quantidade_';

export class ControladorProducao extends ControladorBase {
  protected readonly secao = 'producao';
  constructor(
    private readonly producao: ServicoProducao,
    private readonly catalogo: ServicoCatalogo,
  ) {
    super();
  }

  exibir = (req: Request, res: Response): void => {
    this.renderizarPagina(req, res, { valores: { data: hojeIso() }, erros: {} });
  };

  registrar = (req: Request, res: Response): void => {
    const campos = lerCampos(req.body);
    try {
      const producoes = this.producao.registrar({
        data: texto(campos, 'data'),
        observacao: texto(campos, 'observacao'),
        itens: this.extrairItens(campos),
      });
      const total = producoes.reduce((soma, p) => soma + p.quantidade, 0);
      this.redirecionar(res, '/producao', `Produção registrada: ${total} unidades adicionadas ao estoque.`);
    } catch (erro) {
      const { erros, erroGeral } = this.tratarFalha(erro);
      res.status(422);
      this.renderizarPagina(req, res, { valores: this.valoresPlanos(campos), erros }, erroGeral);
    }
  };

  /** Linhas `quantidade_<produtoId>` preenchidas (vazio ou 0 é ignorado; valor inválido segue para validação). */
  private extrairItens(campos: CamposFormulario): Array<{ produtoId: string; quantidade: number }> {
    return Object.keys(campos)
      .filter((nome) => nome.startsWith(PREFIXO_QUANTIDADE) && texto(campos, nome) !== '' && texto(campos, nome) !== '0')
      .map((nome) => ({ produtoId: nome.slice(PREFIXO_QUANTIDADE.length), quantidade: inteiro(texto(campos, nome)) }));
  }

  private renderizarPagina(req: Request, res: Response, formulario: ContextoFormulario, erroGeral?: string): void {
    this.renderizar(
      req,
      res,
      'Produção',
      paginaProducao({
        produtos: this.catalogo.listarProdutos({ somenteAtivos: true }),
        recentes: this.producao.listarRecentes(15),
        indice: this.catalogo.indexarProdutos(),
        formulario,
        erroGeral,
      }),
    );
  }
}
