import type { Cliente, Endereco } from '../../dominio/tipos.js';
import type { ProdutoDetalhado } from '../../servicos/servico-catalogo.js';
import type { HistoricoCliente } from '../../servicos/servico-venda.js';
import { formatarCep, formatarCnpj, formatarCpf, formatarData, formatarDataHora, formatarInteiro, formatarMoeda } from '../../utilitarios/formatacao.js';
import { campoAreaTexto, campoTexto, type ContextoFormulario } from '../componentes/formulario.js';
import { alerta, bolhaCategoria, botao, cabecalhoPagina, cartao, estadoVazio, indicador, selo } from '../componentes/interface.js';
import { iconeInterface } from '../componentes/icones.js';
import { html, type HtmlSeguro } from '../html.js';

export function documentoFormatado(cliente: Cliente): string {
  return cliente.tipo === 'PF' ? formatarCpf(cliente.cpf) : formatarCnpj(cliente.cnpj);
}

function enderecoEmUmaLinha(e: Endereco): string {
  const complemento = e.complemento ? `, ${e.complemento}` : '';
  return `${e.logradouro}, ${e.numero}${complemento} — ${e.bairro}, ${e.cidade}/${e.uf} · CEP ${formatarCep(e.cep)}`;
}

function seloTipo(cliente: Cliente): HtmlSeguro {
  return cliente.tipo === 'PJ' ? selo('PJ', 'rosa') : selo('PF', 'neutro');
}

// ---------- Lista ----------

export function paginaListaClientes(clientes: readonly Cliente[], busca: string): HtmlSeguro {
  const tabela = clientes.length === 0
    ? estadoVazio(busca ? 'Nenhum cliente encontrado para a busca.' : 'Nenhum cliente cadastrado ainda.', botao('Cadastrar cliente', '/clientes/novo', { icone: 'mais' }))
    : html`<div class="tabela-rolavel"><table class="tabela tabela--linhas-clicaveis">
      <thead><tr><th>Cliente</th><th>Documento</th><th>Contato</th><th>Cidade</th></tr></thead>
      <tbody>${clientes.map((c) => html`<tr>
        <td><a class="celula-cliente" href="/clientes/${c.id}"><span class="avatar">${iconeInterface(c.tipo === 'PJ' ? 'predio' : 'pessoa', 18)}</span><span>${c.nome}<small>${c.tipo === 'PJ' ? c.razaoSocial : 'Pessoa física'}</small></span></a></td>
        <td>${seloTipo(c)} ${documentoFormatado(c)}</td>
        <td>${c.telefone}<small>${c.email}</small></td>
        <td>${c.endereco ? `${c.endereco.cidade}/${c.endereco.uf}` : '—'}</td>
      </tr>`)}</tbody></table></div>`;
  return html`${cabecalhoPagina('Clientes', 'Pessoas físicas e empresas que compram da doceria.', botao('Novo cliente', '/clientes/novo', { icone: 'mais' }))}
  ${cartao('Todos os clientes', html`<form class="busca" method="get" action="/clientes" role="search">${iconeInterface('busca', 18)}<input type="search" name="busca" value="${busca}" placeholder="Buscar por nome, e-mail ou documento" aria-label="Buscar clientes"><button class="botao botao--suave" type="submit">Buscar</button></form>${tabela}`)}`;
}

// ---------- Formulário ----------

export interface DadosFormularioCliente {
  readonly titulo: string;
  readonly acao: string;
  readonly cancelar: string;
  /** Em edição o tipo não pode mudar. */
  readonly tipoTravado: boolean;
  readonly formulario: ContextoFormulario;
  readonly erroGeral?: string;
}

