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
  readonly baseValor: string;
  readonly valor: string;
}

interface DadosVenda {
  readonly clientes: readonly OpcaoCombo[];
  readonly clienteInicial: string;
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

const LINHA_VAZIA: LinhaInicial = { produtoId: '', formato: 'UNIDADE', quantidade: '1', unidadesPorCaixa: '', baseValor: 'CAIXA', valor: '' };

const MODELO_LINHA = `
  <div data-espaco-produto></div>
  <div class="segmento" role="group" aria-label="Vender por">
    <button type="button" data-formato="UNIDADE"><strong>UN</strong><small>valor unitário</small></button>
    <button type="button" data-formato="CAIXA"><strong>Caixa</strong><small>valor da caixa</small></button>
    <input type="hidden" name="formato" value="UNIDADE">
  </div>
  <div class="item-venda__campos">
    <label class="campo-mini"><span data-rotulo-quantidade>Quantidade</span>
      <input name="quantidade" type="number" min="1" step="1" inputmode="numeric"></label>
    <label class="campo-mini" data-so-caixa><span>Unidades por caixa</span>
      <input name="unidadesPorCaixa" type="number" min="1" step="1" inputmode="numeric" placeholder="Ex.: 12"></label>
    <label class="campo-mini" data-so-caixa><span>Informar o valor</span>
      <select name="baseValor"><option value="CAIXA">Da caixa inteira</option><option value="UNIDADE">De cada unidade</option></select></label>
    <label class="campo-mini"><span data-rotulo-valor>Valor unitário (R$)</span>
      <input name="valor" inputmode="decimal" placeholder="0,00"></label>
  </div>
  <div class="item-venda__rodape">
    <small data-resumo></small>
    <output class="item-venda__subtotal" data-subtotal>R$ 0,00</output>
    <button type="button" class="botao botao--fantasma botao--pequeno" data-remover>Remover</button>
  </div>
  <p class="campo__erro item-venda__aviso" data-aviso></p>`;

/** Busca de cliente: digitar "Pedro" lista os Pedros cadastrados (também por razão social, documento ou telefone). */
function iniciarCliente(formulario: HTMLFormElement, dados: DadosVenda): void {
  const espaco = obter<HTMLElement>(formulario, '[data-espaco-cliente]');
  const combo = criarCombo({
    opcoes: dados.clientes,
    idLista: 'sugestoes-clientes',
    nomeCampo: 'clienteId',
    textoVazio: 'Nenhum cliente encontrado.',
    placeholder: 'Buscar cliente pelo nome…',
    rotuloAria: 'Cliente (digite para buscar)',
    aoMudar: () => {
      const texto = combo.entrada.value.trim();
      combo.entrada.setCustomValidity(
        texto === '' ? 'Escolha o cliente.' : combo.idSelecionado() === '' ? 'Escolha um cliente da lista.' : '',
      );
    },
    aoEscolher: () => undefined,
  });
  espaco.replaceWith(combo.raiz);
  combo.definir(dados.clienteInicial);
}

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
    return obter<HTMLInputElement>(linha, 'input[name=formato]').value === 'CAIXA' ? quantidade * porCaixa : quantidade;
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
      const ehCaixa = obter<HTMLInputElement>(linha, 'input[name=formato]').value === 'CAIXA';
      const quantidade = Number(obter<HTMLInputElement>(linha, 'input[name=quantidade]').value) || 0;
      const valor = paraCentavos(obter<HTMLInputElement>(linha, 'input[name=valor]').value);
      const unidades = unidadesDaLinha(linha);
      const porUnidade = ehCaixa && obter<HTMLSelectElement>(linha, 'select[name=baseValor]').value === 'UNIDADE';
      const subtotal = Number.isNaN(valor) ? 0 : Math.round(porUnidade ? unidades * valor : quantidade * valor);
      total += subtotal;
      obter<HTMLElement>(linha, '[data-subtotal]').textContent = formatar(subtotal);
      // Na caixa, mostra o outro valor calculado (por unidade ou por caixa).
      const caixas = Number(obter<HTMLInputElement>(linha, 'input[name=quantidade]').value) || 0;
      const outro = ehCaixa && unidades > 0 && subtotal > 0
        ? ` · ${formatar(Math.round(subtotal / unidades))} cada · ${formatar(Math.round(subtotal / (caixas || 1)))} por caixa`
        : '';
      obter<HTMLElement>(linha, '[data-resumo]').textContent = ehCaixa && unidades > 0 ? `= ${unidades.toLocaleString('pt-BR')} unidades${outro}` : '';
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
    const formato = obter<HTMLInputElement>(linha, 'input[name=formato]');
    const valor = campo('valor');
    const base = obter<HTMLSelectElement>(linha, 'select[name=baseValor]');
    const quantidade = campo('quantidade');
    let valorManual = inicial.valor !== '';

