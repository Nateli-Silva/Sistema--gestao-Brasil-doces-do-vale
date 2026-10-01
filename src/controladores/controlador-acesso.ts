import type { Request, Response } from 'express';
import { destinoSeguro, encerrarSessao, type Autenticacao } from '../aplicacao/autenticacao.js';
import { lerCampos, texto } from '../utilitarios/formulario.js';
import { paginaSimples } from '../visoes/layout.js';
import { paginaEntrar } from '../visoes/paginas/acesso.js';

/** Tela de entrada, saída e verificação de saúde (rotas públicas, fora da proteção por senha). */
export class ControladorAcesso {
  constructor(private readonly autenticacao: Autenticacao | undefined) {}

  saude = (_req: Request, res: Response): void => {
    res.type('text').send('ok');
  };

  formularioEntrar = (req: Request, res: Response): void => {
    if (!this.autenticacao || this.autenticacao.autenticado(req)) {
      res.redirect(303, destinoSeguro(req.query.destino));
      return;
    }
    this.mostrar(res, destinoSeguro(req.query.destino));
  };

  entrar = (req: Request, res: Response): void => {
    const autenticacao = this.autenticacao;
    const campos = lerCampos(req.body);
    const destino = destinoSeguro(texto(campos, 'destino'));
    if (!autenticacao) {
      res.redirect(303, destino);
      return;
    }
    const espera = autenticacao.segundosBloqueado(req.ip ?? '');
    if (espera > 0) {
      this.mostrar(res, destino, `Muitas tentativas. Tente novamente em ${Math.ceil(espera / 60)} minuto(s).`, 429);
      return;
    }
    if (!autenticacao.senhaCorreta(texto(campos, 'senha'))) {
      autenticacao.registrarFalha(req.ip ?? '');
      this.mostrar(res, destino, 'Senha incorreta.', 401);
      return;
    }
    autenticacao.limparFalhas(req.ip ?? '');
    autenticacao.iniciarSessao(req, res);
    res.redirect(303, destino);
  };

  sair = (_req: Request, res: Response): void => {
    encerrarSessao(res);
    res.redirect(303, this.autenticacao ? '/entrar' : '/');
  };

  private mostrar(res: Response, destino: string, erro?: string, status = 200): void {
    res.status(status).type('html').send(paginaSimples('Entrar', paginaEntrar({ destino, erro })));
  }
}
