import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import { ErroNaoEncontrado } from '../dominio/erros.js';
import { criarRotas } from '../rotas/rotas.js';
import { paginaCompleta } from '../visoes/layout.js';
import { paginaErro } from '../visoes/paginas/erro.js';
import type { Servicos } from './container.js';

/** Monta a aplicação Express (sem abrir porta), o que facilita testes automatizados. */
export function criarAplicacao(servicos: Servicos, diretorioPublico: string): Application {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.static(diretorioPublico));
  app.use(express.urlencoded({ extended: false }));
  app.use(criarRotas(servicos));

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
