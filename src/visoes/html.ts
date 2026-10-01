/**
 * Mini motor de templates: a função `html` escapa automaticamente todo valor interpolado,
 * exceto fragmentos já marcados como seguros (resultado de outro `html` ou `bruto`).
 */

export class HtmlSeguro {
  constructor(readonly valor: string) {}
  toString(): string {
    return this.valor;
  }
}

export type Interpolavel = string | number | boolean | null | undefined | HtmlSeguro | readonly Interpolavel[];

const ENTIDADES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ENTIDADES[c] ?? c);
}

function converter(valor: Interpolavel): string {
  if (valor === null || valor === undefined || valor === false || valor === true) return '';
  if (valor instanceof HtmlSeguro) return valor.valor;
  if (Array.isArray(valor)) return valor.map(converter).join('');
  return escapar(String(valor));
}

export function html(textos: TemplateStringsArray, ...valores: Interpolavel[]): HtmlSeguro {
  return new HtmlSeguro(textos.reduce((saida, parte, i) => saida + parte + (i < valores.length ? converter(valores[i] as Interpolavel) : ''), ''));
}

/** Marca um texto como HTML confiável (use apenas com conteúdo gerado pelo próprio sistema). */
export function bruto(valor: string): HtmlSeguro {
  return new HtmlSeguro(valor);
}

/** Serializa JSON para ser embutido em <script type="application/json">, neutralizando "<". */
export function jsonSeguro(dados: unknown): HtmlSeguro {
  return new HtmlSeguro(JSON.stringify(dados).replace(/</g, '\\u003c'));
}
