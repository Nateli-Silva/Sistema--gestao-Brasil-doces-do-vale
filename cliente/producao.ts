/** Formulário de produção: em cada categoria, linhas de "sabor (busca com sugestões) + quantidade". */

interface ProdutoProducao {
  readonly id: string;
  readonly categoriaId: string;
  readonly sabor: string;
}

interface LinhaInicial {
  readonly produtoId: string;
  readonly quantidade: string;
}

interface DadosProducao {
  readonly produtos: readonly ProdutoProducao[];
  readonly linhas: readonly LinhaInicial[];
}

function obter<T extends Element>(raiz: ParentNode, seletor: string): T {
  const elemento = raiz.querySelector<T>(seletor);
  if (!elemento) throw new Error(`Elemento não encontrado: ${seletor}`);
  return elemento;
}

function opcao(valor: string, rotulo: string, selecionado = false): HTMLOptionElement {
  const elemento = document.createElement('option');
  elemento.value = valor;
  elemento.textContent = rotulo;
  elemento.selected = selecionado;
  return elemento;
}

function iniciar(formulario: HTMLFormElement): void {
  const dados = JSON.parse(obter<HTMLScriptElement>(document, '#dados-producao').textContent ?? '{}') as DadosProducao;
  const totalEl = obter<HTMLElement>(formulario, '[data-total]');
  const categoriaDoProduto = new Map(dados.produtos.map((p) => [p.id, p.categoriaId]));

  const recalcular = (): void => {
    let total = 0;
    formulario.querySelectorAll<HTMLElement>('.item-producao-linha').forEach((linha) => {
      const quantidade = Number(obter<HTMLInputElement>(linha, 'input[name=quantidade]').value) || 0;
      if (obter<HTMLInputElement>(linha, 'input[name=produtoId]').value) total += quantidade;
    });
    totalEl.textContent = `${total.toLocaleString('pt-BR')} un.`;
  };

  /** Minúsculas e sem acentos, para "maracuja" encontrar "Maracujá". */
  const normalizar = (texto: string): string =>
    texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLocaleLowerCase('pt-BR');

  let contadorLinhas = 0;

  const adicionarLinha = (bloco: HTMLElement, produtoId = '', quantidade = ''): void => {
    const categoriaId = bloco.dataset.categoria ?? '';
    const sabores = dados.produtos.filter((p) => p.categoriaId === categoriaId);
    const idLista = `sugestoes-${categoriaId}-${contadorLinhas++}`;
    const linha = document.createElement('div');
    linha.className = 'item-producao-linha';
    linha.innerHTML = `
      <div class="combo">
        <input type="text" data-busca role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${idLista}" placeholder="Buscar sabor…" autocomplete="off" autocapitalize="none" aria-label="Sabor (digite para buscar)">
        <ul class="combo__lista" id="${idLista}" role="listbox" hidden></ul>
      </div>
      <input type="hidden" name="produtoId">
      <input name="quantidade" type="number" min="1" step="1" inputmode="numeric" placeholder="Qtd." aria-label="Quantidade produzida">
      <button type="button" class="botao botao--fantasma botao--pequeno" aria-label="Remover linha" title="Remover">×</button>`;
    const busca = obter<HTMLInputElement>(linha, '[data-busca]');
    const lista = obter<HTMLUListElement>(linha, '.combo__lista');
    const oculto = obter<HTMLInputElement>(linha, 'input[name=produtoId]');
    const campoQuantidade = obter<HTMLInputElement>(linha, 'input[name=quantidade]');
    let destaque = -1;

    const achar = (texto: string): ProdutoProducao | undefined => sabores.find((p) => normalizar(p.sabor) === normalizar(texto));

    /** Liga o texto ao sabor cadastrado e avisa (validação do navegador) quando é inválido. */
    const sincronizar = (): void => {
      const achado = achar(busca.value);
      oculto.value = achado?.id ?? '';
      busca.setCustomValidity(
        busca.value.trim() !== '' && !achado
          ? 'Escolha um sabor da lista.'
          : busca.value.trim() === '' && campoQuantidade.value !== ''
            ? 'Escolha o sabor desta quantidade.'
            : '',
      );
    };

    const fechar = (): void => {
      lista.hidden = true;
      busca.setAttribute('aria-expanded', 'false');
      destaque = -1;
    };

    const escolher = (sabor: ProdutoProducao): void => {
      busca.value = sabor.sabor;
      sincronizar();
      fechar();
      campoQuantidade.focus(); // segue o fluxo: depois do sabor, a quantidade
    };

    const itens = (): HTMLLIElement[] => Array.from(lista.querySelectorAll<HTMLLIElement>('li[data-id]'));

    const marcar = (indice: number): void => {
      const todos = itens();
      if (todos.length === 0) return;
      destaque = (indice + todos.length) % todos.length;
      todos.forEach((li, i) => li.setAttribute('aria-selected', String(i === destaque)));
      todos[destaque]?.scrollIntoView({ block: 'nearest' });
    };

    /** Abre a lista logo abaixo do campo, filtrada pelo que foi digitado. */
    const abrir = (): void => {
      const termo = normalizar(busca.value);
      const encontrados = sabores
        .filter((p) => termo === '' || normalizar(p.sabor).includes(termo))
        .sort((x, y) => Number(!normalizar(x.sabor).startsWith(termo)) - Number(!normalizar(y.sabor).startsWith(termo)));
      lista.replaceChildren();
      if (encontrados.length === 0) {
        const vazio = document.createElement('li');
        vazio.className = 'combo__vazio';
        vazio.textContent = sabores.length === 0 ? 'Nenhum sabor cadastrado nesta categoria.' : 'Nenhum sabor encontrado.';
        lista.append(vazio);
      }
      encontrados.forEach((p) => {
        const li = document.createElement('li');
        li.dataset.id = p.id;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        li.textContent = p.sabor;
        li.addEventListener('click', () => escolher(p));
        lista.append(li);
      });
      // Mantém o foco no campo ao tocar na lista (senão o teclado fecharia antes do clique).
      lista.onmousedown = (evento) => evento.preventDefault();
      lista.hidden = false;
      busca.setAttribute('aria-expanded', 'true');
      destaque = -1;
    };

    const inicial = sabores.find((p) => p.id === produtoId);
    busca.value = inicial?.sabor ?? '';
    campoQuantidade.value = quantidade;

    busca.addEventListener('focus', () => {
      abrir();
      // Sobe a linha na tela para a lista ficar visível acima do teclado do celular.
      linha.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    busca.addEventListener('input', () => {
      sincronizar();
      abrir();
    });
    busca.addEventListener('keydown', (evento) => {
      if (evento.key === 'ArrowDown') {
        evento.preventDefault();
        if (lista.hidden) abrir();
        marcar(destaque + 1);
      } else if (evento.key === 'ArrowUp') {
        evento.preventDefault();
        marcar(destaque - 1);
      } else if (evento.key === 'Enter' && !lista.hidden) {
        const escolhido = itens()[destaque] ?? (itens().length === 1 ? itens()[0] : undefined);
        if (escolhido) {
          evento.preventDefault();
          escolher(sabores.find((p) => p.id === escolhido.dataset.id) ?? sabores[0]!);
        }
      } else if (evento.key === 'Escape') {
        fechar();
      }
    });
    busca.addEventListener('blur', () => {
      // Ao sair, se o texto bate com um sabor, padroniza o nome (maiúsculas/acentos).
      const achado = achar(busca.value);
      if (achado) busca.value = achado.sabor;
      sincronizar();
      fechar();
    });
    campoQuantidade.addEventListener('input', sincronizar);

    const area = obter<HTMLElement>(bloco, '[data-linhas]');
    obter<HTMLButtonElement>(linha, 'button').addEventListener('click', () => {
      // Cada categoria mantém ao menos uma linha; se for a última, apenas limpa.
      if (area.children.length > 1) linha.remove();
      else {
        busca.value = '';
        campoQuantidade.value = '';
        sincronizar();
      }
      recalcular();
    });
    area.append(linha);
    sincronizar();
  };

  formulario.querySelectorAll<HTMLElement>('[data-categoria]').forEach((bloco) => {
    const iniciais = dados.linhas.filter((l) => categoriaDoProduto.get(l.produtoId) === bloco.dataset.categoria);
    (iniciais.length > 0 ? iniciais : [{ produtoId: '', quantidade: '' }]).forEach((l) => adicionarLinha(bloco, l.produtoId, l.quantidade));
    obter<HTMLButtonElement>(bloco, '[data-adicionar-sabor]').addEventListener('click', () => adicionarLinha(bloco));
  });

  formulario.addEventListener('input', recalcular);
  formulario.addEventListener('change', recalcular);
  recalcular();
}

const formulario = document.querySelector<HTMLFormElement>('[data-formulario-producao]');
if (formulario) iniciar(formulario);

export {};
