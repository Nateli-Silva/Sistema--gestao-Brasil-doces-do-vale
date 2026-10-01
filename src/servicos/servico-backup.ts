import { ErroDeNegocio } from '../dominio/erros.js';
import type { Categoria, Cliente, MovimentoEstoque, Producao, Produto, Venda } from '../dominio/tipos.js';
import type { ArmazenamentoDados } from '../repositorios/armazenamento.js';
import type { Repositorios } from '../repositorios/repositorios.js';

/** Cópia de segurança de todos os dados do sistema em um único arquivo JSON. */
export interface CopiaDeSeguranca {
  readonly versao: 1;
  readonly geradoEm: string;
  readonly dados: {
    readonly categorias: Categoria[];
    readonly produtos: Produto[];
    readonly movimentos: MovimentoEstoque[];
    readonly producoes: Producao[];
    readonly clientes: Cliente[];
    readonly vendas: Venda[];
  };
}

export type ResumoDados = Readonly<Record<keyof CopiaDeSeguranca['dados'], number>>;

const COLECOES = ['categorias', 'produtos', 'movimentos', 'producoes', 'clientes', 'vendas'] as const;

/** Exporta e restaura os dados; antes de restaurar, guarda uma cópia do que existia. */
export class ServicoBackup {
  constructor(
    private readonly repos: Repositorios,
    private readonly armazenamento: ArmazenamentoDados,
  ) {}

  exportar(): CopiaDeSeguranca {
    return {
      versao: 1,
      geradoEm: new Date().toISOString(),
      dados: {
        categorias: [...this.repos.categorias.listar()],
        produtos: [...this.repos.produtos.listar()],
        movimentos: [...this.repos.movimentos.listar()],
        producoes: [...this.repos.producoes.listar()],
        clientes: [...this.repos.clientes.listar()],
        vendas: [...this.repos.vendas.listar()],
      },
    };
  }

  resumir(): ResumoDados {
    return {
      categorias: this.repos.categorias.listar().length,
      produtos: this.repos.produtos.listar().length,
      movimentos: this.repos.movimentos.listar().length,
      producoes: this.repos.producoes.listar().length,
      clientes: this.repos.clientes.listar().length,
      vendas: this.repos.vendas.listar().length,
    };
  }

  /** Substitui TODOS os dados pelo conteúdo do arquivo (que precisa ter sido gerado por este sistema). */
  restaurar(conteudo: unknown): ResumoDados {
    const dados = this.validar(conteudo);
    this.guardarCopiaAntes();
    this.repos.categorias.substituirTudo(dados.categorias);
    this.repos.produtos.substituirTudo(dados.produtos);
    this.repos.movimentos.substituirTudo(dados.movimentos);
    this.repos.producoes.substituirTudo(dados.producoes);
    this.repos.clientes.substituirTudo(dados.clientes);
    this.repos.vendas.substituirTudo(dados.vendas);
    return this.resumir();
  }

  private validar(conteudo: unknown): CopiaDeSeguranca['dados'] {
    const invalido = new ErroDeNegocio('Arquivo inválido: use uma cópia baixada pelo próprio sistema.');
    if (typeof conteudo !== 'object' || conteudo === null) throw invalido;
    const { versao, dados } = conteudo as { versao?: unknown; dados?: unknown };
    if (versao !== 1 || typeof dados !== 'object' || dados === null) throw invalido;
    const colecoes = dados as Record<string, unknown>;
    for (const nome of COLECOES) {
      const lista = colecoes[nome];
      if (!Array.isArray(lista)) throw invalido;
      const ids = new Set<unknown>();
      for (const item of lista) {
        const id = typeof item === 'object' && item !== null ? (item as { id?: unknown }).id : undefined;
        if (typeof id !== 'string' || ids.has(id)) throw invalido;
        ids.add(id);
      }
    }
    return dados as CopiaDeSeguranca['dados'];
  }

  private guardarCopiaAntes(): void {
    const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
    this.armazenamento.guardarCopia(`copia-antes-da-restauracao-${carimbo}.json`, JSON.stringify(this.exportar()));
  }
}
