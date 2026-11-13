// Gera src/environments/environment.ts antes do build.
// - Se SUPABASE_URL e SUPABASE_ANON_KEY existirem (ex.: na Vercel), usa esses valores.
// - Senão, se o arquivo ainda não existir, copia o exemplo com valores de modelo.
import { existsSync, copyFileSync, writeFileSync } from 'node:fs';

const destino = 'src/environments/environment.ts';
const exemplo = 'src/environments/environment.example.ts';
const url = process.env.SUPABASE_URL;
const chave = process.env.SUPABASE_ANON_KEY;

if (url && chave) {
  const conteudo =
    '// Arquivo gerado automaticamente por scripts/gerar-env.mjs. Não edite.\n' +
    `export const environment = {\n  supabaseUrl: ${JSON.stringify(url)},\n  supabaseAnonKey: ${JSON.stringify(chave)},\n};\n`;
  writeFileSync(destino, conteudo);
  console.log('environment.ts gerado a partir das variáveis de ambiente.');
} else if (!existsSync(destino)) {
  copyFileSync(exemplo, destino);
  console.log('environment.ts criado a partir do exemplo. Preencha os dados do Supabase.');
}
