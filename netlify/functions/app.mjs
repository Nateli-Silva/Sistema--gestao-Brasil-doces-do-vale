// Ponto de entrada da função do Netlify: o código real fica em src/netlify (compilado para dist/).
import { getStore } from '@netlify/blobs';
import { criarManipulador } from '../../dist/netlify/funcao.js';

const manipular = criarManipulador(() => getStore({ name: 'brasil-doces', consistency: 'strong' }), process.env.SENHA_ACESSO);

export default (req) => manipular(req);

// Responde a todos os endereços; arquivos reais de "publico" (css/js) têm prioridade.
export const config = { path: '/*', preferStatic: true };