    /** Sugere o valor do cadastro enquanto a pessoa não digitou um valor próprio. */
    const sugerirValor = (): void => {
      if (valorManual) return;
      const produto = produtoPorId.get(combo.idSelecionado());
      const porCaixa = Number(campo('unidadesPorCaixa').value) || 0;
      if (!produto) valor.value = '';
      else if (formato.value === 'CAIXA' && base.value === 'CAIXA') valor.value = porCaixa > 0 ? paraCampo(produto.precoCentavos * porCaixa) : '';
      else valor.value = paraCampo(produto.precoCentavos); // unidade, ou caixa informada por unidade
    };

    const ajustarFormato = (): void => {
      const ehCaixa = formato.value === 'CAIXA';
      linha.classList.toggle('item-venda--caixa', ehCaixa);
      linha.querySelectorAll<HTMLButtonElement>('[data-formato]').forEach((botao) => botao.setAttribute('aria-pressed', String(botao.dataset.formato === formato.value)));
      obter<HTMLElement>(linha, '[data-rotulo-quantidade]').textContent = ehCaixa ? 'Nº de caixas' : 'Quantidade';
      obter<HTMLElement>(linha, '[data-rotulo-valor]').textContent = !ehCaixa || base.value === 'UNIDADE' ? 'Valor de cada unidade (R$)' : 'Valor da caixa (R$)';
      sugerirValor();
    };

    const combo = criarCombo({
      opcoes,
      idLista: `produtos-${contador++}`,
      nomeCampo: 'produtoId',
      textoVazio: 'Nenhum produto encontrado.',
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
    base.value = inicial.baseValor === 'UNIDADE' ? 'UNIDADE' : 'CAIXA';
    quantidade.value = inicial.quantidade;
    campo('unidadesPorCaixa').value = inicial.unidadesPorCaixa;
    valor.value = inicial.valor;
    combo.definir(inicial.produtoId);
    ajustarFormato();

    linha.querySelectorAll<HTMLButtonElement>('[data-formato]').forEach((botao) =>
      botao.addEventListener('click', () => {
        formato.value = botao.dataset.formato === 'CAIXA' ? 'CAIXA' : 'UNIDADE';
        ajustarFormato();
        recalcular();
      }),
    );
    // Ao trocar entre "da caixa" e "de cada unidade", converte o valor já digitado.
    let baseAnterior = base.value;
    base.addEventListener('change', () => {
      const porCaixa = Number(campo('unidadesPorCaixa').value) || 0;
      const digitado = paraCentavos(valor.value);
      if (valorManual && porCaixa > 0 && !Number.isNaN(digitado)) {
        valor.value = paraCampo(base.value === 'UNIDADE' && baseAnterior === 'CAIXA' ? digitado / porCaixa : digitado * porCaixa);
      }
      baseAnterior = base.value;
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

  iniciarCliente(formulario, dados);

  obter<HTMLButtonElement>(formulario, '[data-adicionar-item]').addEventListener('click', () =>
    adicionarLinha(LINHA_VAZIA),
  );
  (dados.linhas.length > 0 ? dados.linhas : [LINHA_VAZIA]).forEach(adicionarLinha);
  recalcular();
}

const formulario = document.querySelector<HTMLFormElement>('[data-formulario-venda]');
if (formulario) iniciar(formulario);
