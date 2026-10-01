import path from 'node:path';
import serverless from 'serverless-http';
import { criarAplicacao } from '../aplicacao/aplicacao.js';
import { Autenticacao } from '../aplicacao/autenticacao.js';
import { criarServicos } from '../aplicacao/container.js';
import { ErroDeConflito, SessaoDeDados, type LojaDeBlobs } from './dados-nuvem.js';

/** Resposta no formato clássico de função (o que o serverless-http devolve). */
interface RespostaClassica {
  statusCode?: number;
  headers?: Record<string, string | number | boolean | readonly string[]>;
  multiValueHeaders?: Record<string, readonly string[]>;
  body?: string;
  isBase64Encoded?: boolean;
}

const SEM_CORPO = new Set([101, 204, 205, 304]);

const paginaSimples = (status: number, titulo: string, mensagem: string): Response =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title><link rel="stylesheet" href="/css/estilo.css"><body class="pagina-simples"><section class="entrada"><h1>${titulo}</h1><p class="subtitulo">${mensagem}</p><a class="botao botao--primario" href="/">Voltar ao início</a></section></body>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );

/** Converte a requisição moderna (Request) no evento que o Express/serverless-http entende. */
async function paraEvento(req: Request): Promise<Record<string, unknown>> {
  const url = new URL(req.url);
  const temCorpo = req.method !== 'GET' && req.method !== 'HEAD';
  return {
    httpMethod: req.method,
    path: url.pathname,
    rawUrl: req.url,
    queryStringParameters: Object.fromEntries(url.searchParams),
    headers: Object.fromEntries(req.headers),
    body: temCorpo ? await req.text() : null,
    isBase64Encoded: false,
  };
}

/** Converte a resposta do Express de volta para Response (preservando vários Set-Cookie). */
function paraResposta(resultado: RespostaClassica): Response {
  const status = resultado.statusCode ?? 200;
  const cabecalhos = new Headers();
  for (const [nome, valor] of Object.entries(resultado.headers ?? {})) {
    if (Array.isArray(valor)) valor.forEach((v) => cabecalhos.append(nome, String(v)));
    else cabecalhos.set(nome, String(valor));
  }
  for (const [nome, valores] of Object.entries(resultado.multiValueHeaders ?? {})) {
    cabecalhos.delete(nome);
    valores.forEach((v) => cabecalhos.append(nome, v));
  }
  const corpo = resultado.body ?? '';
  return new Response(SEM_CORPO.has(status) ? null : resultado.isBase64Encoded ? Buffer.from(corpo, 'base64') : corpo, { status, headers: cabecalhos });
}

/**
 * Função do Netlify: a cada requisição abre os dados, roda o sistema (Express) em memória
 * e grava o resultado no armazenamento do Netlify antes de responder.
 */
export function criarManipulador(obterLoja: () => LojaDeBlobs, senha: string | undefined) {
  // Em produção o sistema nunca fica aberto: sem senha configurada, nada é exibido.
  // Espaços ou quebras de linha invisíveis (comuns ao colar a senha no painel) não fazem parte dela.
  const senhaLimpa = senha?.trim();
  const autenticacao = senhaLimpa ? new Autenticacao(senhaLimpa) : undefined;
  const diretorioPublico = path.resolve('publico');

  return async (req: Request): Promise<Response> => {
    if (!autenticacao) return paginaSimples(500, 'Configuração incompleta', 'Defina a variável SENHA_ACESSO nas configurações do Netlify.');
    const sessao = await SessaoDeDados.abrir(obterLoja());
    const app = criarAplicacao(criarServicos(sessao.armazenamento), diretorioPublico, autenticacao);
    const resultado = (await serverless(app)(await paraEvento(req), {})) as RespostaClassica;
    try {
      await sessao.gravarSeAlterado();
    } catch (erro) {
      if (erro instanceof ErroDeConflito) {
        return paginaSimples(409, 'Tente de novo', 'Outra alteração foi salva ao mesmo tempo, então esta não foi gravada. Volte e repita a ação.');
      }
      throw erro;
    }
    return paraResposta(resultado);
  };
}
