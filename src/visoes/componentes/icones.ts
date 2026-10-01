import type { ChaveCategoria } from '../../dominio/tipos.js';
import { bruto, type HtmlSeguro } from '../html.js';

/**
 * Ícones SVG próprios, desenhados em grade 48×48 com o mesmo vocabulário visual:
 * contorno em chocolate (stroke), preenchimentos suaves em caramelo/creme/rosa,
 * brilho em creme e cantos arredondados. As cores vêm de variáveis CSS (--ic-*).
 */

const CONTORNO = 'fill="none" stroke="var(--ic-contorno)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

/** Corpos dos ícones das categorias (conteúdo interno do <svg viewBox="0 0 48 48">). */
const CORPOS_CATEGORIA: Readonly<Record<ChaveCategoria, string>> = {
  // Trufa: bola de chocolate com cacau em pó, sobre forminha pregueada.
  trufas: `
    <path d="M12 30h24l-3 11H15z" fill="var(--ic-rosa)" stroke="var(--ic-contorno)" stroke-width="2" stroke-linejoin="round"/>
    <path d="M19 30l1.5 11M24 30v11M29 30l-1.5 11" ${CONTORNO} stroke-width="1.5"/>
    <circle cx="24" cy="21" r="12" fill="var(--ic-chocolate)" stroke="var(--ic-contorno)" stroke-width="2"/>
    <path d="M17 17a8 8 0 0 1 6-5" fill="none" stroke="var(--ic-creme)" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>
    <g fill="var(--ic-creme)" opacity=".85"><circle cx="27" cy="19" r="1"/><circle cx="21" cy="25" r="1"/><circle cx="30" cy="25" r="1"/><circle cx="25" cy="14" r=".9"/></g>`,
  // Mini trufas: três bolinhas empilhadas em pirâmide.
  'mini-trufas': `
    <circle cx="15" cy="33" r="8.5" fill="var(--ic-chocolate)" stroke="var(--ic-contorno)" stroke-width="2"/>
    <circle cx="33" cy="33" r="8.5" fill="var(--ic-rosa)" stroke="var(--ic-contorno)" stroke-width="2"/>
    <circle cx="24" cy="17" r="8.5" fill="var(--ic-caramelo)" stroke="var(--ic-contorno)" stroke-width="2"/>
    <g fill="none" stroke="var(--ic-creme)" stroke-width="2" stroke-linecap="round" opacity=".75">
      <path d="M10.5 30a5 5 0 0 1 3.5-2.5"/><path d="M28.5 30a5 5 0 0 1 3.5-2.5"/><path d="M19.5 14a5 5 0 0 1 3.5-2.5"/>
    </g>`,
  // Cone trufado: casquinha quadriculada recheada com creme de chocolate e granulado.
  'cones-trufados': `
    <path d="M13 23h22L24 43z" fill="var(--ic-caramelo)"/>
    <clipPath id="ic-casquinha"><path d="M13 23h22L24 43z"/></clipPath><g clip-path="url(#ic-casquinha)" ${CONTORNO} stroke-width="1.3" opacity=".6"><path d="M10 25l24 24M18 22l24 24M26 22L8 40M34 22L14 46"/></g><path d="M13 23h22L24 43z" fill="none" stroke="var(--ic-contorno)" stroke-width="2" stroke-linejoin="round"/>
    <path d="M11 23c-1-7 4-13 13-13s14 6 13 13c-3 2-6-1-9 1-2 1.5-5 1.5-7 0-3-2-7 1-10-1z" fill="var(--ic-chocolate)" stroke="var(--ic-contorno)" stroke-width="2" stroke-linejoin="round"/>
    <path d="M17 17a7 7 0 0 1 5-4" fill="none" stroke="var(--ic-creme)" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>
    <g stroke="var(--ic-rosa)" stroke-width="2" stroke-linecap="round"><path d="M26 15l2-1"/><path d="M30 19l2 .5"/><path d="M22 20l1.5 1"/></g>`,
  // Alfajor: dois biscoitos redondos com doce de leite e borda de coco.
  alfajor: `
    <path d="M8 20v14c0 4 7 7 16 7s16-3 16-7V20z" fill="var(--ic-caramelo)"/>
    <path d="M8 26c0 4 7 7 16 7s16-3 16-7v5c0 4-7 7-16 7s-16-3-16-7z" fill="var(--ic-doce-de-leite)"/>
    <path d="M8 20v14c0 4 7 7 16 7s16-3 16-7V20" fill="none" stroke="var(--ic-contorno)" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="24" cy="20" rx="16" ry="7" fill="var(--ic-caramelo)" stroke="var(--ic-contorno)" stroke-width="2"/>
    <path d="M13 19a12 4.5 0 0 1 9-3" fill="none" stroke="var(--ic-creme)" stroke-width="2.2" stroke-linecap="round" opacity=".75"/>
    <g fill="var(--ic-creme)"><circle cx="13" cy="33" r="1"/><circle cx="20" cy="36.5" r="1"/><circle cx="28" cy="36.5" r="1"/><circle cx="35" cy="33" r="1"/></g>`,
  // Brigadeiro (cupcake): forminha rosa, cobertura de chocolate e granulado.
  brigadeiros: `
    <path d="M11 26h26l-3 15H14z" fill="var(--ic-rosa)" stroke="var(--ic-contorno)" stroke-width="2" stroke-linejoin="round"/>
    <path d="M18 26l1.5 15M24 26v15M30 26l-1.5 15" ${CONTORNO} stroke-width="1.5"/>
    <path d="M9 26c-2-6 2-10 7-10 1-5 5-8 8-8s7 3 8 8c5 0 9 4 7 10z" fill="var(--ic-chocolate)" stroke="var(--ic-contorno)" stroke-width="2" stroke-linejoin="round"/>
    <path d="M15 20a9 9 0 0 1 6-6" fill="none" stroke="var(--ic-creme)" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>
    <g stroke-width="2" stroke-linecap="round"><path d="M22 18l2-1.5" stroke="var(--ic-rosa)"/><path d="M28 21l2.5-.5" stroke="var(--ic-creme)"/><path d="M19 23l2 .5" stroke="var(--ic-caramelo)"/><path d="M27 14l1.5 1.5" stroke="var(--ic-rosa)"/><path d="M33 22l1.5-1" stroke="var(--ic-caramelo)"/></g>`,
};

