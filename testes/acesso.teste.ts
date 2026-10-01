import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { criarAplicacao } from '../src/aplicacao/aplicacao.js';
import { Autenticacao, destinoSeguro } from '../src/aplicacao/autenticacao.js';
import { criarServicos } from '../src/aplicacao/container.js';
import { lerAmbiente } from '../src/configuracao/ambiente.js';
import { ErroDeNegocio } from '../src/dominio/erros.js';

const pastaTemporaria = (): string => fs.mkdtempSync(path.join(os.tmpdir(), 'doces-acesso-'));

test('sessão: assinatura válida, adulterada e expirada', () => {
  const auth = new Autenticacao('segredo-123');
  const sessao = auth.emitirSessao(1_000);
  assert.ok(auth.sessaoValida(sessao, 2_000));
  assert.ok(!auth.sessaoValida(sessao, 1_000 + 31 * 24 * 3600 * 1000)); // expirada
  assert.ok(!auth.sessaoValida(`${sessao}x`, 2_000)); // adulterada
  assert.ok(!auth.sessaoValida(undefined));
  assert.ok(!new Autenticacao('outra-senha').sessaoValida(sessao, 2_000)); // trocar a senha derruba as sessões
  assert.ok(auth.senhaCorreta('segredo-123'));
  assert.ok(!auth.senhaCorreta('errada'));
});

test('bloqueia o IP após 5 senhas erradas', () => {
  const auth = new Autenticacao('x');
  for (let i = 0; i < 4; i++) auth.registrarFalha('1.2.3.4', 1_000);
  assert.equal(auth.segundosBloqueado('1.2.3.4', 1_000), 0);
  auth.registrarFalha('1.2.3.4', 1_000);
  assert.ok(auth.segundosBloqueado('1.2.3.4', 1_000) > 0);
  assert.equal(auth.segundosBloqueado('9.9.9.9', 1_000), 0);
  auth.limparFalhas('1.2.3.4');
  assert.equal(auth.segundosBloqueado('1.2.3.4', 1_000), 0);
});

test('destino após o login só aceita caminhos internos', () => {
  assert.equal(destinoSeguro('/vendas?x=1'), '/vendas?x=1');
  assert.equal(destinoSeguro('//site-malicioso.com'), '/');
  assert.equal(destinoSeguro('https://site-malicioso.com'), '/');
  assert.equal(destinoSeguro('/entrar'), '/');
  assert.equal(destinoSeguro(undefined), '/');
});

test('ambiente: PORT da hospedagem, senha e modo produção', () => {
  assert.equal(lerAmbiente({ PORT: '10000' }).porta, 10000);
  assert.equal(lerAmbiente({ PORTA: '3500' }).porta, 3500);
  assert.equal(lerAmbiente({}).senhaAcesso, undefined);
  assert.equal(lerAmbiente({ SENHA_ACESSO: '  ' }).senhaAcesso, undefined);
  const prod = lerAmbiente({ NODE_ENV: 'production', SENHA_ACESSO: 'abc' });
  assert.ok(prod.producao);
  assert.equal(prod.senhaAcesso, 'abc');
});

test('servidor: exige senha, entrega saúde e estilos sem senha, e mantém a sessão', async () => {
  const servicos = criarServicos(pastaTemporaria());
  const app = criarAplicacao(servicos, path.resolve('publico'), new Autenticacao('doce123'));
  const servidor = app.listen(0);
  const base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  try {
    assert.equal((await fetch(`${base}/saude`)).status, 200);
    assert.equal((await fetch(`${base}/css/estilo.css`)).status, 200);

    const semSenha = await fetch(`${base}/clientes`, { redirect: 'manual' });
    assert.equal(semSenha.status, 303);
    assert.match(semSenha.headers.get('location') ?? '', /^\/entrar\?destino=%2Fclientes/);
    assert.equal((await fetch(`${base}/backup/baixar`, { redirect: 'manual' })).status, 303); // backup também protegido

    const corpo = (senha: string): URLSearchParams => new URLSearchParams({ senha, destino: '/clientes' });
    assert.equal((await fetch(`${base}/entrar`, { method: 'POST', body: corpo('errada'), redirect: 'manual' })).status, 401);

    const entrada = await fetch(`${base}/entrar`, { method: 'POST', body: corpo('doce123'), redirect: 'manual' });
    assert.equal(entrada.status, 303);
    assert.equal(entrada.headers.get('location'), '/clientes');
    const cookie = (entrada.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
    assert.match(cookie, /^sessao=/);
    assert.match(entrada.headers.get('set-cookie') ?? '', /HttpOnly/i);

    const logado = await fetch(`${base}/clientes`, { headers: { cookie } });
    assert.equal(logado.status, 200);
    const copia = await fetch(`${base}/backup/baixar`, { headers: { cookie } });
    assert.equal(copia.status, 200);
    assert.match(copia.headers.get('content-disposition') ?? '', /backup-brasil-doces-\d{4}-\d{2}-\d{2}\.json/);
  } finally {
    servidor.close();
  }
});

test('backup: exporta, restaura em outro sistema e guarda cópia antes de restaurar', () => {
  const origem = criarServicos(pastaTemporaria());
  const vazio = { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' };
  origem.clientes.cadastrar({ tipo: 'PF', nome: 'Ana', documento: '529.982.247-25', razaoSocial: '', responsavel: '', telefone: '12991234567', email: '', observacao: '', endereco: vazio });
  const copia = JSON.parse(JSON.stringify(origem.backup.exportar())) as unknown;

  const pasta = pastaTemporaria();
  const destino = criarServicos(pasta);
  destino.clientes.cadastrar({ tipo: 'PF', nome: 'Outra', documento: '111.444.777-35', razaoSocial: '', responsavel: '', telefone: '12991234568', email: '', observacao: '', endereco: vazio });
  const resumo = destino.backup.restaurar(copia);
  assert.equal(resumo.clientes, 1);
  assert.equal(destino.clientes.listar()[0]?.nome, 'Ana');
  assert.ok(fs.readdirSync(pasta).some((nome) => nome.startsWith('copia-antes-da-restauracao-')));
  // os dados restaurados também ficam gravados em disco
  assert.equal(criarServicos(pasta).clientes.listar()[0]?.nome, 'Ana');

  assert.throws(() => destino.backup.restaurar({ versao: 1, dados: { clientes: 'x' } }), ErroDeNegocio);
  assert.throws(() => destino.backup.restaurar(null), ErroDeNegocio);
  assert.equal(destino.clientes.listar().length, 1); // arquivo inválido não altera nada
});
