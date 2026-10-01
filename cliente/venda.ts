/** Linhas dinâmicas do formulário de venda: seleção de produto, quantidade, subtotal e total. */

interface ProdutoVenda {
  readonly id: string;
  readonly categoria: string;
  readonly sabor: string;
  readonly precoCentavos: number;
  readonly estoque: number;
}

interface LinhaInicial {
  readonly produtoId: string;
  readonly quantidade: string;
}

interface DadosVenda {
  readonly produtos: readonly ProdutoVenda[];
  readonly linhas: readonly LinhaInicial[];
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatar = (centavos: number): string => moeda.format(centavos / 100);

function obter<T extends Element>(raiz: ParentNode, seletor: string): T {
  const elemento = raiz.querySelector<T>(seletor);
  if (!elemento) throw new Error(`Elemento não encontrado: ${seletor}`);
  return elemento;
}

function criarOpcoes(produtos: readonly ProdutoVenda[]): string {
  const grupos = new Map<string, ProdutoVenda[]>();
  for (const p of produtos) grupos.set(p.categoria, [...(grupos.get(p.categoria) ?? []), p]);
  const escapar = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const grupoHtml = [...grupos].map(([categoria, itens]) =>
    `<optgroup label="${escapar(categoria)}">${itens
      .map((p) => `<option value="${p.id}" ${p.estoque <= 0 ? 'disabled' : ''}>${escapar(p.sabor)} — ${formatar(p.precoCentavos)} (${p.estoque} em estoque)</option>`)
      .join('')}</optgroup>`,
  );
  return `<option value="">Selecione o produto…</option>${grupoHtml.join('')}`;
}

function iniciar(formulario: HTMLFormElement): void {
  const dados = JSON.parse(obter<HTMLScriptElement>(document, '#dados-venda').textContent ?? '{}') as DadosVenda;
  const container = obter<HTMLElement>(formulario, '[data-itens]');
  const totalEl = obter<HTMLElement>(formulario, '[data-total]');
  const porId = new Map(dados.produtos.map((p) => [p.id, p]));
  const opcoes = criarOpcoes(dados.produtos);

  const recalcular = (): void => {
    let total = 0;
    container.querySelectorAll<HTMLElement>('.item-venda').forEach((linha) => {
      const produto = porId.get(obter<HTMLSelectElement>(linha, 'select').value);
      const quantidade = Number(obter<HTMLInputElement>(linha, 'input').value) || 0;
      const subtotal = produto ? produto.precoCentavos * quantidade : 0;
      total += subtotal;
      obter<HTMLElement>(linha, '[data-subtotal]').textContent = formatar(subtotal);
      const aviso = obter<HTMLElement>(linha, '[data-aviso]');
      aviso.textContent = produto && quantidade > produto.estoque ? `Só há ${produto.estoque} em estoque.` : '';
    });
    totalEl.textContent = formatar(total);
  };

  const adicionarLinha = (produtoId = '', quantidade = '1'): void => {
    const linha = document.createElement('div');
    linha.className = 'item-venda';
    linha.innerHTML = `
      <select name="produtoId" aria-label="Produto">${opcoes}</select>
      <input name="quantidade" type="number" min="1" step="1" inputmode="numeric" aria-label="Quantidade">
      <output class="item-venda__subtotal" data-subtotal>R$ 0,00</output>
      <button type="button" class="botao botao--fantasma botao--pequeno" aria-label="Remover item">Remover</button>
      <p class="campo__erro item-venda__aviso" data-aviso></p>`;
    obter<HTMLSelectElement>(linha, 'select').value = produtoId;
    obter<HTMLInputElement>(linha, 'input').value = quantidade;
    obter<HTMLButtonElement>(linha, 'button').addEventListener('click', () => {
      if (container.children.length > 1) linha.remove();
      recalcular();
    });
    container.append(linha);
  };

  container.addEventListener('input', recalcular);
  obter<HTMLButtonElement>(formulario, '[data-adicionar-item]').addEventListener('click', () => {
    adicionarLinha();
    recalcular();
  });

  (dados.linhas.length > 0 ? dados.linhas : [{ produtoId: '', quantidade: '1' }]).forEach((l) => adicionarLinha(l.produtoId, l.quantidade));
  recalcular();
}

const formulario = document.querySelector<HTMLFormElement>('[data-formulario-venda]');
if (formulario) iniciar(formulario);
export {};
