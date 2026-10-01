/** Formulário de cliente: alterna campos de PF/PJ e ajusta rótulos conforme o tipo escolhido. */

type TipoCliente = 'PF' | 'PJ';

const formulario = document.querySelector<HTMLFormElement>('[data-formulario-cliente]');

function aplicarTipo(form: HTMLFormElement, tipo: TipoCliente): void {
  form.dataset.tipo = tipo;
  // Campos ocultos são desabilitados para não bloquear o envio nem serem enviados.
  form.querySelectorAll<HTMLElement>('[data-somente]').forEach((bloco) => {
    const ativo = bloco.dataset.somente === tipo;
    bloco.querySelectorAll<HTMLInputElement>('input, select, textarea').forEach((campo) => {
      campo.disabled = !ativo;
    });
  });
  const documento = form.querySelector<HTMLInputElement>('[data-campo-documento]');
  const rotuloDocumento = documento?.id ? form.querySelector<HTMLLabelElement>(`label[for="${documento.id}"]`) : null;
  const rotuloNome = form.querySelector<HTMLLabelElement>('label[for="nome"]');
  if (documento) documento.placeholder = tipo === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00';
  if (rotuloDocumento?.firstChild) rotuloDocumento.firstChild.textContent = tipo === 'PJ' ? 'CNPJ' : 'CPF';
  if (rotuloNome?.firstChild) rotuloNome.firstChild.textContent = tipo === 'PJ' ? 'Nome fantasia' : 'Nome completo';
}

if (formulario) {
  const tipoAtual = (): TipoCliente =>
    formulario.querySelector<HTMLInputElement>('input[name="tipo"]:checked')?.value === 'PJ' ? 'PJ' : 'PF';
  formulario.querySelectorAll<HTMLInputElement>('input[name="tipo"]').forEach((opcao) =>
    opcao.addEventListener('change', () => aplicarTipo(formulario, tipoAtual())),
  );
  aplicarTipo(formulario, formulario.dataset.tipo === 'PJ' ? 'PJ' : 'PF');
}
export {};
