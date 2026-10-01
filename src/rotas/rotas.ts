import { Router } from 'express';
import type { Servicos } from '../aplicacao/container.js';
import { ControladorCatalogo } from '../controladores/controlador-catalogo.js';
import { ControladorCliente } from '../controladores/controlador-cliente.js';
import { ControladorFaturamento } from '../controladores/controlador-faturamento.js';
import { ControladorEstoque } from '../controladores/controlador-estoque.js';
import { ControladorPainel } from '../controladores/controlador-painel.js';
import { ControladorProducao } from '../controladores/controlador-producao.js';
import { ControladorVenda } from '../controladores/controlador-venda.js';

/** Mapa único de rotas da aplicação, ligando URLs aos métodos dos controladores. */
export function criarRotas(servicos: Servicos): Router {
  const painel = new ControladorPainel(servicos.painel);
  const catalogo = new ControladorCatalogo(servicos.catalogo);
  const producao = new ControladorProducao(servicos.producao, servicos.catalogo);
  const estoque = new ControladorEstoque(servicos.estoque, servicos.catalogo);
  const clientes = new ControladorCliente(servicos.clientes, servicos.vendas, servicos.catalogo);
  const faturamento = new ControladorFaturamento(servicos.faturamento);
  const vendas = new ControladorVenda(servicos.vendas, servicos.clientes, servicos.catalogo);

  const rotas = Router();
  rotas.get('/', painel.exibir);

  rotas.get('/catalogo', catalogo.exibir);
  rotas.post('/catalogo/sabores', catalogo.cadastrarSabor);
  rotas.post('/catalogo/sabores/:id', catalogo.atualizarSabor);
  rotas.post('/catalogo/sabores/:id/alternar', catalogo.alternarAtivo);
  rotas.post('/catalogo/sabores/:id/excluir', catalogo.excluirSabor);

  rotas.get('/producao', producao.exibir);
  rotas.post('/producao', producao.registrar);

  rotas.get('/estoque', estoque.exibir);

  rotas.get('/clientes', clientes.listar);
  rotas.get('/clientes/novo', clientes.formularioNovo);
  rotas.post('/clientes', clientes.cadastrar);
  rotas.get('/clientes/:id', clientes.exibir);
  rotas.get('/clientes/:id/editar', clientes.formularioEdicao);
  rotas.post('/clientes/:id', clientes.atualizar);

  rotas.get('/faturamento', faturamento.exibir);

  rotas.get('/vendas', vendas.listar);
  rotas.get('/vendas/nova', vendas.formularioNovo);
  rotas.post('/vendas', vendas.registrar);
  rotas.get('/vendas/:id', vendas.exibir);

  return rotas;
}
