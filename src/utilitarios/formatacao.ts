/** Funções puras de formatação e conversão (moeda, datas, documentos). */

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatadorInteiro = new Intl.NumberFormat('pt-BR');
const formatadorData = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' });
const formatadorDataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
});

export function formatarMoeda(centavos: number): string {
  return formatadorMoeda.format(centavos / 100);
}

export function formatarInteiro(valor: number): string {
  return formatadorInteiro.format(valor);
}

export function formatarData(iso: string): string {
  // Datas "AAAA-MM-DD" são tratadas como dia civil, sem deslocamento de fuso.
  const data = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00-03:00`) : new Date(iso);
  return formatadorData.format(data);
}

export function formatarDataHora(iso: string): string {
  return formatadorDataHora.format(new Date(iso));
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

/** Dia civil atual (America/Sao_Paulo) no formato AAAA-MM-DD. */
export function hojeIso(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora);
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
