import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { criarServicos } from '../src/aplicacao/container.js';
import { ErroDeNegocio, ErroDeValidacao } from '../src/dominio/erros.js';
import { validarCnpj, validarCpf } from '../src/utilitarios/documentos.js';
import { converterParaCentavos, formatarData, formatarDataHora, formatarInteiro, formatarMoeda, hojeIso, somarDias } from '../src/utilitarios/formatacao.js';

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

test('sabor pode ser renomeado; nome repetido na categoria é recusado', () => {
  const { servicos, sabor } = novoCenario();
  const outro = servicos.catalogo.cadastrarSabor({ categoriaId: sabor.categoriaId, sabor: 'Pistache', precoCentavos: 700, estoqueMinimo: 3 });
  const renomeado = servicos.catalogo.atualizarProduto(sabor.id, { sabor: 'Maracujá com Chocolate', precoCentavos: 700, estoqueMinimo: 4 });
  assert.equal(renomeado.sabor, 'Maracujá com Chocolate');
  assert.throws(() => servicos.catalogo.atualizarProduto(outro.id, { sabor: 'maracujá com chocolate', precoCentavos: 700, estoqueMinimo: 3 }), ErroDeValidacao);
  // manter o próprio nome ao editar só o preço é permitido
  assert.doesNotThrow(() => servicos.catalogo.atualizarProduto(outro.id, { sabor: 'Pistache', precoCentavos: 750, estoqueMinimo: 3 }));
});

test('sabor sem histórico pode ser excluído; com produção só pode ser desativado', () => {
  const { servicos, sabor } = novoCenario();
  const novo = servicos.catalogo.cadastrarSabor({ categoriaId: sabor.categoriaId, sabor: 'Coco', precoCentavos: 500, estoqueMinimo: 2 });
  servicos.catalogo.excluirProduto(novo.id);
  assert.equal(servicos.catalogo.listarProdutos().some((p) => p.produto.id === novo.id), false);
  servicos.producao.registrar({ data: hojeIso(), observacao: '', itens: [{ produtoId: sabor.id, quantidade: 5 }] });
  assert.throws(() => servicos.catalogo.excluirProduto(sabor.id), ErroDeNegocio);
  assert.equal(servicos.catalogo.alternarAtivo(sabor.id).ativo, false);
});

test('produção com o mesmo sabor em duas linhas é somada', () => {
  const { servicos, sabor } = novoCenario();
  servicos.producao.registrar({ data: hojeIso(), observacao: '', itens: [{ produtoId: sabor.id, quantidade: 5 }, { produtoId: sabor.id, quantidade: 7 }] });
  assert.equal(servicos.catalogo.buscarProduto(sabor.id).quantidadeEstoque, 12);
  assert.equal(servicos.producao.listarDoDia(hojeIso()).length, 1);
});

test('resumo do sabor mostra total produzido, vendido e lotes recentes', () => {
  const { servicos, sabor, cliente } = novoCenario();
  servicos.producao.registrar({ data: hojeIso(), observacao: 'lote 1', itens: [{ produtoId: sabor.id, quantidade: 40 }] });
  servicos.producao.registrar({ data: hojeIso(), observacao: 'lote 2', itens: [{ produtoId: sabor.id, quantidade: 20 }] });
  servicos.vendas.registrar({ clienteId: cliente.id, formaPagamento: 'PIX', observacao: '', itens: [{ produtoId: sabor.id, quantidade: 15 }] });
  const resumo = servicos.estoque.resumirSabor(sabor.id);
  assert.equal(resumo.produzido, 60);
  assert.equal(resumo.vendido, 15);
  assert.equal(resumo.ultimasProducoes[0]?.observacao, 'lote 2');
  assert.equal(servicos.estoque.totalProduzidoPorSabor().get(sabor.id), 60);
});

test('datas e valores usam o relógio da loja (UTC−3) e não dependem do Intl', () => {
  // 02:30 UTC ainda é o dia anterior em São Paulo.
  assert.equal(hojeIso(new Date('2026-10-01T02:30:00Z')), '2026-09-30');
  assert.equal(hojeIso(new Date('2026-10-01T03:00:00Z')), '2026-10-01');
  assert.equal(somarDias('2026-03-01', -1), '2026-02-28');
  assert.equal(formatarData('2026-10-01'), '01/10/2026');
  assert.equal(formatarDataHora('2026-10-01T15:05:00Z'), '01/10/2026 12:05');
  assert.equal(formatarMoeda(141750), 'R$ 1.417,50');
  assert.equal(formatarMoeda(5), 'R$ 0,05');
  assert.equal(formatarInteiro(1234567), '1.234.567');
});

test('venda por caixa: baixa as unidades da caixa e usa o valor combinado', () => {
  const { servicos, sabor, cliente } = novoCenario();
  servicos.producao.registrar({ data: hojeIso(), observacao: '', itens: [{ produtoId: sabor.id, quantidade: 100 }] });
  const venda = servicos.vendas.registrar({
    clienteId: cliente.id, formaPagamento: 'PIX', observacao: '',
    itens: [{ produtoId: sabor.id, formato: 'CAIXA', quantidade: 2, unidadesPorCaixa: 12, valorCentavos: 8000 }],
  });
  const item = venda.itens[0];
  assert.equal(item?.formato, 'CAIXA');
  assert.equal(item?.quantidade, 24); // 2 caixas × 12 unidades
  assert.equal(item?.caixas, 2);
  assert.equal(venda.totalCentavos, 16000); // 2 × R$ 80,00
  assert.equal(servicos.catalogo.buscarProduto(sabor.id).quantidadeEstoque, 76);
  // caixa sem valor informado: unidades da caixa × valor unitário do cadastro (R$ 6,50)
  const sugerida = servicos.vendas.registrar({
    clienteId: cliente.id, formaPagamento: 'PIX', observacao: '',
    itens: [{ produtoId: sabor.id, formato: 'CAIXA', quantidade: 1, unidadesPorCaixa: 6 }],
  });
  assert.equal(sugerida.totalCentavos, 6 * 650);
});

