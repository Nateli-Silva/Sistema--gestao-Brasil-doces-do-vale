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

  const normalizar = (texto: string): string => texto.trim().toLocaleLowerCase('pt-BR');

  /** Lista pesquisável (datalist) com os sabores da categoria, compartilhada pelas linhas do bloco. */
  const criarLista = (bloco: HTMLElement): string => {
    const categoriaId = bloco.dataset.categoria ?? '';
    const lista = document.createElement('datalist');
    lista.id = `sabores-${categoriaId}`;
    dados.produtos
      .filter((p) => p.categoriaId === categoriaId)
      .forEach((p) => lista.append(opcao(p.sabor, p.sabor)));
    bloco.append(lista);
    return lista.id;
  };

  const adicionarLinha = (bloco: HTMLElement, listaId: string, produtoId = '', quantidade = ''): void => {
    const categoriaId = bloco.dataset.categoria ?? '';
    const sabores = dados.produtos.filter((p) => p.categoriaId === categoriaId);
    const linha = document.createElement('div');
    linha.className = 'item-producao-linha';
    linha.innerHTML = `
      <input type="text" data-busca list="${listaId}" placeholder="Buscar sabor…" autocomplete="off" aria-label="Sabor (digite para buscar)">
      <input type="hidden" name="produtoId">
      <input name="quantidade" type="number" min="1" step="1" inputmode="numeric" placeholder="Qtd." aria-label="Quantidade produzida">
      <button type="button" class="botao botao--fantasma botao--pequeno" aria-label="Remover linha" title="Remover">×</button>`;
    const busca = obter<HTMLInputElement>(linha, '[data-busca]');
    const oculto = obter<HTMLInputElement>(linha, 'input[name=produtoId]');
    const campoQuantidade = obter<HTMLInputElement>(linha, 'input[name=quantidade]');

    /** Liga o texto digitado ao sabor cadastrado e avisa quando não existe na lista. */
    const sincronizar = (): void => {
      const achado = sabores.find((p) => normalizar(p.sabor) === normalizar(busca.value));
      oculto.value = achado?.id ?? '';
      busca.setCustomValidity(
        busca.value.trim() !== '' && !achado
          ? 'Escolha um sabor da lista.'
          : busca.value.trim() === '' && campoQuantidade.value !== ''
            ? 'Escolha o sabor desta quantidade.'
            : '',
      );
    };

    const inicial = sabores.find((p) => p.id === produtoId);
    busca.value = inicial?.sabor ?? '';
    campoQuantidade.value = quantidade;
    busca.addEventListener('input', sincronizar);
    campoQuantidade.addEventListener('input', sincronizar);
    busca.addEventListener('blur', () => {
      // Ao sair do campo, padroniza o texto com o nome cadastrado (maiúsculas/acentos).
      const achado = sabores.find((p) => normalizar(p.sabor) === normalizar(busca.value));
      if (achado) busca.value = achado.sabor;
    });

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
    const listaId = criarLista(bloco);
    (iniciais.length > 0 ? iniciais : [{ produtoId: '', quantidade: '' }]).forEach((l) => adicionarLinha(bloco, listaId, l.produtoId, l.quantidade));
    obter<HTMLButtonElement>(bloco, '[data-adicionar-sabor]').addEventListener('click', () => adicionarLinha(bloco, listaId));
  });

  formulario.addEventListener('input', recalcular);
  formulario.addEventListener('change', recalcular);
  recalcular();
}

const formulario = document.querySelector<HTMLFormElement>('[data-formulario-producao]');
if (formulario) iniciar(formulario);

export {};
