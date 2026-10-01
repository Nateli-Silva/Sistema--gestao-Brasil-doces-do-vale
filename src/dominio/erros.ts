/** Erros previsíveis de regra de negócio; os controladores os convertem em mensagens para o usuário. */

export class ErroDeNegocio extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeNegocio';
  }
}

/** Erros por campo: a chave é o nome do campo do formulário. */
export type ErrosPorCampo = Readonly<Record<string, string>>;

export class ErroDeValidacao extends ErroDeNegocio {
  constructor(
    public readonly erros: ErrosPorCampo,
    mensagem = 'Verifique os campos destacados.',
  ) {
    super(mensagem);
    this.name = 'ErroDeValidacao';
  }
}

export class ErroNaoEncontrado extends ErroDeNegocio {
  constructor(entidade: string) {
    super(`${entidade} não encontrado(a).`);
    this.name = 'ErroNaoEncontrado';
  }
}
