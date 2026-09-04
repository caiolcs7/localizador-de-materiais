# Localizador de Materiais

PWA interna para localizar materiais por código, bombona ou endereço físico. A base central contém 651 localizações (633 registros-base e 18 complementos). A aba **Calculadora** integra o cálculo industrial por tara ao mesmo aplicativo.

## Stack

- React + TypeScript + Vite
- Supabase Postgres, Auth, Row Level Security, Realtime e Edge Functions
- IndexedDB via Dexie somente como cache de leitura/offline
- QR Code / Data Matrix via ZXing
- PWA via vite-plugin-pwa / Workbox
- Lucide Icons
- Vitest para regras críticas

## Calculadora industrial

A calculadora usa a fórmula `((peso bruto - tara) × 1000 ÷ gramatura) × rendimento`, com rendimento padrão de 95% e truncamento para unidades completas. Inclui Bombona Azul (6,400 kg), Bombona Marrom (9,200 kg), Caixa Vermelha (3,000 kg) e Galão (1,000 kg), histórico manual, identificação por produto e endereço, revisão auditada e configurações administrativas.

O estado permanece compatível com o armazenamento local do BombonaCalc 4.2.1. O histórico da calculadora é independente da base de materiais em IndexedDB.

## Acessos

- `/`: consulta pública, sem comandos de gravação.
- `/admin`: login obrigatório para materiais, carrinhos, backups e administradores.

As duas rotas usam a mesma base no Supabase. Alterações administrativas chegam aos clientes conectados por Realtime.

## Rodar em desenvolvimento

Requisitos: Node.js 22 recomendado.

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` e preencha a URL e a chave publicável do projeto Supabase. Nunca exponha a chave `service_role` no navegador.

Abra o endereço indicado pelo Vite. Para testar câmera em celular fora de `localhost`, use HTTPS.

## Testes

```bash
npm test
```

Os testes cobrem busca exata, múltiplas localizações, equivalência AI4/AI6, case-insensitive, bloqueio de BC↔AI4, sugestão sem autoaceite, fórmula da calculadora, leitura decimal e persistência do histórico local.

## Build de produção

```bash
npm run build
npm run preview
```

O build final é criado em `dist/`. O arquivo `vercel.json` configura fallback SPA e cabeçalhos de segurança. A PWA oferece cache offline; o Supabase continua sendo a fonte central dos materiais e carrinhos.

## Dados e segurança operacional

- Código não é chave primária. Cada localização usa UUID.
- Quantidade vazia permanece diferente de zero.
- AI4 e AI6 só são equivalentes quando todo o restante do código é idêntico.
- Sugestões aproximadas nunca são assumidas como resultado correto.
- Backup JSON é mesclado por UUID e nunca apaga registros ausentes do arquivo.
- Toda tabela exposta tem RLS: leitura pública somente dos materiais/carrinhos e gravação somente de administradores ativos.
- A criação de administradores ocorre em Edge Function autenticada; a chave privilegiada nunca integra o bundle do navegador.
- Importação CSV valida linhas antes de gravar e separa válidos, duplicados e erros.
- O scanner aceita QR Code e Data Matrix e encerra a câmera ao fechar.

## Base inicial

A importação mantém os 633 registros-base e 18 complementos. Registros marcados como `SEM_CODIGO` na planilha são preservados como registros especiais. Quatro códigos com prefixo inicial `1` claramente inconsistente foram normalizados (`1IT...` → `IT...`) e o valor original é mantido em `codigoOriginal`/observações. Um registro sem identificação `R/B` permanece como `Bombona 48`, conforme o dado original.

## CSV

Cabeçalhos aceitos:

```text
Código;Bombona;Endereço;Descritivo;Quantidade;Observações
```

Quantidade pode ficar vazia; nesse caso continua "não informada", não `0`.
