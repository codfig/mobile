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
  ])
]
