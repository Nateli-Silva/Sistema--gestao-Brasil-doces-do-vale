/** Formulário de produção: em cada categoria, linhas de "sabor (sugestão) + quantidade". */

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
      const quantidade = Number(obter<HTMLInputElement>(linha, 'input').value) || 0;
      if (obter<HTMLSelectElement>(linha, 'select').value) total += quantidade;
    });
    totalEl.textContent = `${total.toLocaleString('pt-BR')} un.`;
  };

  const adicionarLinha = (bloco: HTMLElement, produtoId = '', quantidade = ''): void => {
    const categoriaId = bloco.dataset.categoria ?? '';
    const linha = document.createElement('div');
    linha.className = 'item-producao-linha';
    linha.innerHTML = `
      <select name="produtoId" aria-label="Sabor"></select>
      <input name="quantidade" type="number" min="1" step="1" inputmode="numeric" placeholder="Qtd." aria-label="Quantidade produzida">
      <button type="button" class="botao botao--fantasma botao--pequeno" aria-label="Remover linha" title="Remover">×</button>`;
    const seletor = obter<HTMLSelectElement>(linha, 'select');
    seletor.append(opcao('', 'Escolha o sabor…'));
    dados.produtos
      .filter((p) => p.categoriaId === categoriaId)
      .forEach((p) => seletor.append(opcao(p.id, p.sabor, p.id === produtoId)));
    obter<HTMLInputElement>(linha, 'input').value = quantidade;
    const area = obter<HTMLElement>(bloco, '[data-linhas]');
    obter<HTMLButtonElement>(linha, 'button').addEventListener('click', () => {
      // Cada categoria mantém ao menos uma linha; se for a última, apenas limpa.
      if (area.children.length > 1) linha.remove();
      else {
        seletor.value = '';
        obter<HTMLInputElement>(linha, 'input').value = '';
      }
      recalcular();
    });
    area.append(linha);
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
