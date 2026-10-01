import { botao, cabecalhoPagina, estadoVazio } from '../componentes/interface.js';
import { html, type HtmlSeguro } from '../html.js';

export function paginaErro(titulo: string, mensagem: string): HtmlSeguro {
  return html`${cabecalhoPagina(titulo, mensagem)}${estadoVazio('Que tal voltar ao início?', botao('Ir para o painel', '/'))}`;
}
