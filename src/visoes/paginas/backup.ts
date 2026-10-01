import type { ResumoDados } from '../../servicos/servico-backup.js';
import { formatarInteiro } from '../../utilitarios/formatacao.js';
import { botao, cabecalhoPagina, cartao } from '../componentes/interface.js';
import { html, type HtmlSeguro } from '../html.js';

export function paginaBackup(resumo: ResumoDados, comSenha: boolean): HtmlSeguro {
  const linhas: ReadonlyArray<[string, number]> = [
    ['Clientes', resumo.clientes],
    ['Sabores', resumo.produtos],
    ['Vendas', resumo.vendas],
    ['Lotes de produção', resumo.producoes],
  ];
  return html`${cabecalhoPagina('Backup', 'Guarde uma cópia dos seus dados e restaure quando precisar.')}
  ${cartao('Seus dados hoje', html`<dl class="dados">${linhas.map(([rotulo, total]) => html`<div><dt>${rotulo}</dt><dd>${formatarInteiro(total)}</dd></div>`)}</dl>`)}
  ${cartao('Baixar cópia de segurança', html`<p class="subtitulo">Gera um arquivo com todos os clientes, sabores, estoque, produção e vendas. Faça isso com frequência e guarde no seu celular ou e-mail.</p>
    <div class="formulario__acoes">${botao('Baixar cópia agora', '/backup/baixar')}</div>`)}
  ${cartao('Restaurar uma cópia', html`<form class="formulario" data-restaurar>
      <p class="subtitulo"><strong>Atenção:</strong> isso substitui TODOS os dados atuais pelos do arquivo. O sistema guarda uma cópia do que existia antes, por segurança.</p>
      <div class="campo"><label for="arquivo">Arquivo da cópia (.json)</label><input id="arquivo" type="file" accept="application/json,.json" required></div>
      <p class="campo__erro" data-resultado role="status"></p>
      <div class="formulario__acoes"><button class="botao botao--perigo" type="submit">Restaurar</button></div>
    </form>`)}
  ${comSenha ? cartao('Sessão', html`<form method="post" action="/sair"><button class="botao botao--suave" type="submit">Sair do sistema</button></form>`) : ''}`;
}
