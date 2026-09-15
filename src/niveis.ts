import { definir, lexar, type Gramatica, type Token } from "./gramatica.js"
import { reconhece } from "./reconhecer.js"

export type Nivel = {
  readonly id: string
  readonly programa: string
  readonly tokens: ReadonlyArray<Token>
  /** Calculado, não escrito à mão: vem do reconhecedor. */
  readonly penduravel: boolean
}

export type Trilha = { readonly gramatica: Gramatica; readonly niveis: ReadonlyArray<Nivel> }

const nivel = (g: Gramatica, programa: string): Nivel => {
  const tokens = lexar(g, programa)
  return { id: `${g.id}:${programa}`, programa, tokens, penduravel: reconhece(g, tokens) }
}

const trilha = (g: Gramatica, programas: ReadonlyArray<string>): Trilha => ({
  gramatica: g,
  niveis: programas.map((p) => nivel(g, p))
})

export const ANBN = definir("anbn", "aⁿbⁿ", [
  ["S", "a S b"],
  ["S", "ε"]
])

export const PARENTESES = definir("parenteses", "Parênteses", [
  ["S", "( S ) S"],
  ["S", "ε"]
])

/**
 * As expressões-S de Lisp: um átomo, ou uma lista entre parênteses. É a
 * gramática de parênteses com átomos dentro, e a lista é recursiva à direita
 * (`L → S L`): a árvore pende para a direita, ao contrário da soma da
 * aritmética, que pende para a esquerda.
 */
export const LISP = definir("lisp", "Lisp", [
  ["S", "atom"],
  ["S", "( L )"],
  ["L", "ε"],
  ["L", "S L"]
])

export const ARITMETICA = definir("aritmetica", "Aritmética", [
  ["E", "E + T"],
  ["E", "T"],
  ["T", "T * F"],
  ["T", "F"],
  ["F", "( E )"],
  ["F", "num"]
])

/**
 * LET, a primeira linguagem de Friedman & Wand, *Essentials of Programming
 * Languages*. Um não-terminal só, então não há cadeias como `E → T → F`: a
 * lição é a estrutura. E a de ligação aparece nas peças: o nome depois de `let`
 * é uma folha do próprio garfo `let` (quem liga), enquanto um nome usado numa
 * expressão é um garfo `E → id` inteiro (quem é ligado).
 */
export const LET = definir("let", "LET", [
  ["E", "num"],
  ["E", "id"],
  ["E", "- ( E , E )"],
  ["E", "zero? ( E )"],
  ["E", "if E then E else E"],
  ["E", "let id = E in E"]
])

/**
 * Um ALGOL pequeno: comandos com `if`, atribuição e blocos `begin … end`.
 * O `if` sem `else` e o `if` com `else` convivem, e é isso que deixa o `else`
 * pendente: em `if a then if b then x := 1 else x := 2`, o `else` pode ser do
 * `if` de dentro ou do de fora. O mesmo chão pendura de dois jeitos, e os dois
 * são certos. `begin … end` é como o programador escolhe um deles.
 */
export const ALGOL = definir("algol", "ALGOL", [
  ["S", "if E then S"],
  ["S", "if E then S else S"],
  ["S", "id := E"],
  ["S", "begin L end"],
  ["L", "S"],
  ["L", "L ; S"],
  ["E", "id"],
  ["E", "num"]
])

/**
 * As salas. Os programas fora da gramática ficam misturados aos outros, sem
 * marca: descobrir que um deles não pendura faz parte do exercício.
 */
export const TRILHAS: ReadonlyArray<Trilha> = [
  trilha(ANBN, ["a b", "a a b b", "a a a b b b", "a a b", "a b a b"]),
  trilha(PARENTESES, ["( )", "( ) ( )", "( ( ) )", ") (", "( ( ) ( ) )", "( ( )"]),
  trilha(LISP, [
    "x",
    "( )",
    "( car x )",
    "a b",
    "( + 1 2 )",
    "( a ( b ) )",
    "( car x",
    "( ( lambda ( x ) x ) 1 )",
    "( ) )",
    "( define ( sq x ) ( * x x ) )"
  ]),
  trilha(ARITMETICA, [
    "2",
    "2 + 3",
    "2 * 3",
    "2 + 3 * 4",
    "2 * 3 + 4",
    "1 + 2 + 3",
    "( 2 + 3 ) * 4",
    "2 + * 3",
    "( 1 + 2 ) * ( 3 + 4 )",
    "( 2 + 3"
  ]),
  trilha(LET, [
    "5",
    "x",
    "- ( x , 1 )",
    "zero? ( x )",
    "let x = 5 in x",
    "- ( x 1 )",
    "if zero? ( x ) then 0 else - ( x , 1 )",
    "let x = in x",
    "let x = 7 in let y = 2 in - ( x , y )",
    "if x then 1",
    "let x = 3 in let y = - ( x , 1 ) in - ( x , y )"
  ]),
  trilha(ALGOL, [
    "x := 1",
    "begin x := 1 end",
    "if a then x := 1",
    "x := 1 ; y := 2",
    "if a then x := 1 else x := 2",
    "begin x := 1 ; y := 2 end",
    "if a then else x := 1",
    "if a then if b then x := 1 else x := 2",
    "begin x := 1 ; end",
    "if a then begin if b then x := 1 end else x := 2"
  ])
]
