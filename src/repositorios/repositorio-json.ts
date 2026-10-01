import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Entidade, NovaEntidade } from '../dominio/tipos.js';

/**
 * Repositório genérico com persistência em arquivo JSON.
 * Mantém os dados em memória e grava de forma atômica (arquivo temporário + rename).
 * Pode ser substituído por um banco relacional mantendo a mesma interface pública.
 */
export class RepositorioJson<T extends Entidade> {
  private itens: T[];

  constructor(private readonly arquivo: string) {
    this.itens = this.carregar();
  }

  listar(): readonly T[] {
    return this.itens;
  }

  buscarPorId(id: string): T | undefined {
    return this.itens.find((item) => item.id === id);
  }

  inserir(dados: NovaEntidade<T>): T {
    const entidade = { ...dados, id: randomUUID(), criadoEm: new Date().toISOString() } as unknown as T;
    this.itens = [...this.itens, entidade];
    this.persistir();
    return entidade;
  }

  /** Insere vários registros com uma única gravação em disco. */
  inserirVarios(lista: readonly NovaEntidade<T>[]): T[] {
    const agora = new Date().toISOString();
    const novos = lista.map((dados) => ({ ...dados, id: randomUUID(), criadoEm: agora }) as unknown as T);
    this.itens = [...this.itens, ...novos];
    this.persistir();
    return novos;
  }

  atualizar(entidade: T): T {
    this.itens = this.itens.map((item) => (item.id === entidade.id ? entidade : item));
    this.persistir();
    return entidade;
  }

  private carregar(): T[] {
    if (!fs.existsSync(this.arquivo)) return [];
    return JSON.parse(fs.readFileSync(this.arquivo, 'utf-8')) as T[];
  }

  private persistir(): void {
    fs.mkdirSync(path.dirname(this.arquivo), { recursive: true });
    const temporario = `${this.arquivo}.tmp`;
    fs.writeFileSync(temporario, JSON.stringify(this.itens, null, 2));
    fs.renameSync(temporario, this.arquivo);
  }
}
