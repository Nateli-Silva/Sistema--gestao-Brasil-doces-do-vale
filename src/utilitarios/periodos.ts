import { somarDias } from './formatacao.js';

/** Períodos de faturamento: dia, semana (segunda a domingo), mês e ano civis. */

export type Granularidade = 'dia' | 'semana' | 'mes' | 'ano';
export const GRANULARIDADES: readonly Granularidade[] = ['dia', 'semana', 'mes', 'ano'];

/** Intervalo de dias AAAA-MM-DD, com início e fim incluídos. */
export interface Periodo {
  readonly inicio: string;
  readonly fim: string;
}

const paraData = (dia: string): Date => new Date(`${dia}T12:00:00Z`);

export function diferencaEmDias(de: string, ate: string): number {
  return Math.round((paraData(ate).getTime() - paraData(de).getTime()) / 86_400_000);
}

/** Segunda-feira da semana do dia informado. */
export function inicioDaSemana(dia: string): string {
  const diaDaSemana = paraData(dia).getUTCDay(); // 0 = domingo
  return somarDias(dia, -((diaDaSemana + 6) % 7));
}

function ultimoDiaDoMes(ano: number, mes: number): string {
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate(); // mes de 1 a 12: dia 0 do mês seguinte
  return `${ano}-${String(mes).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`;
}

/** Período (dia, semana, mês ou ano) que contém o dia informado. */
export function periodoDe(granularidade: Granularidade, dia: string): Periodo {
  const ano = Number(dia.slice(0, 4));
  const mes = Number(dia.slice(5, 7));
  switch (granularidade) {
    case 'dia':
      return { inicio: dia, fim: dia };
    case 'semana': {
      const inicio = inicioDaSemana(dia);
      return { inicio, fim: somarDias(inicio, 6) };
    }
    case 'mes':
      return { inicio: `${dia.slice(0, 7)}-01`, fim: ultimoDiaDoMes(ano, mes) };
    case 'ano':
      return { inicio: `${ano}-01-01`, fim: `${ano}-12-31` };
  }
}

/** Período imediatamente anterior ao que contém o dia informado (inteiro). */
export function periodoAnterior(granularidade: Granularidade, dia: string): Periodo {
  return periodoDe(granularidade, somarDias(periodoDe(granularidade, dia).inicio, -1));
}

export function contem(periodo: Periodo, dia: string): boolean {
  return dia >= periodo.inicio && dia <= periodo.fim;
}
