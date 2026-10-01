import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import { ErroNaoEncontrado } from '../dominio/erros.js';
import { criarRotas } from '../rotas/rotas.js';
import { paginaCompleta } from '../visoes/layout.js';
import { paginaErro } from '../visoes/paginas/erro.js';
import { ControladorAcesso } from '../controladores/controlador-acesso.js';
import type { Autenticacao } from './autenticacao.js';
import type { Servicos } from './container.js';

/** Monta a aplicação Express (sem abrir porta), o que facilita testes automatizados. */
export function criarAplicacao(servicos: Servicos, diretorioPublico: string, autenticacao?: Autenticacao): Application {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // atrás do proxy da hospedagem: IP e HTTPS corretos
  app.use((_req: Request, res: Response, proximo: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    proximo();
  });
  app.use(express.static(diretorioPublico)); // estilo e scripts não são sigilosos
  app.use(express.urlencoded({ extended: false }));

  // Rotas públicas: saúde (monitoramento da hospedagem), entrar e sair.
  const acesso = new ControladorAcesso(autenticacao);
  app.get('/saude', acesso.saude);
  app.get('/entrar', acesso.formularioEntrar);
  app.post('/entrar', acesso.entrar);
  app.post('/sair', acesso.sair);

  // Tudo abaixo exige a senha (quando configurada).
  if (autenticacao) app.use(autenticacao.proteger);
  app.use(criarRotas(servicos, autenticacao !== undefined));

  app.use((_req: Request, res: Response) => {
    res.status(404).type('html').send(paginaCompleta({ titulo: 'Página não encontrada', secao: 'painel', conteudo: paginaErro('Página não encontrada', 'O endereço que você abriu não existe.') }));
  });

  // Tratamento centralizado: registros inexistentes viram 404; o restante, 500 sem expor detalhes internos.
  app.use((erro: unknown, _req: Request, res: Response, _proximo: NextFunction) => {
    const naoEncontrado = erro instanceof ErroNaoEncontrado;
    if (!naoEncontrado) console.error(erro);
    res
      .status(naoEncontrado ? 404 : 500)
      .type('html')
      .send(
        paginaCompleta({
          titulo: 'Ops',
          secao: 'painel',
          conteudo: paginaErro(
            naoEncontrado ? 'Não encontrado' : 'Algo deu errado',
            naoEncontrado ? (erro as Error).message : 'Tente novamente em instantes.',
            naoEncontrado ? undefined : erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro),
          ),
        }),
      );
  });
  return app;
}
