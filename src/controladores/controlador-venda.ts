import type { Request, Response } from 'express';
import type { ServicoCatalogo } from '../servicos/servico-catalogo.js';
import type { ServicoCliente } from '../servicos/servico-cliente.js';
import type { ServicoVenda } from '../servicos/servico-venda.js';
import { inteiro, lerCampos, lista, texto, type CamposFormulario } from '../utilitarios/formulario.js';
import { FORMULARIO_VAZIO, type ContextoFormulario } from '../visoes/componentes/formulario.js';
import { paginaDetalheVenda, paginaFormularioVenda, paginaListaVendas } from '../visoes/paginas/vendas.js';
import { ControladorBase } from './controlador-base.js';

type LinhaFormulario = { produtoId: string; quantidade: string };

export class ControladorVenda extends ControladorBase {
  protected readonly secao = 'vendas';
  constructor(
    private readonly vendas: ServicoVenda,
    private readonly clientes: ServicoCliente,
    private readonly catalogo: ServicoCatalogo,
  ) {
    super();
  }

  listar = (req: Request, res: Response): void => {
    this.renderizar(
      req,
      res,
      'Vendas',
      paginaListaVendas({
        vendas: this.vendas.listar(),
        clientes: new Map(this.clientes.listar().map((c) => [c.id, c])),
        indice: this.catalogo.indexarProdutos(),
      }),
    );
  };

  exibir = (req: Request, res: Response): void => {
    const venda = this.vendas.buscarPorId(String(req.params.id));
    const cliente = this.clientes.listar().find((c) => c.id === venda.clienteId);
    this.renderizar(req, res, 'Venda', paginaDetalheVenda({ venda, cliente, indice: this.catalogo.indexarProdutos() }));
  };

  formularioNovo = (req: Request, res: Response): void => {
    const cliente = typeof req.query.cliente === 'string' ? req.query.cliente : '';
    this.renderizarFormulario(req, res, { valores: { clienteId: cliente, formaPagamento: 'PIX' }, erros: {} }, [{ produtoId: '', quantidade: '1' }]);
  };

  registrar = (req: Request, res: Response): void => {
    const campos = lerCampos(req.body);
    const linhas = this.lerLinhas(campos);
    try {
      const venda = this.vendas.registrar({
        clienteId: texto(campos, 'clienteId'),
        formaPagamento: texto(campos, 'formaPagamento'),
        observacao: texto(campos, 'observacao'),
        itens: linhas.filter((l) => l.produtoId !== '').map((l) => ({ produtoId: l.produtoId, quantidade: inteiro(l.quantidade) })),
      });
      this.redirecionar(res, `/vendas/${venda.id}`, 'Venda registrada e estoque atualizado.');
    } catch (erro) {
      const { erros, erroGeral } = this.tratarFalha(erro);
      res.status(422);
      this.renderizarFormulario(req, res, { valores: this.valoresPlanos(campos), erros }, linhas, erroGeral);
    }
  };

  /** Pareia as listas `produtoId` e `quantidade` enviadas pelas linhas de itens. */
  private lerLinhas(campos: CamposFormulario): LinhaFormulario[] {
    const produtos = lista(campos, 'produtoId');
    const quantidades = lista(campos, 'quantidade');
    return produtos.map((produtoId, i) => ({ produtoId, quantidade: quantidades[i] ?? '' }));
  }

  private renderizarFormulario(req: Request, res: Response, formulario: ContextoFormulario = FORMULARIO_VAZIO, linhas: LinhaFormulario[], erroGeral?: string): void {
    this.renderizar(
      req,
      res,
      'Nova venda',
      paginaFormularioVenda({
        clientes: this.clientes.listar(),
        produtos: this.catalogo.listarProdutos({ somenteAtivos: true }),
        linhas: linhas.length > 0 ? linhas : [{ produtoId: '', quantidade: '1' }],
        formulario,
        erroGeral,
      }),
      ['/js/venda.js'],
    );
  }
}