export function paginaFormularioCliente(dados: DadosFormularioCliente): HtmlSeguro {
  const { formulario } = dados;
  const tipo = formulario.valores.tipo === 'PJ' ? 'PJ' : 'PF';
  const opcaoTipo = (valor: 'PF' | 'PJ', rotulo: string, icone: 'pessoa' | 'predio'): HtmlSeguro =>
    html`<label class="opcao-tipo"><input type="radio" name="tipo" value="${valor}" ${tipo === valor ? 'checked' : ''} ${dados.tipoTravado && tipo !== valor ? 'disabled' : ''}>${iconeInterface(icone, 22)}<span>${rotulo}</span></label>`;

  return html`${cabecalhoPagina(dados.titulo, 'Dados de contato e endereço para entregas e relacionamento.')}
  <form method="post" action="${dados.acao}" class="formulario" data-formulario-cliente data-tipo="${tipo}">
    ${dados.erroGeral ? alerta(dados.erroGeral) : ''}
    ${dados.tipoTravado ? html`<input type="hidden" name="tipo" value="${tipo}">` : ''}
    ${cartao('Tipo de cliente', html`<div class="opcoes-tipo">${opcaoTipo('PF', 'Pessoa física', 'pessoa')}${opcaoTipo('PJ', 'Pessoa jurídica', 'predio')}</div>`)}
    ${cartao('Identificação', html`<div class="formulario--grade">
      <div data-somente="PJ">${campoTexto(formulario, { nome: 'razaoSocial', rotulo: 'Razão social', obrigatorio: true })}</div>
      ${campoTexto(formulario, { nome: 'nome', rotulo: tipo === 'PJ' ? 'Nome fantasia' : 'Nome completo', obrigatorio: true, atributos: 'data-rotulo-nome' })}
      ${campoTexto(formulario, { nome: 'documento', rotulo: tipo === 'PJ' ? 'CNPJ' : 'CPF', obrigatorio: true, placeholder: tipo === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00', atributos: 'inputmode="numeric" data-campo-documento' })}
      <div data-somente="PJ">${campoTexto(formulario, { nome: 'responsavel', rotulo: 'Responsável / comprador' })}</div>
      ${campoTexto(formulario, { nome: 'telefone', rotulo: 'Telefone / WhatsApp', tipo: 'tel', obrigatorio: true, placeholder: '(11) 91234-5678' })}
      ${campoTexto(formulario, { nome: 'email', rotulo: 'E-mail', tipo: 'email' })}
    </div>`)}
    ${cartao(html`<span data-somente="PJ">Endereço comercial</span><span data-somente="PF">Endereço (opcional)</span>`, html`<div class="formulario--grade formulario--endereco">
      ${campoTexto(formulario, { nome: 'cep', rotulo: 'CEP', placeholder: '00000-000', atributos: 'inputmode="numeric"' })}
      ${campoTexto(formulario, { nome: 'logradouro', rotulo: 'Rua / avenida' })}
      ${campoTexto(formulario, { nome: 'numero', rotulo: 'Número' })}
      ${campoTexto(formulario, { nome: 'complemento', rotulo: 'Complemento' })}
      ${campoTexto(formulario, { nome: 'bairro', rotulo: 'Bairro' })}
      ${campoTexto(formulario, { nome: 'cidade', rotulo: 'Cidade' })}
      ${campoTexto(formulario, { nome: 'uf', rotulo: 'UF', atributos: 'maxlength="2"' })}
    </div>`)}
    ${cartao('Observações', campoAreaTexto(formulario, { nome: 'observacao', rotulo: 'Preferências, restrições, datas especiais…' }))}
    <div class="formulario__acoes"><a class="botao botao--suave" href="${dados.cancelar}">Cancelar</a><button class="botao botao--primario" type="submit">Salvar cliente</button></div>
  </form>`;
}

// ---------- Perfil com histórico ----------

export interface DadosPerfilCliente {
  readonly cliente: Cliente;
  readonly historico: HistoricoCliente;
  readonly indice: ReadonlyMap<string, ProdutoDetalhado>;
}

export function paginaPerfilCliente({ cliente, historico, indice }: DadosPerfilCliente): HtmlSeguro {
  const favorito = historico.favorito ? indice.get(historico.favorito.produtoId) : undefined;
  const contato = html`<dl class="dados">
    <div><dt>${cliente.tipo === 'PJ' ? 'CNPJ' : 'CPF'}</dt><dd>${documentoFormatado(cliente)}</dd></div>
    ${cliente.tipo === 'PJ' ? html`<div><dt>Razão social</dt><dd>${cliente.razaoSocial}</dd></div>${cliente.responsavel ? html`<div><dt>Responsável</dt><dd>${cliente.responsavel}</dd></div>` : ''}` : ''}
    <div><dt>Telefone</dt><dd>${cliente.telefone}</dd></div>
    ${cliente.email ? html`<div><dt>E-mail</dt><dd>${cliente.email}</dd></div>` : ''}
    <div><dt>${cliente.tipo === 'PJ' ? 'Endereço comercial' : 'Endereço'}</dt><dd>${cliente.endereco ? enderecoEmUmaLinha(cliente.endereco) : 'Não informado'}</dd></div>
    ${cliente.observacao ? html`<div><dt>Observações</dt><dd>${cliente.observacao}</dd></div>` : ''}
  </dl>`;

  const compras = historico.vendas.length === 0
    ? estadoVazio('Este cliente ainda não comprou.', botao('Registrar venda', `/vendas/nova?cliente=${cliente.id}`, { icone: 'mais' }))
    : html`<div class="tabela-rolavel"><table class="tabela">
      <thead><tr><th>Data</th><th>Itens</th><th>Pagamento</th><th class="num">Total</th></tr></thead>
      <tbody>${historico.vendas.map((v) => html`<tr>
        <td><a href="/vendas/${v.id}">${formatarDataHora(v.data)}</a></td>
        <td>${v.itens.map((i) => html`<span class="ficha">${i.quantidade}× ${indice.get(i.produtoId)?.produto.sabor ?? '—'}</span>`)}</td>
        <td>${v.formaPagamento}</td><td class="num"><strong>${formatarMoeda(v.totalCentavos)}</strong></td>
      </tr>`)}</tbody></table></div>`;

  return html`${cabecalhoPagina(cliente.nome, cliente.tipo === 'PJ' ? 'Pessoa jurídica' : 'Pessoa física', [botao('Editar', `/clientes/${cliente.id}/editar`, { icone: 'editar', variante: 'suave' }), botao('Nova venda', `/vendas/nova?cliente=${cliente.id}`, { icone: 'mais' })])}
  <div class="grade grade--indicadores">
    ${indicador('Total gasto', formatarMoeda(historico.totalGastoCentavos), 'moeda')}
    ${indicador('Compras', formatarInteiro(historico.vendas.length), 'recibo', historico.ultimaCompra ? `Última em ${formatarData(historico.ultimaCompra)}` : 'Sem compras', 'rosa')}
    ${indicador('Ticket médio', formatarMoeda(historico.ticketMedioCentavos), 'vendas', '', 'chocolate')}
    ${favorito ? html`<article class="indicador indicador--rosa"><span class="indicador__icone">${bolhaCategoria(favorito.categoria, 34)}</span><div><p class="indicador__rotulo">Produto favorito</p><p class="indicador__valor indicador__valor--texto">${favorito.produto.sabor}</p><p class="indicador__detalhe">${favorito.categoria.nome} · ${historico.favorito?.unidades} un.</p></div></article>` : indicador('Produto favorito', '—', 'coracao', '', 'rosa')}
  </div>
  <div class="grade grade--duas grade--perfil">
    ${cartao('Dados do cliente', contato)}
    ${cartao('Histórico de compras', compras)}
  </div>`;
}
