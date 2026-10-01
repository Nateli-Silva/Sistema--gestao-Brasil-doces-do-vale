/** Formulário de produção: em cada categoria, linhas de "sabor (busca com sugestões) + quantidade". */
import { criarCombo, type OpcaoCombo } from './combo.js';

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

function iniciar(formulario: HTMLFormElement): void {
  const dados = JSON.parse(obter<HTMLScriptElement>(document, '#dados-producao').textContent ?? '{}') as DadosProducao;
  const totalEl = obter<HTMLElement>(formulario, '[data-total]');
  const categoriaDoProduto = new Map(dados.produtos.map((p) => [p.id, p.categoriaId]));
  let contador = 0;

  const recalcular = (): void => {
    let total = 0;
    formulario.querySelectorAll<HTMLElement>('[data-linha]').forEach((linha) => {
      const quantidade = Number(obter<HTMLInputElement>(linha, 'input[name=quantidade]').value) || 0;
      if (obter<HTMLInputElement>(linha, 'input[name=produtoId]').value) total += quantidade;
    });
    totalEl.textContent = `${total.toLocaleString('pt-BR')} un.`;
  };

  const adicionarLinha = (bloco: HTMLElement, produtoId = '', quantidade = ''): void => {
    const categoriaId = bloco.dataset.categoria ?? '';
    const opcoes: OpcaoCombo[] = dados.produtos.filter((p) => p.categoriaId === categoriaId).map((p) => ({ id: p.id, rotulo: p.sabor }));
    const linha = document.createElement('div');
    linha.className = 'item-producao-linha';
    linha.dataset.linha = '';
    linha.innerHTML = `
      <input name="quantidade" type="number" min="1" step="1" inputmode="numeric" placeholder="Qtd." aria-label="Quantidade produzida">
      <button type="button" class="botao botao--fantasma botao--pequeno" aria-label="Remover linha" title="Remover">×</button>`;
    const campoQuantidade = obter<HTMLInputElement>(linha, 'input[name=quantidade]');

    const combo = criarCombo({
      opcoes,
      idLista: `sugestoes-${categoriaId}-${contador++}`,
      nomeCampo: 'produtoId',
      placeholder: 'Buscar sabor…',
      rotuloAria: 'Sabor (digite para buscar)',
      aoMudar: () => {
        const texto = combo.entrada.value.trim();
        combo.entrada.setCustomValidity(
          texto !== '' && combo.idSelecionado() === ''
            ? 'Escolha um sabor da lista.'
            : texto === '' && campoQuantidade.value !== ''
              ? 'Escolha o sabor desta quantidade.'
              : '',
        );
        recalcular();
      },
      aoEscolher: () => campoQuantidade.focus(), // depois do sabor, a quantidade
    });
    linha.prepend(combo.raiz);
    combo.definir(produtoId);
    campoQuantidade.value = quantidade;
    campoQuantidade.addEventListener('input', combo.atualizar);

    const area = obter<HTMLElement>(bloco, '[data-linhas]');
    obter<HTMLButtonElement>(linha, 'button').addEventListener('click', () => {
      // Cada categoria mantém ao menos uma linha; se for a última, apenas limpa.
      if (area.children.length > 1) linha.remove();
      else {
        combo.limpar();
        campoQuantidade.value = '';
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

  recalcular();
}

const formulario = document.querySelector<HTMLFormElement>('[data-formulario-producao]');
if (formulario) iniciar(formulario);
