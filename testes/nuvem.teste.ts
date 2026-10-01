import assert from 'node:assert/strict';
import { test } from 'node:test';
import { criarManipulador } from '../src/netlify/funcao.js';
import { ErroDeConflito, SessaoDeDados, type LojaDeBlobs } from '../src/netlify/dados-nuvem.js';

/** Imita o Netlify Blobs: cada gravação gera um novo ETag e respeita onlyIfMatch/onlyIfNew. */
class LojaFalsa implements LojaDeBlobs {
  readonly itens = new Map<string, { data: string; etag: string }>();
  private contador = 0;

  async getWithMetadata(chave: string): Promise<{ data: string; etag: string } | null> {
    return this.itens.get(chave) ?? null;
  }

  async set(chave: string, dados: string, opcoes: { onlyIfMatch?: string; onlyIfNew?: boolean } = {}): Promise<{ modified: boolean; etag?: string }> {
    const atual = this.itens.get(chave);
    if (opcoes.onlyIfNew && atual) return { modified: false };
    if (opcoes.onlyIfMatch !== undefined && atual?.etag !== opcoes.onlyIfMatch) return { modified: false };
    const etag = `etag-${++this.contador}`;
    this.itens.set(chave, { data: dados, etag });
    return { modified: true, etag };
  }
}

interface RespostaFuncao {
  statusCode: number;
  location: string;
  cookie: string;
  body: string;
}

