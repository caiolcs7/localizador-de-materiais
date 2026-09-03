# Localizador de Materiais

PWA interna para localizar materiais por código, bombona ou endereço físico. A base inicial foi gerada a partir de `PLANILHAS_UNIFICADAS_POR_CODIGO(2).xlsx` e contém 633 registros. A aba **Calculadora** integra o cálculo industrial por tara ao mesmo aplicativo.

## Stack

- React + TypeScript + Vite
- IndexedDB via Dexie
- QR Code / Data Matrix via ZXing
- PWA via vite-plugin-pwa / Workbox
- Lucide Icons
- Vitest para regras críticas

## Calculadora industrial

A calculadora usa a fórmula `((peso bruto - tara) × 1000 ÷ gramatura) × rendimento`, com rendimento padrão de 95% e truncamento para unidades completas. Inclui Bombona Azul (6,400 kg), Bombona Marrom (9,200 kg), Caixa Vermelha (3,000 kg) e Galão (1,000 kg), histórico manual, identificação por produto e endereço, revisão auditada e configurações administrativas.

O estado permanece compatível com o armazenamento local do BombonaCalc 4.2.1. O histórico da calculadora é independente da base de materiais em IndexedDB.

## Rodar em desenvolvimento

Requisitos: Node.js 22 recomendado.

```bash
npm install
npm run dev
```

Abra o endereço indicado pelo Vite. Para testar câmera em celular fora de `localhost`, use HTTPS.

## Testes

```bash
npm test
```

Os testes cobrem busca exata, múltiplas localizações, equivalência AI4/AI6, case-insensitive, bloqueio de BC↔AI4, sugestão sem autoaceite, fórmula da calculadora, leitura decimal, migração/persistência do histórico e expiração da sessão administrativa.

## Build de produção

```bash
npm run build
npm run preview
```

O build final é criado em `dist/`. Publique o conteúdo dessa pasta em um host HTTPS. A PWA oferece cache offline do app; o banco de materiais permanece no IndexedDB do dispositivo.

## Dados e segurança operacional

- Código não é chave primária. Cada localização usa UUID.
- Quantidade vazia permanece diferente de zero.
- AI4 e AI6 só são equivalentes quando todo o restante do código é idêntico.
- Sugestões aproximadas nunca são assumidas como resultado correto.
- Backup JSON substitui a base somente após confirmação.
- Importação CSV valida linhas antes de gravar e separa válidos, duplicados e erros.
- O scanner aceita QR Code e Data Matrix e encerra a câmera ao fechar.

## Base inicial

A importação mantém 633 registros. Registros marcados como `SEM_CODIGO` na planilha são preservados como registros especiais. Quatro códigos com prefixo inicial `1` claramente inconsistente foram normalizados (`1IT...` → `IT...`) e o valor original é mantido em `codigoOriginal`/observações. Um registro sem identificação `R/B` permanece como `Bombona 48`, conforme o dado original.

## CSV

Cabeçalhos aceitos:

```text
Código;Bombona;Endereço;Descritivo;Quantidade;Observações
```

Quantidade pode ficar vazia; nesse caso continua "não informada", não `0`.
