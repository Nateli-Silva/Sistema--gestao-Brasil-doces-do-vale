/** Tipos centrais do domínio da doceria. Nenhum outro módulo redefine estas estruturas. */

export const CHAVES_CATEGORIA = [
  'trufas',
  'mini-trufas',
  'cones-trufados',
  'alfajor',
  'brigadeiros',
] as const;

/** Chave estável da categoria; também identifica o ícone SVG correspondente. */
export type ChaveCategoria = (typeof CHAVES_CATEGORIA)[number];

/** Toda entidade persistida possui identificador e data de criação (ISO 8601). */
export interface Entidade {
  readonly id: string;
  readonly criadoEm: string;
}

/** Dados necessários para criar uma entidade (id e criadoEm são gerados pelo repositório). */
export type NovaEntidade<T extends Entidade> = T extends Entidade ? Omit<T, 'id' | 'criadoEm'> : never;

export interface Categoria extends Entidade {
  readonly chave: ChaveCategoria;
  readonly nome: string;
  readonly ordem: number;
}

/** Um "produto" é a combinação categoria + sabor, com preço e saldo em estoque. */
export interface Produto extends Entidade {
  readonly categoriaId: string;
  readonly sabor: string;
  readonly precoCentavos: number;
  readonly estoqueMinimo: number;
  readonly quantidadeEstoque: number;
  readonly ativo: boolean;
}

export type TipoMovimento = 'PRODUCAO' | 'VENDA' | 'AJUSTE';

/** Registro de auditoria de estoque; `quantidade` é um delta (positivo entra, negativo sai). */
export interface MovimentoEstoque extends Entidade {
  readonly produtoId: string;
  readonly tipo: TipoMovimento;
  readonly quantidade: number;
  readonly referenciaId: string | null;
  readonly data: string;
}

export interface Producao extends Entidade {
  /** Dia da produção no formato AAAA-MM-DD. */
  readonly data: string;
  readonly produtoId: string;
  readonly quantidade: number;
  readonly observacao: string;
}

export interface Endereco {
  readonly cep: string;
  readonly logradouro: string;
  readonly numero: string;
  readonly complemento: string;
  readonly bairro: string;
  readonly cidade: string;
  readonly uf: string;
}

interface ClienteBase extends Entidade {
  /** Nome da pessoa (PF) ou nome fantasia (PJ). */
  readonly nome: string;
  readonly telefone: string;
  readonly email: string;
  readonly observacao: string;
  /** Cliente arquivado some das buscas e de novas vendas, mas o histórico de compras é mantido. */
  readonly ativo: boolean;
}

export interface ClientePessoaFisica extends ClienteBase {
  readonly tipo: 'PF';
  readonly cpf: string;
  readonly endereco: Endereco | null;
}

export interface ClientePessoaJuridica extends ClienteBase {
  readonly tipo: 'PJ';
  readonly razaoSocial: string;
  readonly cnpj: string;
  readonly responsavel: string;
  /** Endereço comercial: obrigatório para PJ. */
  readonly endereco: Endereco;
}

export type Cliente = ClientePessoaFisica | ClientePessoaJuridica;
export type TipoCliente = Cliente['tipo'];

export const FORMAS_PAGAMENTO = ['PIX', 'DINHEIRO', 'CARTAO', 'FATURADO'] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export const FORMATOS_VENDA = ['UNIDADE', 'CAIXA'] as const;
export type FormatoVenda = (typeof FORMATOS_VENDA)[number];

/**
 * Item vendido. Pode ser por unidade ou por caixa; a caixa traz quantidades variáveis de unidades.
 * O estoque sempre é controlado em unidades.
 */
export interface ItemVenda {
  readonly produtoId: string;
  readonly formato: FormatoVenda;
  /** Unidades que saem do estoque (no formato CAIXA: caixas × unidades por caixa). */
  readonly quantidade: number;
  /** Número de caixas vendidas (somente formato CAIXA). */
  readonly caixas: number | null;
  /** Unidades dentro de cada caixa (somente formato CAIXA). */
  readonly unidadesPorCaixa: number | null;
  /** Valor combinado para o item inteiro, definido na hora da venda. */
  readonly subtotalCentavos: number;
  /** Valor médio por unidade (subtotal ÷ unidades), apenas para referência. */
  readonly precoUnitarioCentavos: number;
}

export interface Venda extends Entidade {
  readonly clienteId: string;
  /** Data e hora da venda (ISO 8601). */
  readonly data: string;
  readonly itens: readonly ItemVenda[];
  readonly totalCentavos: number;
  readonly formaPagamento: FormaPagamento;
  readonly observacao: string;
}
