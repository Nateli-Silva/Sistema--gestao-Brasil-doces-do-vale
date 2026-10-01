import type { Request, Response } from 'express';
import type { ServicoPainel } from '../servicos/servico-painel.js';
import { paginaPainel } from '../visoes/paginas/painel.js';
import { ControladorBase } from './controlador-base.js';

export class ControladorPainel extends ControladorBase {
  protected readonly secao = 'painel';
  constructor(private readonly painel: ServicoPainel) {
    super();
  }

  exibir = (req: Request, res: Response): void => {
    this.renderizar(req, res, 'Painel', paginaPainel(this.painel.montar()));
  };
}
