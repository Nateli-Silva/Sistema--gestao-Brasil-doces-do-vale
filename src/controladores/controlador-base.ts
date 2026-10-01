import type { Request, Response } from 'express';
import { ErroDeNegocio, ErroDeValidacao, type ErrosPorCampo } from '../dominio/erros.js';
import type { Interpolavel } from '../visoes/html.js';
import { paginaCompleta, type SecaoMenu } from '../visoes/layout.js';
import type { ValoresFormulario } from '../visoes/componentes/formulario.js';
import type { CamposFormulario } from '../utilitarios/formulario.js';

export interface ResultadoFalha {
  readonly erros: ErrosPorCampo;
  readonly erroGeral: string | undefined;
}

/** Comportamentos comuns a todos os controladores: renderização, redirecionamento e tratamento de erros. */
export abstract class ControladorBase {
  protected abstract readonly secao: SecaoMenu;

  protected renderizar(req: Request, res: Response, titulo: string, conteudo: Interpolavel, scripts: readonly string[] = []): void {
    const aviso = typeof req.query.aviso === 'string' ? req.query.aviso : undefined;
    res.type('html').send(paginaCompleta({ titulo, secao: this.secao, conteudo, aviso, scripts }));
  }

  protected redirecionar(res: Response, destino: string, aviso?: string): void {
    const separador = destino.includes('?') ? '&' : '?';
    res.redirect(303, aviso ? `${destino}${separador}aviso=${encodeURIComponent(aviso)}` : destino);
  }

  /**
   * Converte uma exceção em dados de formulário. Erros de validação trazem mensagens por campo;
   * outros erros de negócio viram mensagem geral; qualquer outro erro é relançado (HTTP 500).
   */
  protected tratarFalha(erro: unknown): ResultadoFalha {
    if (erro instanceof ErroDeValidacao) return { erros: erro.erros, erroGeral: erro.erros.itens ? undefined : erro.message };
    if (erro instanceof ErroDeNegocio) return { erros: {}, erroGeral: erro.message };
    throw erro;
  }

  /** Primeiro valor de cada campo, para reapresentar o formulário após um erro. */
  protected valoresPlanos(campos: CamposFormulario): ValoresFormulario {
    return Object.fromEntries(Object.entries(campos).map(([nome, valor]) => [nome, (Array.isArray(valor) ? valor[0] : valor) ?? '']));
  }
}
