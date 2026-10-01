/**
 * Popula o sistema com dados de demonstração (sabores, clientes, produção e vendas dos últimos dias).
 * Uso: npm run demo   (use DIRETORIO_DADOS para escolher onde gravar; não sobrescreve dados existentes)
 */
import { criarServicos } from '../src/aplicacao/container.js';
import { lerAmbiente } from '../src/configuracao/ambiente.js';
import { ServicoCliente } from '../src/servicos/servico-cliente.js';
import type { Endereco } from '../src/dominio/tipos.js';
import { somarDias, hojeIso } from '../src/utilitarios/formatacao.js';

const servicos = criarServicos(lerAmbiente().diretorioDados);
if (servicos.repositorios.produtos.listar().length > 0) {
  console.log('Já existem dados — nada foi alterado.');
  process.exit(0);
}

/** Gera um documento válido (CPF ou CNPJ) a partir de uma semente numérica. */
function gerarDocumento(semente: number, tamanho: 11 | 14): string {
  const base = String(semente).padStart(tamanho - 2, '0').slice(0, tamanho - 2).split('').map(Number);
  const pesos = (n: number): number[] => (tamanho === 11 ? Array.from({ length: n }, (_, i) => n + 1 - i) : Array.from({ length: n }, (_, i) => ((n - 1 - i) % 8) + 2));
  const digito = (digitos: number[]): number => {
    const resto = digitos.reduce((s, d, i) => s + d * (pesos(digitos.length)[i] ?? 0), 0) % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = digito(base);
  const d2 = digito([...base, d1]);
  return [...base, d1, d2].join('');
}

const categorias = new Map(servicos.catalogo.listarCategorias().map((c) => [c.chave, c.id]));
const id = (chave: string): string => categorias.get(chave as never) ?? '';

const sabores: ReadonlyArray<[string, string, number, number]> = [
  ['trufas', 'Ninho com Morango', 650, 12], ['trufas', 'Maracujá', 650, 12], ['trufas', 'Chocolate Belga', 700, 12], ['trufas', 'Pistache', 800, 8],
  ['mini-trufas', 'Ao Leite', 250, 30], ['mini-trufas', 'Meio Amargo', 250, 30], ['mini-trufas', 'Coco', 250, 20],
  ['cones-trufados', 'Brigadeiro', 900, 8], ['cones-trufados', 'Ninho', 900, 8], ['cones-trufados', 'Doce de Leite', 950, 6],
  ['alfajor', 'Doce de Leite Tradicional', 800, 10], ['alfajor', 'Chocolate Branco', 850, 10],
  ['brigadeiros', 'Tradicional', 350, 40], ['brigadeiros', 'Beijinho', 350, 30], ['brigadeiros', 'Café', 380, 20], ['brigadeiros', 'Churros', 380, 20],
];
const produtos = sabores.map(([chave, sabor, preco, minimo]) =>
  servicos.catalogo.cadastrarSabor({ categoriaId: id(chave), sabor, precoCentavos: preco, estoqueMinimo: minimo }),
);

const endereco = (logradouro: string, numero: string, bairro: string, cidade: string): Endereco => ({ cep: '12345678', logradouro, numero, complemento: '', bairro, cidade, uf: 'SP' });
const vazio = ServicoCliente.enderecoVazio();

const clientes = [
  servicos.clientes.cadastrar({ tipo: 'PJ', nome: 'Café Aroma', razaoSocial: 'Aroma Cafeteria Ltda', documento: gerarDocumento(11222333000, 14), responsavel: 'Marina Souza', telefone: '12991234567', email: 'compras@cafearoma.com.br', observacao: 'Entrega às terças e sextas.', endereco: endereco('Rua das Palmeiras', '120', 'Centro', 'Taubaté') }),
  servicos.clientes.cadastrar({ tipo: 'PJ', nome: 'Emporium Festas', razaoSocial: 'Emporium Eventos e Festas ME', documento: gerarDocumento(44555666000, 14), responsavel: 'Carlos Lima', telefone: '12988887777', email: '', observacao: '', endereco: endereco('Av. Independência', '980', 'Jardim Paulista', 'Pindamonhangaba') }),
  servicos.clientes.cadastrar({ tipo: 'PF', nome: 'Helena Prado', razaoSocial: '', documento: gerarDocumento(123456789, 11), responsavel: '', telefone: '12997776655', email: 'helena@exemplo.com', observacao: 'Alérgica a amendoim.', endereco: vazio }),
  servicos.clientes.cadastrar({ tipo: 'PF', nome: 'Rafael Torres', razaoSocial: '', documento: gerarDocumento(987654321, 11), responsavel: '', telefone: '12996665544', email: '', observacao: '', endereco: endereco('Rua Bela Vista', '45', 'Vila Nova', 'Taubaté') }),
];

// Produção diária dos últimos 6 dias (tudo entra no estoque automaticamente).
const hoje = hojeIso();
for (let dia = 5; dia >= 0; dia--) {
  servicos.producao.registrar({
    data: somarDias(hoje, -dia),
    observacao: dia === 0 ? 'Lote do dia' : '',
    itens: produtos.map((p, i) => ({ produtoId: p.id, quantidade: 6 + ((i * 7 + dia * 3) % 14) + (p.precoCentavos < 400 ? 20 : 0) })),
  });
}

// Vendas espalhadas nos últimos dias, com preferências por cliente.
const preferencias: ReadonlyArray<ReadonlyArray<number>> = [[12, 13, 4, 5], [4, 5, 6, 12], [0, 1, 7], [10, 11, 14]];
for (let dia = 5; dia >= 0; dia--) {
  clientes.forEach((cliente, c) => {
    if ((dia + c) % 2 === 1 && dia !== 0) return;
    const gostos = preferencias[c] ?? [0];
    const venda = servicos.vendas.registrar({
      clienteId: cliente.id,
      formaPagamento: cliente.tipo === 'PJ' ? 'FATURADO' : 'PIX',
      observacao: '',
      itens: gostos.slice(0, 2 + (dia % 2)).map((indice, k) => ({
        produtoId: produtos[indice]?.id ?? '',
        quantidade: (cliente.tipo === 'PJ' ? 10 : 2) + k + (dia % 3),
      })),
    });
    const hora = `${String(9 + c * 2).padStart(2, '0')}:${String(10 + dia * 7).padStart(2, '0')}:00-03:00`;
    servicos.repositorios.vendas.atualizar({ ...venda, data: new Date(`${somarDias(hoje, -dia)}T${hora}`).toISOString() });
  });
}

// Vendas extras para forçar alguns sabores a ficarem abaixo do estoque mínimo.
servicos.vendas.registrar({ clienteId: clientes[0]?.id ?? '', formaPagamento: 'FATURADO', observacao: 'Evento corporativo', itens: [{ produtoId: produtos[2]?.id ?? '', quantidade: servicos.catalogo.buscarProduto(produtos[2]?.id ?? '').quantidadeEstoque - 3 }] });
servicos.vendas.registrar({ clienteId: clientes[1]?.id ?? '', formaPagamento: 'FATURADO', observacao: '', itens: [{ produtoId: produtos[9]?.id ?? '', quantidade: servicos.catalogo.buscarProduto(produtos[9]?.id ?? '').quantidadeEstoque }] });

// Exemplo de venda por caixa: 2 caixas de trufas, uma com 12 e outra com 8 unidades, valor combinado.
servicos.vendas.registrar({
  clienteId: clientes[2]?.id ?? '',
  formaPagamento: 'PIX',
  observacao: 'Caixas para presente',
  itens: [
    { produtoId: produtos[1]?.id ?? '', formato: 'CAIXA', quantidade: 1, unidadesPorCaixa: 12, valorCentavos: 7000 },
    { produtoId: produtos[3]?.id ?? '', formato: 'CAIXA', quantidade: 1, unidadesPorCaixa: 8, valorCentavos: 6000 },
  ],
});

console.log(`Dados de demonstração criados: ${produtos.length} sabores, ${clientes.length} clientes.`);
