import path from 'node:path';

export interface Ambiente {
  readonly porta: number;
  readonly diretorioDados: string;
  readonly diretorioPublico: string;
  /** Senha de acesso ao sistema. Obrigatória em produção; sem ela o acesso fica aberto (uso local). */
  readonly senhaAcesso: string | undefined;
  readonly producao: boolean;
}

/** Lê variáveis de ambiente com valores padrão seguros para desenvolvimento. */
export function lerAmbiente(variaveis: NodeJS.ProcessEnv = process.env): Ambiente {
  const senha = variaveis.SENHA_ACESSO?.trim();
  return {
    // Hospedagens (Render etc.) informam a porta em PORT; PORTA continua valendo localmente.
    porta: Number(variaveis.PORT ?? variaveis.PORTA ?? 3000),
    diretorioDados: path.resolve(variaveis.DIRETORIO_DADOS ?? 'dados'),
    diretorioPublico: path.resolve('publico'),
    senhaAcesso: senha ? senha : undefined,
    producao: variaveis.NODE_ENV === 'production',
  };
}
