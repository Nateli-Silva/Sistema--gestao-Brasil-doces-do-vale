/** Leitura segura do corpo de formulários (`application/x-www-form-urlencoded`), sem uso de `any`. */

export type CamposFormulario = Readonly<Record<string, string | readonly string[]>>;

/** Converte o corpo bruto da requisição em um mapa de campos tipado. */
export function lerCampos(corpo: unknown): CamposFormulario {
  const resultado: Record<string, string | string[]> = {};
  if (typeof corpo !== 'object' || corpo === null) return resultado;
  for (const [chave, valor] of Object.entries(corpo)) {
    if (typeof valor === 'string') resultado[chave] = valor;
    else if (Array.isArray(valor)) resultado[chave] = valor.filter((v): v is string => typeof v === 'string');
  }
  return resultado;
}

/** Texto de um campo, sem espaços nas pontas ("" se ausente). */
export function texto(campos: CamposFormulario, nome: string): string {
  const valor = campos[nome];
  const primeiro = Array.isArray(valor) ? valor[0] : valor;
  return typeof primeiro === 'string' ? primeiro.trim() : '';
}

/** Lista de valores de um campo repetido (ex.: várias linhas de itens da venda). */
export function lista(campos: CamposFormulario, nome: string): string[] {
  const valor = campos[nome];
  if (valor === undefined) return [];
  return (Array.isArray(valor) ? [...valor] : [valor as string]).map((v) => v.trim());
}

/** Inteiro de um campo; NaN se vazio ou inválido. */
export function inteiro(valor: string): number {
  return /^\d+$/.test(valor) ? Number(valor) : Number.NaN;
}
