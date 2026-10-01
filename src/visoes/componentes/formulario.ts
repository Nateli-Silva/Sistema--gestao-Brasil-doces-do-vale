import type { ErrosPorCampo } from '../../dominio/erros.js';
import { html, type HtmlSeguro, type Interpolavel } from '../html.js';

/** Componentes de formulário com rótulo, mensagem de erro e valores preservados após falha. */

export type ValoresFormulario = Readonly<Record<string, string>>;

export interface ContextoFormulario {
  readonly valores: ValoresFormulario;
  readonly erros: ErrosPorCampo;
}

export const FORMULARIO_VAZIO: ContextoFormulario = { valores: {}, erros: {} };

interface OpcoesCampo {
  readonly nome: string;
  readonly rotulo: string;
  readonly tipo?: 'text' | 'number' | 'date' | 'email' | 'tel' | 'search';
  readonly placeholder?: string;
  readonly obrigatorio?: boolean;
  readonly atributos?: string;
  readonly ajuda?: string;
}

function envolver(nome: string, rotulo: string, obrigatorio: boolean, erro: string | undefined, controle: Interpolavel, ajuda?: string): HtmlSeguro {
  return html`<div class="campo ${erro ? 'campo--erro' : ''}">
    <label for="${nome}">${rotulo}${obrigatorio ? html`<span class="campo__obrigatorio" aria-hidden="true"> *</span>` : ''}</label>
    ${controle}
    ${erro ? html`<p class="campo__erro">${erro}</p>` : ajuda ? html`<p class="campo__ajuda">${ajuda}</p>` : ''}
  </div>`;
}

export function campoTexto(contexto: ContextoFormulario, opcoes: OpcoesCampo): HtmlSeguro {
  const erro = contexto.erros[opcoes.nome];
  const controle = html`<input id="${opcoes.nome}" name="${opcoes.nome}" type="${opcoes.tipo ?? 'text'}" value="${contexto.valores[opcoes.nome] ?? ''}" placeholder="${opcoes.placeholder ?? ''}" ${opcoes.obrigatorio ? 'required' : ''} ${erro ? 'aria-invalid="true"' : ''} ${opcoes.atributos ?? ''}>`;
  return envolver(opcoes.nome, opcoes.rotulo, opcoes.obrigatorio ?? false, erro, controle, opcoes.ajuda);
}

export interface OpcaoSelecao {
  readonly valor: string;
  readonly rotulo: string;
}

export function campoSelecao(contexto: ContextoFormulario, opcoes: Omit<OpcoesCampo, 'tipo' | 'placeholder'> & { opcoes: readonly OpcaoSelecao[]; vazio?: string }): HtmlSeguro {
  const erro = contexto.erros[opcoes.nome];
  const atual = contexto.valores[opcoes.nome] ?? '';
  const controle = html`<select id="${opcoes.nome}" name="${opcoes.nome}" ${opcoes.obrigatorio ? 'required' : ''} ${erro ? 'aria-invalid="true"' : ''}>
    ${opcoes.vazio !== undefined ? html`<option value="">${opcoes.vazio}</option>` : ''}
    ${opcoes.opcoes.map((o) => html`<option value="${o.valor}" ${o.valor === atual ? 'selected' : ''}>${o.rotulo}</option>`)}
  </select>`;
  return envolver(opcoes.nome, opcoes.rotulo, opcoes.obrigatorio ?? false, erro, controle, opcoes.ajuda);
}

export function campoAreaTexto(contexto: ContextoFormulario, opcoes: Pick<OpcoesCampo, 'nome' | 'rotulo' | 'placeholder'>): HtmlSeguro {
  const controle = html`<textarea id="${opcoes.nome}" name="${opcoes.nome}" rows="2" placeholder="${opcoes.placeholder ?? ''}">${contexto.valores[opcoes.nome] ?? ''}</textarea>`;
  return envolver(opcoes.nome, opcoes.rotulo, false, contexto.erros[opcoes.nome], controle);
}

export function acoesFormulario(textoEnviar: string, hrefCancelar: string): HtmlSeguro {
  return html`<div class="formulario__acoes"><a class="botao botao--suave" href="${hrefCancelar}">Cancelar</a><button class="botao botao--primario" type="submit">${textoEnviar}</button></div>`;
}
