import { somenteDigitos } from './formatacao.js';

/** Calcula um dígito verificador módulo 11 com a sequência de pesos informada. */
function digitoVerificador(digitos: readonly number[], pesos: readonly number[]): number {
  const soma = digitos.reduce((acumulado, digito, indice) => acumulado + digito * (pesos[indice] ?? 0), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** Valida CPF ou CNPJ conforme o tamanho; `pesosPrimeiro` cobre os 9/12 primeiros dígitos. */
function validarDocumento(texto: string, tamanho: number, pesosPrimeiro: readonly number[]): boolean {
  const digitos = somenteDigitos(texto);
  if (digitos.length !== tamanho || /^(\d)\1+$/.test(digitos)) return false;
  const numeros = [...digitos].map(Number);
  const base = numeros.slice(0, tamanho - 2);
  const primeiro = digitoVerificador(base, pesosPrimeiro);
  const segundo = digitoVerificador([...base, primeiro], [pesosPrimeiro[0] === 10 ? 11 : 6, ...pesosPrimeiro]);
  return numeros[tamanho - 2] === primeiro && numeros[tamanho - 1] === segundo;
}

export function validarCpf(texto: string): boolean {
  return validarDocumento(texto, 11, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
}

export function validarCnpj(texto: string): boolean {
  return validarDocumento(texto, 14, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
}

export function validarEmail(texto: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto);
}