/** Monta a requisição como o Netlify a entrega à função e traduz a resposta para facilitar os testes. */
async function chamar(
  manipulador: ReturnType<typeof criarManipulador>,
  metodo: string,
  caminho: string,
  opcoes: { corpo?: Record<string, string>; cookie?: string } = {},
): Promise<RespostaFuncao> {
  const corpo = opcoes.corpo ? new URLSearchParams(opcoes.corpo).toString() : undefined;
  const req = new Request(`https://doces.exemplo.netlify.app${caminho}`, {
    method: metodo,
    redirect: 'manual',
    headers: {
      'x-forwarded-proto': 'https',
      'x-nf-client-connection-ip': '203.0.113.7',
      ...(corpo ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      ...(opcoes.cookie ? { cookie: opcoes.cookie } : {}),
    },
    ...(corpo ? { body: corpo } : {}),
  });
  const resposta = await manipulador(req);
  return {
    statusCode: resposta.status,
    location: resposta.headers.get('location') ?? '',
    cookie: (resposta.headers.getSetCookie()[0] ?? '').split(';')[0] ?? '',
    body: await resposta.text(),
  };
}

test('sessão de dados: grava só quando algo mudou e detecta alteração simultânea', async () => {
  const loja = new LojaFalsa();
  const a = await SessaoDeDados.abrir(loja);
  await a.gravarSeAlterado(); // nada alterado: não grava
  assert.equal(loja.itens.size, 0);

  a.armazenamento.salvar('clientes', [{ id: '1' }]);
  await a.gravarSeAlterado();
  assert.equal(loja.itens.size, 1);

  // duas pessoas abrem os mesmos dados; a segunda a gravar é avisada
  const b = await SessaoDeDados.abrir(loja);
  const c = await SessaoDeDados.abrir(loja);
  assert.deepEqual(b.armazenamento.carregar('clientes'), [{ id: '1' }]);
  b.armazenamento.salvar('clientes', [{ id: '1' }, { id: '2' }]);
  c.armazenamento.salvar('clientes', [{ id: '1' }, { id: '3' }]);
  await b.gravarSeAlterado();
  await assert.rejects(c.gravarSeAlterado(), ErroDeConflito);
  const final = await SessaoDeDados.abrir(loja);
  assert.deepEqual(final.armazenamento.carregar('clientes'), [{ id: '1' }, { id: '2' }]); // nada se perdeu
});

test('armazenamento sem ETag (emulador local) grava sem condição, sem dar conflito', async () => {
  const loja = new LojaFalsa();
  const semEtag: LojaDeBlobs = {
    getWithMetadata: async (chave, opcoes) => {
      const lido = await loja.getWithMetadata(chave, opcoes);
      return lido ? { data: lido.data } : null;
    },
    set: (chave, dados, opcoes) => loja.set(chave, dados, opcoes),
  };
  for (const nome of ['a', 'b', 'c']) {
    const sessao = await SessaoDeDados.abrir(semEtag);
    sessao.armazenamento.salvar('clientes', [...sessao.armazenamento.carregar('clientes'), { id: nome }]);
    await sessao.gravarSeAlterado();
  }
  assert.deepEqual((await SessaoDeDados.abrir(semEtag)).armazenamento.carregar('clientes'), [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
});

test('cópias de segurança vão para chaves separadas', async () => {
  const loja = new LojaFalsa();
  const sessao = await SessaoDeDados.abrir(loja);
  sessao.armazenamento.guardarCopia('copia-1.json', '{"x":1}');
  await sessao.gravarSeAlterado();
  assert.equal(loja.itens.get('copias/copia-1.json')?.data, '{"x":1}');
});

test('função do Netlify: exige senha, entra, grava e lembra os dados na próxima chamada', async () => {
  const loja = new LojaFalsa();
  const manipulador = criarManipulador(() => loja, 'doce123');

  const semLogin = await chamar(manipulador, 'GET', '/clientes');
  assert.equal(semLogin.statusCode, 303);
  assert.match(semLogin.location, /^\/entrar/);

  const errada = await chamar(manipulador, 'POST', '/entrar', { corpo: { senha: 'x', destino: '/' } });
  assert.equal(errada.statusCode, 401);

  const entrada = await chamar(manipulador, 'POST', '/entrar', { corpo: { senha: 'doce123', destino: '/clientes' } });
  assert.equal(entrada.statusCode, 303);
  assert.equal(entrada.location, '/clientes');
  assert.match(entrada.cookie, /^sessao=/);
  const cookie = entrada.cookie;

  const novo = await chamar(manipulador, 'POST', '/clientes', {
    cookie,
    corpo: { tipo: 'PF', nome: 'Ana Nuvem', documento: '529.982.247-25', telefone: '12991234567', email: '', observacao: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
  });
  assert.equal(novo.statusCode, 303, novo.body);
  assert.ok(loja.itens.has('dados.json'));

  // outra chamada (outra instância da função) enxerga o cliente salvo
  const lista = await chamar(manipulador, 'GET', '/clientes', { cookie });
  assert.equal(lista.statusCode, 200);
  assert.match(lista.body, /Ana Nuvem/);

  // consultar não regrava os dados
  const etagAntes = loja.itens.get('dados.json')?.etag;
  await chamar(manipulador, 'GET', '/vendas', { cookie });
  assert.equal(loja.itens.get('dados.json')?.etag, etagAntes);

  // o backup baixado traz os dados da nuvem
  const copia = await chamar(manipulador, 'GET', '/backup/baixar', { cookie });
  assert.equal(copia.statusCode, 200);
  assert.match(copia.body, /Ana Nuvem/);
});

test('função do Netlify: sem SENHA_ACESSO nada é exibido', async () => {
  const resposta = await chamar(criarManipulador(() => new LojaFalsa(), undefined), 'GET', '/');
  assert.equal(resposta.statusCode, 500);
  assert.match(resposta.body, /SENHA_ACESSO/);
});

test('função do Netlify: alteração simultânea é recusada sem perder dados', async () => {
  const loja = new LojaFalsa();
  // simula outra pessoa gravando no meio da requisição
  const lojaConcorrida: LojaDeBlobs = {
    getWithMetadata: (chave, opcoes) => loja.getWithMetadata(chave, opcoes),
    set: async (chave, dados, opcoes) => {
      if (chave === 'dados.json') await loja.set(chave, JSON.stringify({ versao: 1, colecoes: { clientes: [{ id: 'outra-pessoa' }] } }));
      return loja.set(chave, dados, opcoes);
    },
  };
  const manipulador = criarManipulador(() => lojaConcorrida, 'doce123');
  const entrada = await chamar(manipulador, 'POST', '/entrar', { corpo: { senha: 'doce123', destino: '/' } });
  const resposta = await chamar(manipulador, 'POST', '/clientes', {
    cookie: entrada.cookie,
    corpo: { tipo: 'PF', nome: 'Bia', documento: '529.982.247-25', telefone: '12991234567', email: '', observacao: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
  });
  assert.equal(resposta.statusCode, 409);
  assert.match(loja.itens.get('dados.json')?.data ?? '', /outra-pessoa/); // o que a outra pessoa gravou continua lá
});
