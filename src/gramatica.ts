/**
 * O nível `aⁿbⁿ` — o primeiro da rampa, e por enquanto o único.
 *
 * Nada aqui é genérico de propósito: não há formato de arquivo de gramática
 * nem editor de níveis. O protótipo existe só para descobrir se pendurar
 * garfo é gostoso ou chato.
 */

/** Categoria de token. Cada terminal é sua própria categoria neste nível. */
export type Categoria = "a" | "b"

export type Simbolo =
  | { readonly tipo: "naoTerminal" }
  | { readonly tipo: "terminal"; readonly categoria: Categoria }
  | { readonly tipo: "vazio" }

export type Regra = {
  readonly id: string
  readonly rotulo: string
  readonly corpo: ReadonlyArray<Simbolo>
}

export const REGRAS: ReadonlyArray<Regra> = [
  {
    id: "r1",
    rotulo: "S → a S b",
    corpo: [{ tipo: "terminal", categoria: "a" }, { tipo: "naoTerminal" }, { tipo: "terminal", categoria: "b" }]
  },
  {
    id: "r2",
    rotulo: "S → ε",
    corpo: [{ tipo: "vazio" }]
  }
]

export const regraPorId = (id: string): Regra | undefined => REGRAS.find((r) => r.id === id)

export type Nivel = {
  readonly id: string
  readonly tokens: ReadonlyArray<Categoria>
  /** Se `false`, o programa está fora da gramática e o certo é recusar. */
  readonly penduravel: boolean
}

export const NIVEIS: ReadonlyArray<Nivel> = [
  { id: "ab", tokens: ["a", "b"], penduravel: true },
  { id: "aabb", tokens: ["a", "a", "b", "b"], penduravel: true },
  { id: "aaabbb", tokens: ["a", "a", "a", "b", "b", "b"], penduravel: true },
  { id: "aab", tokens: ["a", "a", "b"], penduravel: false },
  { id: "abab", tokens: ["a", "b", "a", "b"], penduravel: false }
]
