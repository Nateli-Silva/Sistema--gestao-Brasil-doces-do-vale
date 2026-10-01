import type { Request, Response } from 'express';
import { ErroDeNegocio } from '../dominio/erros.js';
import type { ServicoBackup } from '../servicos/servico-backup.js';
import { hojeIso } from '../utilitarios/formatacao.js';
import { paginaBackup } from '../visoes/paginas/backup.js';
import { ControladorBase } from './controlador-base.js';

export class ControladorBackup extends ControladorBase {
  protected readonly secao = 'painel';
  constructor(
    private readonly backup: ServicoBackup,
    private readonly comSenha: boolean,
  ) {
    super();
  }

  exibir = (req: Request, res: Response): void => {
    this.renderizar(req, res, 'Backup', paginaBackup(this.backup.resumir(), this.comSenha), ['/js/backup.js']);
  };

  baixar = (_req: Request, res: Response): void => {
    res.setHeader('Content-Disposition', `attachment; filename="backup-brasil-doces-${hojeIso()}.json"`);
    res.type('application/json').send(JSON.stringify(this.backup.exportar(), null, 2));
  };

  /** Recebe o conteúdo do arquivo como JSON (enviado pelo navegador) e substitui os dados. */
  restaurar = (req: Request, res: Response): void => {
    try {
      const resumo = this.backup.restaurar(req.body);
      res.json({ ok: true, mensagem: `Dados restaurados: ${resumo.clientes} clientes, ${resumo.produtos} sabores, ${resumo.vendas} vendas.` });
    } catch (erro) {
      if (!(erro instanceof ErroDeNegocio)) throw erro;
      res.status(422).json({ ok: false, mensagem: erro.message });
    }
  };
}
