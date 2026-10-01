import type { Request, Response } from 'express';
import type { ServicoFaturamento } from '../servicos/servico-faturamento.js';
import { GRANULARIDADES, type Granularidade } from '../utilitarios/periodos.js';
import { hojeIso } from '../utilitarios/formatacao.js';
import { paginaFaturamento } from '../visoes/paginas/faturamento.js';
import { ControladorBase } from './controlador-base.js';

export class ControladorFaturamento extends ControladorBase {
  protected readonly secao = 'faturamento';
  constructor(private readonly faturamento: ServicoFaturamento) {
    super();
  }

  /** `?periodo=dia|semana|mes|ano` escolhe o detalhamento; o padrão é o mês. */
  exibir = (req: Request, res: Response): void => {
    const pedido = req.query.periodo;
    const selecionado: Granularidade = GRANULARIDADES.find((g) => g === pedido) ?? 'mes';
    const hoje = hojeIso();
    const resumos = GRANULARIDADES.map((g) => this.faturamento.resumir(g, hoje));
    const resumoSelecionado = resumos.find((r) => r.granularidade === selecionado) ?? resumos[2];

    this.renderizar(
      req,
      res,
      'Faturamento',
      paginaFaturamento({
        hoje,
        selecionado,
        resumos,
        serie: this.faturamento.serie(selecionado, hoje),
        formasPagamento: resumoSelecionado ? this.faturamento.porFormaPagamento(resumoSelecionado.periodo) : [],
      }),
    );
  };
}
