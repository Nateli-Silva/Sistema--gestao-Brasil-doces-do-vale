import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const NOME_COOKIE = 'sessao';
const DURACAO_SESSAO_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_FALHAS = 5;
const JANELA_BLOQUEIO_MS = 15 * 60 * 1000;

/** Destino interno seguro após o login (evita redirecionar para outro site). */
export function destinoSeguro(destino: unknown): string {
  return typeof destino === 'string' && destino.startsWith('/') && !destino.startsWith('//') && !destino.startsWith('/entrar') ? destino : '/';
}

function lerCookie(req: Request, nome: string): string | undefined {
  const bruto = req.headers.cookie;
  if (!bruto) return undefined;
  for (const parte of bruto.split(';')) {
    const [chave, ...resto] = parte.trim().split('=');
    if (chave === nome) return decodeURIComponent(resto.join('='));
  }
  return undefined;
}

/**
 * Acesso por senha única, com sessão em cookie assinado (HMAC) e limite de tentativas por IP.
 * Sem dependências externas; adequado a uma doceria com poucos usuários que compartilham a senha.
 */
export class Autenticacao {
  private readonly chave: Buffer;
  private readonly hashSenha: Buffer;
  private readonly falhas = new Map<string, { quantidade: number; ate: number }>();

  constructor(senha: string) {
    this.hashSenha = crypto.createHash('sha256').update(senha).digest();
    // A chave deriva da senha: trocar a senha encerra todas as sessões abertas.
    this.chave = crypto.createHash('sha256').update(`brasil-doces-do-vale:${senha}`).digest();
  }

  senhaCorreta(tentativa: string): boolean {
    return crypto.timingSafeEqual(crypto.createHash('sha256').update(tentativa).digest(), this.hashSenha);
  }

  /** Valor do cookie: "<expira>.<assinatura>". */
  emitirSessao(agora = Date.now()): string {
    const expira = String(agora + DURACAO_SESSAO_MS);
    return `${expira}.${this.assinar(expira)}`;
  }

  sessaoValida(valor: string | undefined, agora = Date.now()): boolean {
    if (!valor) return false;
    const [expira = '', assinatura = ''] = valor.split('.');
    const esperada = Buffer.from(this.assinar(expira));
    const recebida = Buffer.from(assinatura);
    return recebida.length === esperada.length && crypto.timingSafeEqual(recebida, esperada) && Number(expira) > agora;
  }

  /** Segundos restantes de bloqueio para o IP (0 se liberado). */
  segundosBloqueado(ip: string, agora = Date.now()): number {
    const registro = this.falhas.get(ip);
    return registro && registro.quantidade >= MAX_FALHAS && registro.ate > agora ? Math.ceil((registro.ate - agora) / 1000) : 0;
  }

  registrarFalha(ip: string, agora = Date.now()): void {
    const atual = this.falhas.get(ip);
    const vigente = atual && atual.ate > agora ? atual : undefined;
    this.falhas.set(ip, { quantidade: (vigente?.quantidade ?? 0) + 1, ate: agora + JANELA_BLOQUEIO_MS });
  }

  limparFalhas(ip: string): void {
    this.falhas.delete(ip);
  }

  iniciarSessao(req: Request, res: Response): void {
    res.cookie(NOME_COOKIE, this.emitirSessao(), { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: DURACAO_SESSAO_MS, path: '/' });
  }

  autenticado(req: Request): boolean {
    return this.sessaoValida(lerCookie(req, NOME_COOKIE));
  }

  /** Middleware: sem sessão válida, envia para a tela de entrada. */
  proteger = (req: Request, res: Response, proximo: NextFunction): void => {
    if (this.autenticado(req)) {
      res.setHeader('Cache-Control', 'no-store');
      proximo();
      return;
    }
    const destino = req.method === 'GET' ? `?destino=${encodeURIComponent(req.originalUrl)}` : '';
    res.redirect(303, `/entrar${destino}`);
  };

  private assinar(valor: string): string {
    return crypto.createHmac('sha256', this.chave).update(valor).digest('hex');
  }
}

export function encerrarSessao(res: Response): void {
  res.clearCookie(NOME_COOKIE, { path: '/' });
}