/** Ícones de interface (traço único, herdam `currentColor`), grade 24×24. */
const CORPOS_INTERFACE = {
  painel: '<rect x="3.5" y="3.5" width="7" height="8" rx="2"/><rect x="13.5" y="3.5" width="7" height="5" rx="2"/><rect x="13.5" y="11.5" width="7" height="9" rx="2"/><rect x="3.5" y="14.5" width="7" height="6" rx="2"/>',
  vendas: '<path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/><path d="M10 13.5c.5 1 1.2 1.5 2 1.5s1.5-.5 2-1.5"/>',
  producao: '<path d="M6 11h12v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M4 11h16"/><path d="M9 11V8.5A3 3 0 0 1 12 5.5a3 3 0 0 1 3 3V11"/><path d="M9.5 15.5h5"/>',
  estoque: '<path d="M3.5 8 12 4l8.5 4v8L12 20l-8.5-4z"/><path d="M3.5 8 12 12l8.5-4M12 12v8"/>',
  clientes: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.4-3.2 2.7-5 5.5-5s5.1 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.5"/><path d="M16.5 14.2c2.2 0 3.7 1.4 4 3.8"/>',
  catalogo: '<path d="M5 4.5h10a3 3 0 0 1 3 3V19.5H8a3 3 0 0 1-3-3z"/><path d="M5 16.5a3 3 0 0 1 3-3h10"/><path d="M9.5 8h4"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  alerta: '<path d="M12 4 21 19H3z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  coroa: '<path d="m4 8 4 4 4-6 4 6 4-4-1.5 10h-13z"/>',
  moeda: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.5c-.5-1-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.2 0-2.1-.5-2.6-1.5M12 6.5V8M12 16v1.5"/>',
  recibo: '<path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2z"/><path d="M9 8.5h6M9 12h6"/>',
  busca: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  editar: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  coracao: '<path d="M12 20s-7.5-4.5-7.5-10A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 19.5 10c0 5.5-7.5 10-7.5 10z"/>',
  predio: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M10 20.5v-4h4v4"/>',
  pessoa: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-4 3.2-6 7-6s6.5 2 7 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  lixeira: '<path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13"/>',
} as const;

export type NomeIconeInterface = keyof typeof CORPOS_INTERFACE;

export function iconeCategoria(chave: ChaveCategoria, tamanho = 40): HtmlSeguro {
  return bruto(
    `<svg class="icone-categoria" width="${tamanho}" height="${tamanho}" viewBox="0 0 48 48" role="img" aria-hidden="true" focusable="false">${CORPOS_CATEGORIA[chave]}</svg>`,
  );
}

export function iconeInterface(nome: NomeIconeInterface, tamanho = 20): HtmlSeguro {
  return bruto(
    `<svg class="icone" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${CORPOS_INTERFACE[nome]}</svg>`,
  );
}

/** Logotipo da marca: forminha de doce com coração. */
export function logotipo(tamanho = 36): HtmlSeguro {
  return bruto(
    `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="22" fill="var(--ic-rosa)" opacity=".55"/><path d="M13 27h22l-2.5 11h-17z" fill="var(--ic-creme)" stroke="var(--ic-contorno)" stroke-width="2" stroke-linejoin="round"/><path d="M11 27c-1-8 4-14 13-14s14 6 13 14z" fill="var(--ic-chocolate)" stroke="var(--ic-contorno)" stroke-width="2" stroke-linejoin="round"/><path d="M24 22.5s-4-2-4-4.7a2.3 2.3 0 0 1 4-1.5 2.3 2.3 0 0 1 4 1.5c0 2.7-4 4.7-4 4.7z" fill="var(--ic-rosa)"/></svg>`,
  );
}
