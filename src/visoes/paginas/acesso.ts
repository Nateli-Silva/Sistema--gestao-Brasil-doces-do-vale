import { html, type HtmlSeguro } from '../html.js';
import { logotipo } from '../componentes/icones.js';
import { alerta } from '../componentes/interface.js';

/** Conteúdo da tela de entrada (sem menu); usa `paginaSimples` do layout. */
export function paginaEntrar(opcoes: { erro?: string; destino: string }): HtmlSeguro {
  return html`<section class="entrada">
    <div class="entrada__marca">${logotipo(64)}<h1>Brasil Doces do Vale</h1><p class="subtitulo">Entre com a senha para acessar a gestão.</p></div>
    <form method="post" action="/entrar" class="formulario">
      ${opcoes.erro ? alerta(opcoes.erro) : ''}
      <input type="hidden" name="destino" value="${opcoes.destino}">
      <div class="campo">
        <label for="senha">Senha</label>
        <input id="senha" name="senha" type="password" autocomplete="current-password" required autofocus>
      </div>
      <button class="botao botao--primario" type="submit">Entrar</button>
    </form>
  </section>`;
}
