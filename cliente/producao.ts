/** Linhas dinâmicas do formulário de produção: categoria → sabor (filtrado) → quantidade. */

interface CategoriaProducao {
  readonly id: string;
  readonly nome: string;
}

interface ProdutoProducao {
  readonly id: string;
  readonly categoriaId: string;
  readonly sabor: string;
  readonly estoque: number;
}

interface LinhaInicial {
  readonly produtoId: string;
  readonly quantidade: string;
}

interface DadosProducao {
  readonly categorias: readonly CategoriaProducao[];
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
  const container = obter<HTMLElement>(formulario, '[data-itens]');
  const totalEl = obter<HTMLElement>(formulario, '[data-total]');
  const produtoPorId = new Map(dados.produtos.map((p) => [p.id, p]));

  const recalcular = (): void => {
    let total = 0;
    container.querySelectorAll<HTMLElement>('.item-producao-linha').forEach((linha) => {
      const quantidade = Number(obter<HTMLInputElement>(linha, 'input').value) || 0;
      if (obter<HTMLSelectElement>(linha, 'select[name=produtoId]').value) total += quantidade;
    });
    totalEl.textContent = `${total.toLocaleString('pt-BR')} un.`;
  };

  /** Recarrega a lista de sabores da linha conforme a categoria escolhida. */
  const preencherSabores = (linha: HTMLElement, categoriaId: string, produtoId = ''): void => {
    const seletor = obter<HTMLSelectElement>(linha, 'select[name=produtoId]');
    seletor.replaceChildren(opcao('', categoriaId ? 'Escolha o sabor…' : 'Escolha a categoria primeiro'));
    dados.produtos
      .filter((p) => p.categoriaId === categoriaId)
      .forEach((p) => seletor.append(opcao(p.id, `${p.sabor} (estoque: ${p.estoque})`, p.id === produtoId)));
    seletor.disabled = categoriaId === '';
  };

  const adicionarLinha = (produtoId = '', quantidade = ''): void => {
    const categoriaInicial = produtoPorId.get(produtoId)?.categoriaId ?? '';
    const linha = document.createElement('div');
    linha.className = 'item-venda item-producao-linha';
    linha.innerHTML = `
      <select data-categoria aria-label="Categoria"></select>
      <select name="produtoId" aria-label="Sabor"></select>
      <input name="quantidade" type="number" min="1" step="1" inputmode="numeric" placeholder="Qtd." aria-label="Quantidade produzida">
      <button type="button" class="botao botao--fantasma botao--pequeno" aria-label="Remover linha">Remover</button>`;
    const categoria = obter<HTMLSelectElement>(linha, '[data-categoria]');
    categoria.append(opcao('', 'Categoria…'));
    dados.categorias.forEach((c) => categoria.append(opcao(c.id, c.nome, c.id === categoriaInicial)));
    preencherSabores(linha, categoriaInicial, produtoId);
    obter<HTMLInputElement>(linha, 'input').value = quantidade;
    categoria.addEventListener('change', () => preencherSabores(linha, categoria.value));
    obter<HTMLButtonElement>(linha, 'button').addEventListener('click', () => {
      if (container.children.length > 1) linha.remove();
      recalcular();
    });
    container.append(linha);
  };

  container.addEventListener('input', recalcular);
  container.addEventListener('change', recalcular);
  obter<HTMLButtonElement>(formulario, '[data-adicionar-item]').addEventListener('click', () => {
    adicionarLinha();
    recalcular();
  });

  (dados.linhas.length > 0 ? dados.linhas : [{ produtoId: '', quantidade: '' }]).forEach((l) => adicionarLinha(l.produtoId, l.quantidade));
  recalcular();
}

const formulario = document.querySelector<HTMLFormElement>('[data-formulario-producao]');
if (formulario) iniciar(formulario);

export {};
