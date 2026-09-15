# mobile

Construtor interativo de árvores de derivação. A ideia está em
[IDEIA.md](IDEIA.md); isto aqui é o primeiro protótipo dela.

## O que já roda

O nível `aⁿbⁿ`, com a gramática `S → a S b | ε`.

Você escolhe um garfo na bandeja e toca num gancho livre para pendurá-lo. As
folhas descem até os tokens do chão; o ε pousa na fresta entre dois tokens. Um
gancho livre mostra, por uma linha pontilhada no chão, o trecho que ainda falta
cobrir. Tocar num garfo já pendurado solta ele e a subárvore inteira.

Dois botões, como decidido em IDEIA.md: **Verificar** (não há correção
contínua) e **Não dá para pendurar**, para os programas que estão fora da
gramática.

## Uso

```
npm install
npm run dev        # http://localhost:5173 e tambem no IP da rede local
npm test           # vitest
npm run typecheck
npm run build      # dist/ estatico, com caminhos relativos
```

O servidor sobe em `0.0.0.0`, então o terminal imprime um endereço
`http://<ip-do-pc>:5173` para abrir no celular na mesma rede.

## Organização

```
src/
  gramatica.ts   as duas regras de aⁿbⁿ e os programas de exemplo
  arvore.ts      a árvore pendurada: pendurar, soltar, colher, verificar
  layout.ts      onde cada peça fica na sala
  Sala.tsx       o desenho (SVG)
  App.tsx        bandeja, botões e estado da partida
```

Nada é genérico de propósito: não há formato de arquivo de gramática nem editor
de níveis. O protótipo existe para responder uma pergunta só — pendurar garfo é
gostoso ou é chato?

`arvore.ts` e `layout.ts` são funções puras, sem DOM e sem API de Node, então
rodam igual no navegador, no vitest e num Worker.

## Ainda não

Sem Effect-TS aqui. O protótipo não tem E/S, nem serviço, nem estado
persistente — nada para o Effect gerenciar. Ele entra quando houver: níveis
vindos de algum lugar, progresso salvo, rede. Pelo mesmo motivo não há nada de
Cloudflare ainda.

Também não tem: construção de baixo para cima (a resposta à pergunta 3 foi "por
que não os dois?"), categorias de token além de `a` e `b`, nem os outros níveis
da rampa.
