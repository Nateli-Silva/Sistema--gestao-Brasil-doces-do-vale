import { botao, cabecalhoPagina, estadoVazio } from '../componentes/interface.js';
import { html, type HtmlSeguro } from '../html.js';

/** Página de erro amigável; `detalhe` (opcional) mostra o motivo técnico para facilitar o suporte. */
export function paginaErro(titulo: string, mensagem: string, detalhe?: string): HtmlSeguro {
  return html`${cabecalhoPagina(titulo, mensagem)}
  ${estadoVazio('Que tal voltar ao início?', botao('Ir para o painel', '/'))}
  ${detalhe ? html`<details class="recolhivel"><summary>Detalhes técnicos</summary><pre class="detalhe-erro">${detalhe}</pre></details>` : ''}`;
}
