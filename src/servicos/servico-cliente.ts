import { ErroDeValidacao, ErroNaoEncontrado } from '../dominio/erros.js';
import type { Cliente, Endereco, NovaEntidade, TipoCliente } from '../dominio/tipos.js';
import type { Repositorios } from '../repositorios/repositorios.js';
import { validarCnpj, validarCpf, validarEmail } from '../utilitarios/documentos.js';
import { somenteDigitos } from '../utilitarios/formatacao.js';

/** Dados crus do formulário de cliente (PF e PJ compartilham os mesmos campos de contato). */
export interface DadosCliente {
  readonly tipo: TipoCliente;
  readonly nome: string;
  readonly documento: string;
  readonly razaoSocial: string;
  readonly responsavel: string;
  readonly telefone: string;
  readonly email: string;
  readonly observacao: string;
  readonly endereco: Endereco;
}

const ENDERECO_VAZIO: Endereco = { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' };

/** Cadastro de clientes pessoa física e jurídica, com validação de documento e endereço comercial. */
export class ServicoCliente {
  constructor(private readonly repos: Repositorios) {}

  static enderecoVazio(): Endereco {
    return ENDERECO_VAZIO;
  }

  listar(busca = ''): Cliente[] {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    const termoDigitos = somenteDigitos(busca);
    return [...this.repos.clientes.listar()]
      .filter((c) => {
        if (!termo) return true;
        const textos = [c.nome, c.email, c.tipo === 'PJ' ? c.razaoSocial : ''].join(' ').toLocaleLowerCase('pt-BR');
        const documento = c.tipo === 'PF' ? c.cpf : c.cnpj;
        return textos.includes(termo) || (termoDigitos !== '' && documento.includes(termoDigitos));
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  buscarPorId(id: string): Cliente {
    const cliente = this.repos.clientes.buscarPorId(id);
    if (!cliente) throw new ErroNaoEncontrado('Cliente');
    return cliente;
  }

  cadastrar(dados: DadosCliente): Cliente {
    this.validar(dados, null);
    return this.repos.clientes.inserir(this.montar(dados));
  }

  atualizar(id: string, dados: DadosCliente): Cliente {
    const existente = this.buscarPorId(id);
    this.validar({ ...dados, tipo: existente.tipo }, id);
    return this.repos.clientes.atualizar({ ...this.montar({ ...dados, tipo: existente.tipo }), id, criadoEm: existente.criadoEm });
  }

  private montar(dados: DadosCliente): NovaEntidade<Cliente> {
    const base = {
      nome: dados.nome.trim(),
      telefone: somenteDigitos(dados.telefone),
      email: dados.email.trim(),
      observacao: dados.observacao.trim(),
    };
    const documento = somenteDigitos(dados.documento);
    const endereco = this.normalizarEndereco(dados.endereco);
    if (dados.tipo === 'PJ') {
      return { ...base, tipo: 'PJ', cnpj: documento, razaoSocial: dados.razaoSocial.trim(), responsavel: dados.responsavel.trim(), endereco };
    }
    return { ...base, tipo: 'PF', cpf: documento, endereco: this.enderecoPreenchido(endereco) ? endereco : null };
  }

  private normalizarEndereco(e: Endereco): Endereco {
    return {
      cep: somenteDigitos(e.cep),
      logradouro: e.logradouro.trim(),
      numero: e.numero.trim(),
      complemento: e.complemento.trim(),
      bairro: e.bairro.trim(),
      cidade: e.cidade.trim(),
      uf: e.uf.trim().toUpperCase(),
    };
  }

  private enderecoPreenchido(e: Endereco): boolean {
    return Object.values(e).some((valor) => valor.trim() !== '');
  }

  private validar(dados: DadosCliente, idAtual: string | null): void {
    const erros: Record<string, string> = {};
    const ehPj = dados.tipo === 'PJ';
    const documento = somenteDigitos(dados.documento);

    if (dados.nome.trim().length < 2) erros.nome = ehPj ? 'Informe o nome fantasia.' : 'Informe o nome do cliente.';
    if (ehPj && dados.razaoSocial.trim().length < 2) erros.razaoSocial = 'Informe a razão social.';
    if (!(ehPj ? validarCnpj(documento) : validarCpf(documento))) erros.documento = ehPj ? 'CNPJ inválido.' : 'CPF inválido.';
    else if (this.documentoDuplicado(documento, idAtual)) erros.documento = 'Já existe um cliente com este documento.';
    if (somenteDigitos(dados.telefone).length < 10) erros.telefone = 'Informe um telefone com DDD.';
    if (dados.email.trim() !== '' && !validarEmail(dados.email.trim())) erros.email = 'E-mail inválido.';

    // Endereço é obrigatório para PJ (comercial) e opcional para PF, mas completo quando iniciado.
    if (ehPj || this.enderecoPreenchido(dados.endereco)) Object.assign(erros, this.validarEndereco(dados.endereco));

    if (Object.keys(erros).length > 0) throw new ErroDeValidacao(erros);
  }

  private validarEndereco(e: Endereco): Record<string, string> {
    const erros: Record<string, string> = {};
    if (somenteDigitos(e.cep).length !== 8) erros.cep = 'CEP deve ter 8 dígitos.';
    if (e.logradouro.trim() === '') erros.logradouro = 'Informe a rua.';
    if (e.numero.trim() === '') erros.numero = 'Informe o número.';
    if (e.bairro.trim() === '') erros.bairro = 'Informe o bairro.';
    if (e.cidade.trim() === '') erros.cidade = 'Informe a cidade.';
    if (!/^[A-Za-z]{2}$/.test(e.uf.trim())) erros.uf = 'UF com 2 letras.';
    return erros;
  }

  private documentoDuplicado(documento: string, idAtual: string | null): boolean {
    return this.repos.clientes
      .listar()
      .some((c) => c.id !== idAtual && (c.tipo === 'PF' ? c.cpf : c.cnpj) === documento);
  }
}
