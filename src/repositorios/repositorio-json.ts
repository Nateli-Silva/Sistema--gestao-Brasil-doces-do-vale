import { randomUUID } from 'node:crypto';
import type { Entidade, NovaEntidade } from '../dominio/tipos.js';
import type { ArmazenamentoDados } from './armazenamento.js';

/**
 * Repositório genérico de uma coleção. Mantém os dados em memória e entrega cada alteração ao
 * armazenamento (arquivos, nuvem...). Pode ser trocado por um banco mantendo a mesma interface pública.
 */
export class RepositorioJson<T extends Entidade> {
  private itens: T[];

  /**
   * @param normalizar converte registros gravados em formatos antigos para o formato atual (opcional).
   */
  constructor(
    private readonly armazenamento: ArmazenamentoDados,
    private readonly colecao: string,
    private readonly normalizar: (registro: T) => T = (registro) => registro,
  ) {
    this.itens = (this.armazenamento.carregar(this.colecao) as T[]).map(this.normalizar);
  }

  /** Troca todo o conteúdo (usado na restauração de cópias de segurança). */
  substituirTudo(itens: readonly T[]): void {
    this.itens = itens.map(this.normalizar);
    this.persistir();
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

  remover(id: string): void {
    this.itens = this.itens.filter((item) => item.id !== id);
    this.persistir();
  }

  private persistir(): void {
    this.armazenamento.salvar(this.colecao, this.itens);
  }
}
