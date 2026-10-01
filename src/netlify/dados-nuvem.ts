import { ArmazenamentoEmMemoria, type ColecoesEmMemoria } from '../repositorios/armazenamento.js';

/** Parte do Netlify Blobs que usamos (e que testes podem simular em memória). */
export interface LojaDeBlobs {
  getWithMetadata(chave: string, opcoes: { type: 'text'; consistency: 'strong' }): Promise<{ data: string; etag?: string | undefined } | null>;
  set(chave: string, dados: string, opcoes?: { onlyIfMatch?: string; onlyIfNew?: boolean }): Promise<{ modified: boolean; etag?: string | undefined }>;
}

/** Outra alteração foi gravada enquanto esta requisição era processada. */
export class ErroDeConflito extends Error {
  constructor() {
    super('Os dados foram alterados por outra pessoa ou aparelho ao mesmo tempo.');
    this.name = 'ErroDeConflito';
  }
}

const CHAVE_DADOS = 'dados.json';

interface ArquivoDeDados {
  readonly versao: 1;
  readonly colecoes: ColecoesEmMemoria;
}

/**
 * Uma "sessão" de dados por requisição: lê o instantâneo de todos os dados (com o ETag), deixa o
 * sistema trabalhar em memória e, no fim, grava de uma vez só — mas apenas se ninguém gravou antes.
 * Assim duas pessoas editando juntas nunca sobrescrevem o trabalho uma da outra sem aviso.
 */
export class SessaoDeDados {
  private constructor(
    private readonly loja: LojaDeBlobs,
    readonly armazenamento: ArmazenamentoEmMemoria,
    /** Já existia um arquivo de dados quando a sessão abriu? */
    private readonly existia: boolean,
    private readonly etag: string | undefined,
  ) {}

  static async abrir(loja: LojaDeBlobs): Promise<SessaoDeDados> {
    const lido = await loja.getWithMetadata(CHAVE_DADOS, { type: 'text', consistency: 'strong' });
    const arquivo = lido ? (JSON.parse(lido.data) as ArquivoDeDados) : undefined;
    return new SessaoDeDados(loja, new ArmazenamentoEmMemoria(arquivo?.colecoes ?? {}), lido !== null, lido?.etag);
  }

  /**
   * Condição da gravação: dados novos só se ninguém criou antes; dados existentes só se o ETag não mudou.
   * (Se o armazenamento não informar ETag — como no emulador local — grava sem condição.)
   */
  private condicao(): { onlyIfMatch?: string; onlyIfNew?: boolean } | undefined {
    if (!this.existia) return { onlyIfNew: true };
    return this.etag ? { onlyIfMatch: this.etag } : undefined;
  }

  /** Grava se algo mudou. Lança ErroDeConflito se os dados mudaram desde que a sessão abriu. */
  async gravarSeAlterado(): Promise<void> {
    if (!this.armazenamento.foiAlterado()) return;
    const conteudo: ArquivoDeDados = { versao: 1, colecoes: this.armazenamento.instantaneo() };
    const resultado = await this.loja.set(CHAVE_DADOS, JSON.stringify(conteudo), this.condicao());
    if (!resultado.modified) throw new ErroDeConflito();
    // Cópias de segurança (antes de restaurar um backup) vão em chaves separadas.
    for (const copia of this.armazenamento.copiasPendentes()) await this.loja.set(`copias/${copia.nome}`, copia.conteudo);
  }
}
