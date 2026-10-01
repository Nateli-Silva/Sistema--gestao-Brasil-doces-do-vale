import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { criarServicos } from '../src/aplicacao/container.js';
import { ErroDeNegocio, ErroDeValidacao } from '../src/dominio/erros.js';
import { validarCnpj, validarCpf } from '../src/utilitarios/documentos.js';
import { converterParaCentavos, hojeIso } from '../src/utilitarios/formatacao.js';

function novoCenario() {
  const diretorio = fs.mkdtempSync(path.join(os.tmpdir(), 'doces-'));
  const servicos = criarServicos(diretorio);
  const trufas = servicos.catalogo.listarCategorias().find((c) => c.chave === 'trufas');
  assert.ok(trufas);
  const sabor = servicos.catalogo.cadastrarSabor({ categoriaId: trufas.id, sabor: 'Maracujá', precoCentavos: 650, estoqueMinimo: 5 });
  const cliente = servicos.clientes.cadastrar({
    tipo: 'PF', nome: 'Ana', documento: '529.982.247-25', razaoSocial: '', responsavel: '', telefone: '12991234567',
    email: '', observacao: '', endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
  });
  return { servicos, sabor, cliente };
}

test('cria as 5 categorias iniciais', () => {
  const { servicos } = novoCenario();
  assert.deepEqual(servicos.catalogo.listarCategorias().map((c) => c.nome), ['Trufas', 'Mini Trufas', 'Cones Trufados', 'Alfajor', 'Brigadeiros']);
});

test('produção soma ao estoque e venda baixa automaticamente', () => {
  const { servicos, sabor, cliente } = novoCenario();
  servicos.producao.registrar({ data: hojeIso(), observacao: '', itens: [{ produtoId: sabor.id, quantidade: 20 }] });
  assert.equal(servicos.catalogo.buscarProduto(sabor.id).quantidadeEstoque, 20);
  const venda = servicos.vendas.registrar({ clienteId: cliente.id, formaPagamento: 'PIX', observacao: '', itens: [{ produtoId: sabor.id, quantidade: 4 }, { produtoId: sabor.id, quantidade: 2 }] });
  assert.equal(venda.totalCentavos, 6 * 650);
  assert.equal(servicos.catalogo.buscarProduto(sabor.id).quantidadeEstoque, 14);
  assert.equal(servicos.vendas.historicoDoCliente(cliente.id).vendas.length, 1);
});

test('venda sem estoque suficiente é recusada e nada é gravado', () => {
  const { servicos, sabor, cliente } = novoCenario();
  servicos.producao.registrar({ data: hojeIso(), observacao: '', itens: [{ produtoId: sabor.id, quantidade: 3 }] });
  assert.throws(() => servicos.vendas.registrar({ clienteId: cliente.id, formaPagamento: 'PIX', observacao: '', itens: [{ produtoId: sabor.id, quantidade: 4 }] }), ErroDeNegocio);
  assert.equal(servicos.catalogo.buscarProduto(sabor.id).quantidadeEstoque, 3);
  assert.equal(servicos.vendas.listar().length, 0);
});

test('alerta de estoque baixo e painel com cliente favorito', () => {
  const { servicos, sabor, cliente } = novoCenario();
  servicos.producao.registrar({ data: hojeIso(), observacao: '', itens: [{ produtoId: sabor.id, quantidade: 8 }] });
  servicos.vendas.registrar({ clienteId: cliente.id, formaPagamento: 'DINHEIRO', observacao: '', itens: [{ produtoId: sabor.id, quantidade: 5 }] });
  const painel = servicos.painel.montar();
  assert.equal(painel.estoqueBaixo.length, 1);
  assert.equal(painel.melhorCliente?.cliente.id, cliente.id);
  assert.equal(painel.melhorCliente?.favorito?.rotulo, 'Maracujá');
  assert.equal(painel.produtosMaisVendidos[0]?.unidades, 5);
});

test('PJ exige endereço comercial e documentos são validados', () => {
  const { servicos } = novoCenario();
  const vazio = { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' };
  assert.throws(() => servicos.clientes.cadastrar({ tipo: 'PJ', nome: 'Café', razaoSocial: 'Café Ltda', documento: '11.222.333/0001-81', responsavel: '', telefone: '12991234567', email: '', observacao: '', endereco: vazio }), ErroDeValidacao);
  assert.ok(validarCpf('529.982.247-25'));
  assert.ok(!validarCpf('111.111.111-11'));
  assert.ok(validarCnpj('11.222.333/0001-81'));
  assert.ok(!validarCnpj('11.222.333/0001-80'));
});

test('sabor duplicado na mesma categoria é recusado; preço aceita vírgula', () => {
  const { servicos, sabor } = novoCenario();
  assert.throws(() => servicos.catalogo.cadastrarSabor({ categoriaId: sabor.categoriaId, sabor: 'maracujá', precoCentavos: 100, estoqueMinimo: 1 }), ErroDeValidacao);
  assert.equal(converterParaCentavos('R$ 1.234,50'), 123450);
});
