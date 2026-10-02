# mobile

Construtor interativo de árvores de derivação. A ideia está em
[IDEIA.md](IDEIA.md); isto aqui é o primeiro protótipo dela.

## O que já roda

Seis gramáticas, cada uma com sua sala de programas: `aⁿbⁿ`, parênteses
balanceados, expressões-S de Lisp (`S → atom | ( L )`, `L → ε | S L`),
aritmética com precedência (`E → E + T | T`, `T → T * F | F`,
`F → ( E ) | num`), LET, de Friedman & Wand (`num`, `id`, `- ( E , E )`,
`zero? ( E )`, `if E then E else E`, `let id = E in E`), e um ALGOL pequeno com
o `else` pendente. Alguns programas estão fora da gramática, sem aviso; um é
ambíguo, e pendura de dois jeitos certos.

Um garfo chega solto na sala. O ramo arrasta o que o garfo tem de solto, sem
desfazer encaixe; o anel arrasta só o anel, cada ponta arrasta só ela; pontas
irmãs se afastam de leve e não trocam de ordem. Um anel só encaixa num gancho da
mesma forma, e uma ponta terminal só num token da mesma categoria. Um dedo no
vazio passeia pela sala, dois dedos aproximam; a sala fica presa à janela, e
nenhuma peça sai dela. O interruptor **Gravidade** faz as juntas que chegam a
uma folha presa descerem e ficarem a prumo sobre o que as segura. Um garfo
arrastado pelo ramo até a faixa no pé da sala volta à bandeja, e os que pendiam
dele ficam soltos onde estavam. **Resposta** pendura a árvore inteira.

**Verificar** confere a árvore; **Não dá para pendurar** é para os programas de
fora — o gabarito sai de um reconhecedor, não de marca escrita à mão.

A última aba, **Sua gramática**, é um editor: escreva as produções em BNF
(`E → E + T | T`, uma por linha, símbolos separados por espaço) e os programas,
um por linha, e saem dali os garfos, as formas dos ganchos, as categorias de
token e as salas. Uma gramática nova deixou de precisar de código novo.

Nem `→` nem `ε` precisam ser digitados, que são justamente as duas teclas que
ninguém tem — num celular elas nem existem. A seta também se escreve `->` ou
`::=`; a cadeia vazia, `epsilon`, `eps`, `vazio`, ou nada depois da seta
(`L → | S L`). Quem quiser o texto com a cara que ele tem no quadro tem dois
botões que inserem os caracteres no cursor. O `λ` ficou de fora de propósito:
numa disciplina de linguagens ele é terminal antes de ser cadeia vazia, e
`E → λ id . E` tem que continuar valendo.

As
queixas aparecem enquanto se escreve, e são de dois tipos: erro trava a
montagem (falta a seta, ε no meio de um corpo, cabeça com dois símbolos); aviso
não trava nada, só conta o que a gramática vai fazer — o não-terminal que não
gera palavra nenhuma, a regra que o início nunca alcança, e o engano mais calado
de todos, o símbolo que só aparece em corpo e virou categoria de token porque a
produção dele ficou por escrever. Qualquer uma das seis gramáticas do jogo abre
o editor já escrita, para servir de ponto de partida.

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
  bnf.ts         ler e escrever a gramática em texto, e reclamar do que não fecha
  reconhecer.ts  reconhecedor de Earley: o programa pertence à gramática?
  niveis.ts      as seis gramáticas e os programas de cada sala
  mundo.ts       garfos soltos: mover, repelir, encaixar, verificar
  layout.ts      medidas da sala, pontos fixos e a câmera
  Formas.tsx     forma de cada não-terminal, etiquetas de terminal e token
  Sala.tsx       o desenho e os gestos (arrasto, passeio, pinça, roda)
  Editor.tsx     os dois textos — gramática e programas — e as queixas
  App.tsx        trilhas, salas, bandeja e botões
```

`gramatica.ts`, `bnf.ts`, `reconhecer.ts`, `mundo.ts` e `layout.ts` são funções puras,
sem DOM e sem API de Node, então rodam igual no navegador, no vitest e num
Worker.

## Ainda não

Sem Effect-TS aqui. O protótipo não tem E/S, nem serviço, nem estado
persistente — nada para o Effect gerenciar. Ele entra quando houver: níveis
vindos de algum lugar, progresso salvo, rede. Pelo mesmo motivo não há nada de
Cloudflare ainda.

Também não tem: a etapa 2, em que a sala já chega com a maior parte da árvore
pendurada e só as decisões que ensinam ficam abertas; construção de baixo para
cima (a resposta à pergunta 3 foi "por que não os dois?"); nem lacrar uma
subárvore pronta ou pendurar sozinho o garfo forçado.

A gramática escrita no editor vive enquanto a página estiver aberta, e só. Guardá-la
é justamente o primeiro estado que este protótipo teria para gerenciar — e é aí
que entram o Effect e a Cloudflare.
