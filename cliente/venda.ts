/** Linhas dinâmicas do formulário de venda: produto, formato (unidade/caixa), quantidades e valor. */
import { criarCombo, type OpcaoCombo } from './combo.js';

interface ProdutoVenda {
  readonly id: string;
  readonly categoria: string;
  readonly sabor: string;
  readonly precoCentavos: number;
  readonly estoque: number;
}

interface LinhaInicial {
  readonly produtoId: string;
  readonly formato: string;
  readonly quantidade: string;
  readonly unidadesPorCaixa: string;
  readonly valor: string;
}

interface DadosVenda {
  readonly produtos: readonly ProdutoVenda[];
  readonly linhas: readonly LinhaInicial[];
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatar = (centavos: number): string => moeda.format(centavos / 100);
const paraCampo = (centavos: number): string => (centavos / 100).toFixed(2).replace('.', ',');

/** "12,50" ou "1.234,5" → centavos; NaN se vazio/inválido. */
function paraCentavos(texto: string): number {
  const limpo = texto.replace(/[R$\s]/g, '');
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  return /^\d+(\.\d{1,2})?$/.test(normalizado) ? Math.round(Number(normalizado) * 100) : Number.NaN;
}

function obter<T extends Element>(raiz: ParentNode, seletor: string): T {
  const elemento = raiz.querySelector<T>(seletor);
  if (!elemento) throw new Error(`Elemento não encontrado: ${seletor}`);
  return elemento;
}

const MODELO_LINHA = `
  <div data-espaco-produto></div>
  <div class="item-venda__campos">
    <label class="campo-mini"><span>Vender por</span>
      <select name="formato"><option value="UNIDADE">Unidade</option><option value="CAIXA">Caixa</option></select></label>
    <label class="campo-mini"><span data-rotulo-quantidade>Quantidade</span>
      <input name="quantidade" type="number" min="1" step="1" inputmode="numeric"></label>
    <label class="campo-mini" data-so-caixa><span>Unidades por caixa</span>
      <input name="unidadesPorCaixa" type="number" min="1" step="1" inputmode="numeric" placeholder="Ex.: 12"></label>
    <label class="campo-mini"><span data-rotulo-valor>Valor unitário (R$)</span>
      <input name="valor" inputmode="decimal" placeholder="0,00"></label>
  </div>
  <div class="item-venda__rodape">
    <small data-resumo></small>
    <output class="item-venda__subtotal" data-subtotal>R$ 0,00</output>
    <button type="button" class="botao botao--fantasma botao--pequeno" data-remover>Remover</button>
  </div>
  <p class="campo__erro item-venda__aviso" data-aviso></p>`;

function iniciar(formulario: HTMLFormElement): void {
  const dados = JSON.parse(obter<HTMLScriptElement>(document, '#dados-venda').textContent ?? '{}') as DadosVenda;
  const container = obter<HTMLElement>(formulario, '[data-itens]');
  const totalEl = obter<HTMLElement>(formulario, '[data-total]');
  const produtoPorId = new Map(dados.produtos.map((p) => [p.id, p]));
  const opcoes: OpcaoCombo[] = dados.produtos.map((p) => ({
    id: p.id,
    rotulo: p.sabor,
    detalhe: p.estoque > 0 ? `${p.categoria} · ${formatar(p.precoCentavos)} · ${p.estoque} em estoque` : `${p.categoria} · esgotado`,
    desabilitada: p.estoque <= 0,
  }));
  let contador = 0;

  /** Unidades que cada linha tira do estoque. */
  const unidadesDaLinha = (linha: HTMLElement): number => {
    const quantidade = Number(obter<HTMLInputElement>(linha, 'input[name=quantidade]').value) || 0;
    const porCaixa = Number(obter<HTMLInputElement>(linha, 'input[name=unidadesPorCaixa]').value) || 0;
    return obter<HTMLSelectElement>(linha, 'select[name=formato]').value === 'CAIXA' ? quantidade * porCaixa : quantidade;
  };

  const recalcular = (): void => {
    const linhas = Array.from(container.querySelectorAll<HTMLElement>('[data-linha]'));
    // Estoque conferido por sabor, somando todas as linhas do mesmo produto.
    const consumo = new Map<string, number>();
    linhas.forEach((l) => {
      const id = obter<HTMLInputElement>(l, 'input[name=produtoId]').value;
      if (id) consumo.set(id, (consumo.get(id) ?? 0) + unidadesDaLinha(l));
    });
    let total = 0;
    linhas.forEach((linha) => {
      const produto = produtoPorId.get(obter<HTMLInputElement>(linha, 'input[name=produtoId]').value);
      const ehCaixa = obter<HTMLSelectElement>(linha, 'select[name=formato]').value === 'CAIXA';
      const quantidade = Number(obter<HTMLInputElement>(linha, 'input[name=quantidade]').value) || 0;
      const valor = paraCentavos(obter<HTMLInputElement>(linha, 'input[name=valor]').value);
      const subtotal = Number.isNaN(valor) ? 0 : Math.round(quantidade * valor);
      total += subtotal;
      const unidades = unidadesDaLinha(linha);
      obter<HTMLElement>(linha, '[data-subtotal]').textContent = formatar(subtotal);
      obter<HTMLElement>(linha, '[data-resumo]').textContent = ehCaixa && unidades > 0 ? `= ${unidades.toLocaleString('pt-BR')} unidades no total` : '';
      obter<HTMLElement>(linha, '[data-aviso]').textContent =
        produto && (consumo.get(produto.id) ?? 0) > produto.estoque ? `Só há ${produto.estoque} unidades de ${produto.sabor} em estoque.` : '';
    });
    totalEl.textContent = formatar(total);
  };

  const adicionarLinha = (inicial: LinhaInicial): void => {
    const linha = document.createElement('div');
    linha.className = 'item-venda';
    linha.dataset.linha = '';
    linha.innerHTML = MODELO_LINHA;
    const campo = (nome: string): HTMLInputElement => obter<HTMLInputElement>(linha, `[name=${nome}]`);
    const formato = obter<HTMLSelectElement>(linha, 'select[name=formato]');
    const valor = campo('valor');
    const quantidade = campo('quantidade');
    let valorManual = inicial.valor !== '';

    /** Sugere o valor do cadastro enquanto a pessoa não digitou um valor próprio. */
    const sugerirValor = (): void => {
      if (valorManual) return;
      const produto = produtoPorId.get(combo.idSelecionado());
      const porCaixa = Number(campo('unidadesPorCaixa').value) || 0;
      if (!produto) valor.value = '';
      else if (formato.value === 'CAIXA') valor.value = porCaixa > 0 ? paraCampo(produto.precoCentavos * porCaixa) : '';
      else valor.value = paraCampo(produto.precoCentavos);
    };

    const ajustarFormato = (): void => {
      const ehCaixa = formato.value === 'CAIXA';
      linha.classList.toggle('item-venda--caixa', ehCaixa);
      obter<HTMLElement>(linha, '[data-rotulo-quantidade]').textContent = ehCaixa ? 'Nº de caixas' : 'Quantidade';
      obter<HTMLElement>(linha, '[data-rotulo-valor]').textContent = ehCaixa ? 'Valor da caixa (R$)' : 'Valor unitário (R$)';
      sugerirValor();
    };

    const combo = criarCombo({
      opcoes,
      idLista: `produtos-${contador++}`,
      nomeCampo: 'produtoId',
      placeholder: 'Buscar produto…',
      rotuloAria: 'Produto (digite para buscar)',
      aoMudar: () => {
        const texto = combo.entrada.value.trim();
        combo.entrada.setCustomValidity(texto !== '' && combo.idSelecionado() === '' ? 'Escolha um produto da lista.' : '');
        sugerirValor();
        recalcular();
      },
      aoEscolher: () => quantidade.focus(),
    });
    obter<HTMLElement>(linha, '[data-espaco-produto]').replaceWith(combo.raiz);

    formato.value = inicial.formato === 'CAIXA' ? 'CAIXA' : 'UNIDADE';
    quantidade.value = inicial.quantidade;
    campo('unidadesPorCaixa').value = inicial.unidadesPorCaixa;
    valor.value = inicial.valor;
    combo.definir(inicial.produtoId);
    ajustarFormato();

    formato.addEventListener('change', () => {
      ajustarFormato();
      recalcular();
    });
    campo('unidadesPorCaixa').addEventListener('input', () => {
      sugerirValor();
      recalcular();
    });
    valor.addEventListener('input', () => {
      valorManual = valor.value.trim() !== ''; // apagar o campo volta a sugerir o valor do cadastro
      if (!valorManual) sugerirValor();
      recalcular();
    });
    quantidade.addEventListener('input', recalcular);
    obter<HTMLButtonElement>(linha, '[data-remover]').addEventListener('click', () => {
      if (container.children.length > 1) linha.remove();
      recalcular();
    });
    container.append(linha);
  };

  obter<HTMLButtonElement>(formulario, '[data-adicionar-item]').addEventListener('click', () =>
    adicionarLinha({ produtoId: '', formato: 'UNIDADE', quantidade: '1', unidadesPorCaixa: '', valor: '' }),
  );
  (dados.linhas.length > 0 ? dados.linhas : [{ produtoId: '', formato: 'UNIDADE', quantidade: '1', unidadesPorCaixa: '', valor: '' }]).forEach(adicionarLinha);
  recalcular();
}

const formulario = document.querySelector<HTMLFormElement>('[data-formulario-venda]');
if (formulario) iniciar(formulario);
