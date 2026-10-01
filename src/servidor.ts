import { criarAplicacao } from './aplicacao/aplicacao.js';
import { criarServicos } from './aplicacao/container.js';
import { lerAmbiente } from './configuracao/ambiente.js';

const ambiente = lerAmbiente();
const app = criarAplicacao(criarServicos(ambiente.diretorioDados), ambiente.diretorioPublico);

app.listen(ambiente.porta, () => {
  console.log(`Brasil Doces do Vale rodando em http://localhost:${ambiente.porta}`);
});
