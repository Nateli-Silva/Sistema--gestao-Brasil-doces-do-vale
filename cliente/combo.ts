/** Campo de busca com lista de sugestões aberta abaixo do campo (compartilhado por Produção e Venda). */

export interface OpcaoCombo {
  readonly id: string;
  readonly rotulo: string;
  /** Texto auxiliar exibido ao lado e também pesquisável (ex.: nome da categoria). */
  readonly detalhe?: string;
  readonly desabilitada?: boolean;
}

export interface ConfigCombo {
  readonly opcoes: readonly OpcaoCombo[];
  readonly idLista: string;
  /** Nome do campo oculto enviado no formulário com o id escolhido. */
  readonly nomeCampo: string;
  readonly placeholder: string;
  readonly rotuloAria: string;
  /** Chamado quando o texto ou a seleção mudam. */
  readonly aoMudar: () => void;
  /** Chamado após o usuário escolher uma sugestão (ex.: levar o foco ao próximo campo). */
  readonly aoEscolher: () => void;
}

export interface Combo {
  readonly raiz: HTMLElement;
  readonly entrada: HTMLInputElement;
  readonly oculto: HTMLInputElement;
  /** Id da opção que corresponde ao texto digitado ('' se nenhuma). */
  idSelecionado(): string;
  definir(id: string): void;
  /** Reavalia o texto atual (sem alterá-lo) e dispara `aoMudar`. */
  atualizar(): void;
  limpar(): void;
}

/** Minúsculas e sem acentos, para "maracuja" encontrar "Maracujá". */
export const normalizar = (texto: string): string =>
  texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLocaleLowerCase('pt-BR');

export function criarCombo(config: ConfigCombo): Combo {
  const raiz = document.createElement('div');
  raiz.className = 'combo';
  raiz.innerHTML = `
    <input type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${config.idLista}" autocomplete="off" autocapitalize="none">
    <ul class="combo__lista" id="${config.idLista}" role="listbox" hidden></ul>
    <input type="hidden" name="${config.nomeCampo}">`;
  const entrada = raiz.querySelector<HTMLInputElement>('input[type=text]')!;
  const lista = raiz.querySelector<HTMLUListElement>('.combo__lista')!;
  const oculto = raiz.querySelector<HTMLInputElement>('input[type=hidden]')!;
  entrada.placeholder = config.placeholder;
  entrada.setAttribute('aria-label', config.rotuloAria);

  let destaque = -1;
  const achar = (texto: string): OpcaoCombo | undefined => config.opcoes.find((o) => normalizar(o.rotulo) === normalizar(texto));
  const itens = (): HTMLLIElement[] => Array.from(lista.querySelectorAll<HTMLLIElement>('li[data-id]'));

  const sincronizar = (): void => {
    oculto.value = achar(entrada.value)?.id ?? '';
    config.aoMudar();
  };

  const fechar = (): void => {
    lista.hidden = true;
    entrada.setAttribute('aria-expanded', 'false');
    destaque = -1;
  };

  const escolher = (opcao: OpcaoCombo): void => {
    entrada.value = opcao.rotulo;
    sincronizar();
    fechar();
    config.aoEscolher();
  };

  const marcar = (indice: number): void => {
    const todos = itens();
    if (todos.length === 0) return;
    destaque = (indice + todos.length) % todos.length;
    todos.forEach((li, i) => li.setAttribute('aria-selected', String(i === destaque)));
    todos[destaque]?.scrollIntoView({ block: 'nearest' });
  };

  /** Abre a lista abaixo do campo, filtrada pelo texto (começa-com primeiro, depois contém). */
  const abrir = (): void => {
    const termo = normalizar(entrada.value);
    const alvo = (o: OpcaoCombo): string => normalizar(`${o.rotulo} ${o.detalhe ?? ''}`);
    const encontrados = config.opcoes
      .filter((o) => termo === '' || alvo(o).includes(termo))
      .sort((a, b) => Number(!normalizar(a.rotulo).startsWith(termo)) - Number(!normalizar(b.rotulo).startsWith(termo)));
    lista.replaceChildren();
    if (encontrados.length === 0) {
      const vazio = document.createElement('li');
      vazio.className = 'combo__vazio';
      vazio.textContent = config.opcoes.length === 0 ? 'Nada cadastrado ainda.' : 'Nenhum sabor encontrado.';
      lista.append(vazio);
    }
    encontrados.forEach((opcao) => {
      const li = document.createElement('li');
      li.dataset.id = opcao.id;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      if (opcao.desabilitada) li.setAttribute('aria-disabled', 'true');
      li.textContent = opcao.rotulo;
      if (opcao.detalhe) {
        const detalhe = document.createElement('small');
        detalhe.textContent = opcao.detalhe;
        li.append(detalhe);
      }
      li.addEventListener('click', () => {
        if (!opcao.desabilitada) escolher(opcao);
      });
      lista.append(li);
    });
    lista.onmousedown = (evento) => evento.preventDefault(); // mantém o foco (e o teclado) no campo
    lista.hidden = false;
    entrada.setAttribute('aria-expanded', 'true');
    destaque = -1;
  };

  entrada.addEventListener('focus', () => {
    abrir();
    // Sobe a linha na tela para a lista ficar visível acima do teclado do celular.
    raiz.closest<HTMLElement>('[data-linha]')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  entrada.addEventListener('input', () => {
    sincronizar();
    abrir();
  });
  entrada.addEventListener('keydown', (evento) => {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      if (lista.hidden) abrir();
      marcar(destaque + 1);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      marcar(destaque - 1);
    } else if (evento.key === 'Enter' && !lista.hidden) {
      const li = itens()[destaque] ?? (itens().length === 1 ? itens()[0] : undefined);
      const opcao = config.opcoes.find((o) => o.id === li?.dataset.id);
      if (opcao && !opcao.desabilitada) {
        evento.preventDefault();
        escolher(opcao);
      }
    } else if (evento.key === 'Escape') {
      fechar();
    }
  });
  entrada.addEventListener('blur', () => {
    const achado = achar(entrada.value);
    if (achado) entrada.value = achado.rotulo; // padroniza maiúsculas/acentos
    sincronizar();
    fechar();
  });

  return {
    raiz,
    entrada,
    oculto,
    idSelecionado: () => oculto.value,
    definir: (id) => {
      entrada.value = config.opcoes.find((o) => o.id === id)?.rotulo ?? '';
      sincronizar();
    },
    atualizar: sincronizar,
    limpar: () => {
      entrada.value = '';
      sincronizar();
    },
  };
}