test('valor por unidade pode ser alterado na venda sem mudar o cadastro', () => {
  const { servicos, sabor, cliente } = novoCenario();
  servicos.producao.registrar({ data: hojeIso(), observacao: '', itens: [{ produtoId: sabor.id, quantidade: 10 }] });
  const venda = servicos.vendas.registrar({ clienteId: cliente.id, formaPagamento: 'DINHEIRO', observacao: '', itens: [{ produtoId: sabor.id, quantidade: 4, valorCentavos: 500 }] });
  assert.equal(venda.totalCentavos, 2000);
  assert.equal(servicos.catalogo.buscarProduto(sabor.id).precoCentavos, 650);
});

test('estoque é conferido somando todas as linhas do mesmo sabor', () => {
  const { servicos, sabor, cliente } = novoCenario();
  servicos.producao.registrar({ data: hojeIso(), observacao: '', itens: [{ produtoId: sabor.id, quantidade: 20 }] });
  assert.throws(() => servicos.vendas.registrar({
    clienteId: cliente.id, formaPagamento: 'PIX', observacao: '',
    itens: [{ produtoId: sabor.id, quantidade: 15 }, { produtoId: sabor.id, formato: 'CAIXA', quantidade: 1, unidadesPorCaixa: 10 }],
  }), ErroDeNegocio);
  assert.equal(servicos.vendas.listar().length, 0);
  assert.equal(servicos.catalogo.buscarProduto(sabor.id).quantidadeEstoque, 20);
});

test('caixa exige unidades por caixa; valor inválido é recusado', () => {
  const { servicos, sabor, cliente } = novoCenario();
  servicos.producao.registrar({ data: hojeIso(), observacao: '', itens: [{ produtoId: sabor.id, quantidade: 50 }] });
  const base = { clienteId: cliente.id, formaPagamento: 'PIX', observacao: '' };
  assert.throws(() => servicos.vendas.registrar({ ...base, itens: [{ produtoId: sabor.id, formato: 'CAIXA', quantidade: 1 }] }), ErroDeValidacao);
  assert.throws(() => servicos.vendas.registrar({ ...base, itens: [{ produtoId: sabor.id, quantidade: 1, valorCentavos: Number.NaN }] }), ErroDeValidacao);
  assert.throws(() => servicos.vendas.registrar({ ...base, itens: [{ produtoId: sabor.id, formato: 'PALETE', quantidade: 1 }] }), ErroDeValidacao);
});

test('vendas gravadas no formato antigo continuam válidas', () => {
  const diretorio = fs.mkdtempSync(path.join(os.tmpdir(), 'doces-antigo-'));
  const antiga = [{
    id: 'v1', criadoEm: '2026-09-01T12:00:00.000Z', clienteId: 'c1', data: '2026-09-01T12:00:00.000Z', formaPagamento: 'PIX', observacao: '',
    totalCentavos: 1950, itens: [{ produtoId: 'p1', quantidade: 3, precoUnitarioCentavos: 650 }],
  }];
  fs.writeFileSync(path.join(diretorio, 'vendas.json'), JSON.stringify(antiga));
  const item = criarServicos(diretorio).vendas.listar()[0]?.itens[0];
  assert.equal(item?.formato, 'UNIDADE');
  assert.equal(item?.subtotalCentavos, 1950);
  assert.equal(item?.caixas, null);
});

test('na caixa o valor pode ser informado por unidade em vez de pela caixa', () => {
  const { servicos, sabor, cliente } = novoCenario();
  servicos.producao.registrar({ data: hojeIso(), observacao: '', itens: [{ produtoId: sabor.id, quantidade: 100 }] });
  const base = { clienteId: cliente.id, formaPagamento: 'PIX', observacao: '' };
  // 2 caixas de 12 a R$ 7,00 cada unidade = 24 × 7,00 = R$ 168,00
  const porUnidade = servicos.vendas.registrar({ ...base, itens: [{ produtoId: sabor.id, formato: 'CAIXA', quantidade: 2, unidadesPorCaixa: 12, valorCentavos: 700, baseValor: 'UNIDADE' }] });
  assert.equal(porUnidade.totalCentavos, 16800);
  assert.equal(porUnidade.itens[0]?.precoUnitarioCentavos, 700);
  // mesma venda informada pela caixa (R$ 84,00 cada) dá o mesmo total
  const porCaixa = servicos.vendas.registrar({ ...base, itens: [{ produtoId: sabor.id, formato: 'CAIXA', quantidade: 2, unidadesPorCaixa: 12, valorCentavos: 8400, baseValor: 'CAIXA' }] });
  assert.equal(porCaixa.totalCentavos, 16800);
  assert.throws(() => servicos.vendas.registrar({ ...base, itens: [{ produtoId: sabor.id, formato: 'CAIXA', quantidade: 1, unidadesPorCaixa: 12, valorCentavos: 700, baseValor: 'PALETE' }] }), ErroDeValidacao);
});
