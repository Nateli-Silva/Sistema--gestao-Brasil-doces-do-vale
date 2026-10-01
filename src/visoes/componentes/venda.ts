import type { ItemVenda } from '../../dominio/tipos.js';
import { formatarInteiro } from '../../utilitarios/formatacao.js';

/** Texto curto do que foi vendido: "10 un." ou "3 caixas de 12 un." (para caixas, o total é calculado). */
export function descricaoItem(item: ItemVenda): string {
  if (item.formato === 'CAIXA' && item.caixas !== null && item.unidadesPorCaixa !== null) {
    return `${formatarInteiro(item.caixas)} ${item.caixas === 1 ? 'caixa' : 'caixas'} de ${formatarInteiro(item.unidadesPorCaixa)} un.`;
  }
  return `${formatarInteiro(item.quantidade)} un.`;
}
