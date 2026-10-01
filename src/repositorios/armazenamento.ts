import fs from 'node:fs';
import path from 'node:path';

/**
 * Onde os dados ficam guardados. Os repositórios só conhecem esta interface, então o sistema pode
 * rodar com arquivos em disco (computador, Render) ou com um armazenamento na nuvem (Netlify).
 */
export interface ArmazenamentoDados {
  /** Registros de uma coleção (lista vazia se ainda não existe). */
  carregar(colecao: string): unknown[];
  /** Grava a coleção inteira. */
  salvar(colecao: string, itens: readonly unknown[]): void;
  /** Guarda um arquivo de segurança (ex.: cópia feita antes de restaurar um backup). */
  guardarCopia(nome: string, conteudo: string): void;
}

/** Um arquivo JSON por coleção, gravado de forma atômica (arquivo temporário + rename). */
export class ArmazenamentoEmArquivos implements ArmazenamentoDados {
  constructor(private readonly diretorio: string) {}

  carregar(colecao: string): unknown[] {
    const arquivo = this.caminho(colecao);
    return fs.existsSync(arquivo) ? (JSON.parse(fs.readFileSync(arquivo, 'utf-8')) as unknown[]) : [];
  }

  salvar(colecao: string, itens: readonly unknown[]): void {
    this.gravar(this.caminho(colecao), JSON.stringify(itens, null, 2));
  }

  guardarCopia(nome: string, conteudo: string): void {
    this.gravar(path.join(this.diretorio, nome), conteudo);
  }

  private caminho(colecao: string): string {
    return path.join(this.diretorio, `${colecao}.json`);
  }

  private gravar(arquivo: string, conteudo: string): void {
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    const temporario = `${arquivo}.tmp`;
    fs.writeFileSync(temporario, conteudo);
    fs.renameSync(temporario, arquivo);
  }
}

export type ColecoesEmMemoria = Readonly<Record<string, readonly unknown[]>>;

/**
 * Dados em memória, com controle de alteração. Usado quando o armazenamento real é assíncrono
 * (Netlify Blobs): carrega-se tudo no início da requisição e grava-se de uma vez só no fim.
 */
export class ArmazenamentoEmMemoria implements ArmazenamentoDados {
  private colecoes = new Map<string, readonly unknown[]>();
  private readonly copias: Array<{ nome: string; conteudo: string }> = [];
  private alterado = false;

  constructor(inicial: ColecoesEmMemoria = {}) {
    for (const [nome, itens] of Object.entries(inicial)) this.colecoes.set(nome, itens);
  }

  carregar(colecao: string): unknown[] {
    return [...(this.colecoes.get(colecao) ?? [])];
  }

  salvar(colecao: string, itens: readonly unknown[]): void {
    this.colecoes.set(colecao, itens);
    this.alterado = true;
  }

  guardarCopia(nome: string, conteudo: string): void {
    this.copias.push({ nome, conteudo });
    this.alterado = true;
  }

  foiAlterado(): boolean {
    return this.alterado;
  }

  instantaneo(): ColecoesEmMemoria {
    return Object.fromEntries(this.colecoes);
  }

  copiasPendentes(): ReadonlyArray<{ nome: string; conteudo: string }> {
    return this.copias;
  }
}
