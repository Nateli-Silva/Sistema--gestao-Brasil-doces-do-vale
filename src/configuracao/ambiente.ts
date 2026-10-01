import path from 'node:path';

export interface Ambiente {
  readonly porta: number;
  readonly diretorioDados: string;
  readonly diretorioPublico: string;
}

/** Lê variáveis de ambiente com valores padrão seguros para desenvolvimento. */
export function lerAmbiente(variaveis: NodeJS.ProcessEnv = process.env): Ambiente {
  return {
    porta: Number(variaveis.PORTA ?? 3000),
    diretorioDados: path.resolve(variaveis.DIRETORIO_DADOS ?? 'dados'),
    diretorioPublico: path.resolve('publico'),
  };
}
