/** Funções puras de formatação e conversão (moeda, datas, documentos). */

/*
 * Formatação feita "à mão" (sem Intl): o resultado não depende dos dados de idioma/fuso do Node,
 * que podem ser reduzidos em alguns ambientes (ex.: Node em Alpine Linux/Android).
 */

/** Brasil não tem horário de verão desde 2019: a loja usa sempre UTC−3. */
const DESLOCAMENTO_LOJA_MS = -3 * 60 * 60 * 1000;

const doisDigitos = (n: number): string => String(n).padStart(2, '0');

/** Agrupa milhares com ponto: 1234567 → "1.234.567". */
export function formatarInteiro(valor: number): string {
  const sinal = valor < 0 ? '-' : '';
  return sinal + String(Math.trunc(Math.abs(valor))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatarMoeda(centavos: number): string {
  const absoluto = Math.abs(Math.round(centavos));
  const reais = formatarInteiro(Math.floor(absoluto / 100));
  return `${centavos < 0 ? '-' : ''}R$ ${reais},${doisDigitos(absoluto % 100)}`;
}

/** Data/hora no relógio da loja (UTC−3), como objeto Date "deslocado" para leitura via getUTC*. */
function relogioDaLoja(instante: Date): Date {
  return new Date(instante.getTime() + DESLOCAMENTO_LOJA_MS);
}

export function formatarData(iso: string): string {
  // Datas "AAAA-MM-DD" são dias civis, sem deslocamento de fuso.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  const d = relogioDaLoja(new Date(iso));
  return `${doisDigitos(d.getUTCDate())}/${doisDigitos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

export function formatarDataHora(iso: string): string {
  const d = relogioDaLoja(new Date(iso));
  return `${formatarData(iso)} ${doisDigitos(d.getUTCHours())}:${doisDigitos(d.getUTCMinutes())}`;
}

/** Converte texto monetário digitado ("12,50", "R$ 1.234,5") em centavos; NaN se inválido. */
export function converterParaCentavos(texto: string): number {
  const limpo = texto.replace(/[R$\s]/g, '');
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return Number.NaN;
  return Math.round(Number(normalizado) * 100);
}

/** Valor em reais com vírgula, para pré-preencher campos de formulário. */
export function centavosParaCampo(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

export function somenteDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}

export function formatarCpf(digitos: string): string {
  return digitos.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

export function formatarCnpj(digitos: string): string {
  return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function formatarCep(digitos: string): string {
  return digitos.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

/** Dia civil atual da loja no formato AAAA-MM-DD. */
export function hojeIso(agora: Date = new Date()): string {
  return relogioDaLoja(agora).toISOString().slice(0, 10);
}

/** Dia civil (AAAA-MM-DD) de um instante ISO, no fuso da loja. */
export function diaDe(iso: string): string {
  return hojeIso(new Date(iso));
}

/** Soma `dias` (pode ser negativo) a um dia AAAA-MM-DD. */
export function somarDias(dia: string, dias: number): string {
  const data = new Date(`${dia}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}
