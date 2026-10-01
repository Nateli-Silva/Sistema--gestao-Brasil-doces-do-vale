import type { Request, Response } from 'express';
import type { DadosCliente, ServicoCliente } from '../servicos/servico-cliente.js';
import type { ServicoCatalogo } from '../servicos/servico-catalogo.js';
import type { ServicoVenda } from '../servicos/servico-venda.js';
import type { Cliente } from '../dominio/tipos.js';
import { formatarCep, formatarCnpj, formatarCpf } from '../utilitarios/formatacao.js';
import { lerCampos, texto, type CamposFormulario } from '../utilitarios/formulario.js';
import type { ContextoFormulario, ValoresFormulario } from '../visoes/componentes/formulario.js';
import { paginaFormularioCliente, paginaListaClientes, paginaPerfilCliente } from '../visoes/paginas/clientes.js';
import { ControladorBase } from './controlador-base.js';

export class ControladorCliente extends ControladorBase {
  protected readonly secao = 'clientes';
  constructor(
    private readonly clientes: ServicoCliente,
    private readonly vendas: ServicoVenda,
    private readonly catalogo: ServicoCatalogo,
  ) {
    super();
  }

  listar = (req: Request, res: Response): void => {
    const busca = typeof req.query.busca === 'string' ? req.query.busca : '';
    this.renderizar(req, res, 'Clientes', paginaListaClientes(this.clientes.listar(busca), busca));
  };

  exibir = (req: Request, res: Response): void => {
    const cliente = this.clientes.buscarPorId(String(req.params.id));
    this.renderizar(
      req,
      res,
      cliente.nome,
      paginaPerfilCliente({ cliente, historico: this.vendas.historicoDoCliente(cliente.id), indice: this.catalogo.indexarProdutos() }),
    );
  };

  formularioNovo = (req: Request, res: Response): void => {
    this.renderizarFormulario(req, res, { titulo: 'Novo cliente', acao: '/clientes', cancelar: '/clientes', tipoTravado: false }, { valores: { tipo: 'PF' }, erros: {} });
  };

  formularioEdicao = (req: Request, res: Response): void => {
    const cliente = this.clientes.buscarPorId(String(req.params.id));
    this.renderizarFormulario(req, res, this.opcoesEdicao(cliente), { valores: this.valoresDoCliente(cliente), erros: {} });
  };

  cadastrar = (req: Request, res: Response): void => {
    const campos = lerCampos(req.body);
    try {
      const cliente = this.clientes.cadastrar(this.lerDados(campos));
      this.redirecionar(res, `/clientes/${cliente.id}`, 'Cliente cadastrado com sucesso.');
    } catch (erro) {
      this.responderFalha(req, res, erro, campos, { titulo: 'Novo cliente', acao: '/clientes', cancelar: '/clientes', tipoTravado: false });
    }
  };

  atualizar = (req: Request, res: Response): void => {
    const id = String(req.params.id);
    const campos = lerCampos(req.body);
    try {
      this.clientes.atualizar(id, this.lerDados(campos));
      this.redirecionar(res, `/clientes/${id}`, 'Cadastro atualizado.');
    } catch (erro) {
      this.responderFalha(req, res, erro, campos, this.opcoesEdicao(this.clientes.buscarPorId(id)));
    }
  };

  private opcoesEdicao(cliente: Cliente): { titulo: string; acao: string; cancelar: string; tipoTravado: boolean } {
    return { titulo: 'Editar cliente', acao: `/clientes/${cliente.id}`, cancelar: `/clientes/${cliente.id}`, tipoTravado: true };
  }

  private lerDados(campos: CamposFormulario): DadosCliente {
    return {
      tipo: texto(campos, 'tipo') === 'PJ' ? 'PJ' : 'PF',
      nome: texto(campos, 'nome'),
      documento: texto(campos, 'documento'),
      razaoSocial: texto(campos, 'razaoSocial'),
      responsavel: texto(campos, 'responsavel'),
      telefone: texto(campos, 'telefone'),
      email: texto(campos, 'email'),
      observacao: texto(campos, 'observacao'),
      endereco: {
        cep: texto(campos, 'cep'),
        logradouro: texto(campos, 'logradouro'),
        numero: texto(campos, 'numero'),
        complemento: texto(campos, 'complemento'),
        bairro: texto(campos, 'bairro'),
        cidade: texto(campos, 'cidade'),
        uf: texto(campos, 'uf'),
      },
    };
  }

  private valoresDoCliente(c: Cliente): ValoresFormulario {
    return {
      tipo: c.tipo,
      nome: c.nome,
      documento: c.tipo === 'PF' ? formatarCpf(c.cpf) : formatarCnpj(c.cnpj),
      razaoSocial: c.tipo === 'PJ' ? c.razaoSocial : '',
      responsavel: c.tipo === 'PJ' ? c.responsavel : '',
      telefone: c.telefone,
      email: c.email,
      observacao: c.observacao,
      cep: c.endereco ? formatarCep(c.endereco.cep) : '',
      logradouro: c.endereco?.logradouro ?? '',
      numero: c.endereco?.numero ?? '',
      complemento: c.endereco?.complemento ?? '',
      bairro: c.endereco?.bairro ?? '',
      cidade: c.endereco?.cidade ?? '',
      uf: c.endereco?.uf ?? '',
    };
  }

  private responderFalha(req: Request, res: Response, erro: unknown, campos: CamposFormulario, opcoes: { titulo: string; acao: string; cancelar: string; tipoTravado: boolean }): void {
    const { erros, erroGeral } = this.tratarFalha(erro);
    res.status(422);
    this.renderizarFormulario(req, res, opcoes, { valores: this.valoresPlanos(campos), erros }, erroGeral);
  }

  private renderizarFormulario(
    req: Request,
    res: Response,
    opcoes: { titulo: string; acao: string; cancelar: string; tipoTravado: boolean },
    formulario: ContextoFormulario,
    erroGeral?: string,
  ): void {
    this.renderizar(req, res, opcoes.titulo, paginaFormularioCliente({ ...opcoes, formulario, erroGeral }), ['/js/cliente.js']);
  }
}
