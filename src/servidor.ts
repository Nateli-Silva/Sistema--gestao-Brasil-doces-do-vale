import { criarAplicacao } from './aplicacao/aplicacao.js';
import { Autenticacao } from './aplicacao/autenticacao.js';
import { criarServicos } from './aplicacao/container.js';
import { lerAmbiente } from './configuracao/ambiente.js';

const ambiente = lerAmbiente();

// Em produção o sistema nunca sobe aberto: sem senha configurada, não inicia.
if (ambiente.producao && !ambiente.senhaAcesso) {
  console.error('Defina a variável SENHA_ACESSO para iniciar em produção.');
  process.exit(1);
}
if (!ambiente.senhaAcesso) console.warn('Atenção: SENHA_ACESSO não definida — acesso aberto (use só em ambiente local).');

const app = criarAplicacao(
  criarServicos(ambiente.diretorioDados),
  ambiente.diretorioPublico,
  ambiente.senhaAcesso ? new Autenticacao(ambiente.senhaAcesso) : undefined,
);

app.listen(ambiente.porta, () => {
  console.log(`Brasil Doces do Vale rodando na porta ${ambiente.porta}`);
});
