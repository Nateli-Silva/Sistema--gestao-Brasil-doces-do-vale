/**
 * Janela de confirmação no estilo do sistema (substitui o confirm() do navegador).
 * Qualquer formulário com data-confirmar="mensagem" pede confirmação antes de enviar:
 *   data-titulo, data-botao e data-perigo="nao" (opcionais) ajustam o texto e a cor.
 */

export interface OpcoesConfirmacao {
  readonly titulo: string;
  readonly mensagem: string;
  readonly textoConfirmar: string;
  readonly perigo: boolean;
}

const ICONE_ALERTA =
  '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4 21 19H3z"/><path d="M12 10v4.5M12 17.2v.1"/></svg>';

/** Mostra a janela e devolve true se a pessoa confirmar (falso ao cancelar, tocar fora ou usar Esc). */
export function confirmar(opcoes: OpcoesConfirmacao): Promise<boolean> {
  return new Promise((resolver) => {
    const janela = document.createElement('dialog');
    janela.className = 'modal';
    janela.innerHTML = `
      <div class="modal__cartao">
        <span class="modal__icone ${opcoes.perigo ? 'modal__icone--perigo' : ''}">${ICONE_ALERTA}</span>
        <h2></h2>
        <p></p>
        <div class="modal__acoes">
          <button type="button" class="botao botao--suave" data-cancelar>Cancelar</button>
          <button type="button" class="botao ${opcoes.perigo ? 'botao--perigo-forte' : 'botao--primario'}" data-confirmar-acao></button>
        </div>
      </div>`;
    // Textos entram como texto puro (nunca como HTML), pois incluem nomes digitados por usuários.
    janela.querySelector('h2')!.textContent = opcoes.titulo;
    janela.querySelector('p')!.textContent = opcoes.mensagem;
    const botaoConfirmar = janela.querySelector<HTMLButtonElement>('[data-confirmar-acao]')!;
    botaoConfirmar.textContent = opcoes.textoConfirmar;

    let confirmado = false;
    botaoConfirmar.addEventListener('click', () => {
      confirmado = true;
      janela.close();
    });
    janela.querySelector('[data-cancelar]')!.addEventListener('click', () => janela.close());
    // Tocar fora do cartão cancela.
    janela.addEventListener('click', (evento) => {
      if (evento.target === janela) janela.close();
    });
    janela.addEventListener('close', () => {
      janela.remove();
      resolver(confirmado);
    });

    document.body.append(janela);
    janela.showModal();
    // O foco começa em "Cancelar": confirmar uma exclusão exige um toque intencional.
    janela.querySelector<HTMLButtonElement>('[data-cancelar]')!.focus();
  });
}

document.addEventListener('submit', (evento) => {
  const formulario = evento.target;
  if (!(formulario instanceof HTMLFormElement) || !formulario.dataset.confirmar) return;
  evento.preventDefault();
  void confirmar({
    titulo: formulario.dataset.titulo ?? 'Tem certeza?',
    mensagem: formulario.dataset.confirmar,
    textoConfirmar: formulario.dataset.botao ?? 'Confirmar',
    perigo: formulario.dataset.perigo !== 'nao',
  }).then((ok) => {
    if (ok) formulario.submit(); // submit() direto não dispara este evento de novo
  });
});
