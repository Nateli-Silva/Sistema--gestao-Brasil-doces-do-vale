/** Restauração de backup: lê o arquivo escolhido e envia o conteúdo ao servidor. */

interface Resposta {
  readonly ok: boolean;
  readonly mensagem: string;
}

const formulario = document.querySelector<HTMLFormElement>('[data-restaurar]');
const resultado = formulario?.querySelector<HTMLElement>('[data-resultado]');
const arquivoEl = formulario?.querySelector<HTMLInputElement>('input[type=file]');

formulario?.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const arquivo = arquivoEl?.files?.[0];
  if (!arquivo || !resultado) return;
  if (!window.confirm('Substituir TODOS os dados atuais pelos deste arquivo?')) return;
  resultado.textContent = 'Restaurando…';
  try {
    const texto = await arquivo.text();
    JSON.parse(texto); // falha cedo se não for JSON
    const resposta = await fetch('/backup/restaurar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: texto });
    const dados = (await resposta.json()) as Resposta;
    if (dados.ok) window.location.href = `/?aviso=${encodeURIComponent(dados.mensagem)}`;
    else resultado.textContent = dados.mensagem;
  } catch {
    resultado.textContent = 'Não foi possível ler este arquivo.';
  }
});

export {};
