/** Busca de sabor das páginas Catálogo e Estoque: digitar "mara" sugere "Maracujá" e abre o sabor. */
import { criarCombo, type OpcaoCombo } from './combo.js';

interface DadosBusca {
  readonly urlBase: string;
  readonly selecionadoId: string;
  readonly opcoes: readonly OpcaoCombo[];
}

document.querySelectorAll<HTMLElement>('[data-busca-sabor]').forEach((raiz, indice) => {
  const espaco = raiz.querySelector<HTMLElement>('[data-espaco-busca]');
  const script = raiz.querySelector<HTMLScriptElement>('[data-dados-busca]');
  if (!espaco || !script) return;
  const dados = JSON.parse(script.textContent ?? '{}') as DadosBusca;

  const combo = criarCombo({
    opcoes: dados.opcoes,
    idLista: `busca-sabor-${indice}`,
    nomeCampo: 'sabor',
    textoVazio: 'Nenhum sabor encontrado.',
    placeholder: 'Digite o nome do sabor…',
    rotuloAria: 'Buscar sabor',
    aoMudar: () => undefined,
    aoEscolher: () => {
      window.location.href = `${dados.urlBase}?sabor=${encodeURIComponent(combo.idSelecionado())}`;
    },
  });
  espaco.replaceWith(combo.raiz);
  combo.definir(dados.selecionadoId);
  // O campo oculto só serve à busca; não deve ser enviado por nenhum formulário.
  combo.oculto.removeAttribute('name');
});
