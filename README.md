# mobile

Construtor interativo de árvores de derivação. A ideia está em
[IDEIA.md](IDEIA.md); isto aqui é o primeiro protótipo dela.

## O que já roda

Três gramáticas, cada uma com sua sala de programas: `aⁿbⁿ`, parênteses
balanceados e aritmética com precedência (`E → E + T | T`, `T → T * F | F`,
`F → ( E ) | num`). Alguns programas estão fora da gramática, sem aviso.

Um garfo chega solto na sala. O ramo arrasta o que o garfo tem de solto, sem
desfazer encaixe; o anel arrasta só o anel, cada ponta arrasta só ela; pontas
irmãs se afastam de leve e não trocam de ordem. Um anel só encaixa num gancho da
mesma forma, e uma ponta terminal só num token da mesma categoria. Um dedo no
vazio passeia pela sala, dois dedos aproximam; a sala fica presa à janela, e
nenhuma peça sai dela. O interruptor **Gravidade** faz as juntas que chegam a
uma folha presa descerem e ficarem a prumo sobre o que as segura.

**Verificar** confere a árvore; **Não dá para pendurar** é para os programas de
fora — o gabarito sai de um reconhecedor, não de marca escrita à mão.

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
  gramatica.ts   gramática como dado, a partir de linhas quase BNF; lexar
  reconhecer.ts  reconhecedor de Earley: o programa pertence à gramática?
  niveis.ts      as três gramáticas e os programas de cada sala
  mundo.ts       garfos soltos: mover, repelir, encaixar, verificar
  layout.ts      medidas da sala, pontos fixos e a câmera
  Formas.tsx     forma de cada não-terminal, etiquetas de terminal e token
  Sala.tsx       o desenho e os gestos (arrasto, passeio, pinça, roda)
  App.tsx        trilhas, salas, bandeja e botões
```

`gramatica.ts`, `reconhecer.ts`, `mundo.ts` e `layout.ts` são funções puras,
sem DOM e sem API de Node, então rodam igual no navegador, no vitest e num
Worker.

## Ainda não

Sem Effect-TS aqui. O protótipo não tem E/S, nem serviço, nem estado
persistente — nada para o Effect gerenciar. Ele entra quando houver: níveis
vindos de algum lugar, progresso salvo, rede. Pelo mesmo motivo não há nada de
Cloudflare ainda.

Também não tem: construção de baixo para cima (a resposta à pergunta 3 foi "por
que não os dois?"), LET e o ALGOL pequeno, nem o editor de gramática em BNF.
