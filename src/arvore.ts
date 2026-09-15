import type { Categoria, Regra } from "./gramatica.js"

/**
 * A árvore pendurada.
 *
 * - `Gancho`: um não-terminal ainda não expandido — um buraco a preencher.
 * - `Garfo`: um gancho onde já se pendurou uma regra.
 * - `Folha`: um terminal, que precisa alcançar um token do chão da mesma categoria.
 * - `Vazio`: o ε, que desce até o chão sem consumir token nenhum e pousa na fresta.
 */
export type No =
  | { readonly _tag: "Gancho"; readonly id: string }
  | { readonly _tag: "Garfo"; readonly id: string; readonly regra: string; readonly filhos: ReadonlyArray<No> }
  | { readonly _tag: "Folha"; readonly id: string; readonly categoria: Categoria }
  | { readonly _tag: "Vazio"; readonly id: string }

let contador = 0
const novoId = () => `n${++contador}`

export const raizInicial = (): No => ({ _tag: "Gancho", id: novoId() })

/** Pendura `regra` no gancho `ganchoId`. Devolve a árvore nova. */
export const pendurar = (no: No, ganchoId: string, regra: Regra): No => {
  switch (no._tag) {
    case "Gancho":
      if (no.id !== ganchoId) return no
      return {
        _tag: "Garfo",
        id: no.id,
        regra: regra.id,
        filhos: regra.corpo.map((s): No =>
          s.tipo === "terminal"
            ? { _tag: "Folha", id: novoId(), categoria: s.categoria }
            : s.tipo === "vazio"
              ? { _tag: "Vazio", id: novoId() }
              : { _tag: "Gancho", id: novoId() }
        )
      }
    case "Garfo":
      return { ...no, filhos: no.filhos.map((f) => pendurar(f, ganchoId, regra)) }
    default:
      return no
  }
}

/** Solta um garfo: ele vira gancho livre de novo e a subárvore inteira cai. */
export const soltar = (no: No, garfoId: string): No => {
  if (no._tag !== "Garfo") return no
  if (no.id === garfoId) return { _tag: "Gancho", id: no.id }
  return { ...no, filhos: no.filhos.map((f) => soltar(f, garfoId)) }
}

export const ganchosLivres = (no: No): ReadonlyArray<string> =>
  no._tag === "Gancho" ? [no.id] : no._tag === "Garfo" ? no.filhos.flatMap(ganchosLivres) : []

/** A colheita da árvore: os terminais, da esquerda para a direita. */
export const colheita = (no: No): ReadonlyArray<Categoria> =>
  no._tag === "Folha" ? [no.categoria] : no._tag === "Garfo" ? no.filhos.flatMap(colheita) : []

export type Veredito =
  | { readonly _tag: "Incompleto"; readonly ganchos: number }
  | { readonly _tag: "Comprimento"; readonly colhido: number; readonly esperado: number }
  | { readonly _tag: "Desencontro"; readonly indice: number; readonly esperado: Categoria; readonly encontrado: Categoria }
  | { readonly _tag: "Certo" }

/**
 * A árvore está pendurada corretamente quando não sobrou gancho livre e a
 * colheita bate com o chão, token a token e na ordem.
 *
 * A ordem não precisa ser verificada à parte: como os ramos não se cruzam, a
 * colheita já sai na ordem em que os terminais aparecem na sala.
 */
export const verificar = (raiz: No, tokens: ReadonlyArray<Categoria>): Veredito => {
  const livres = ganchosLivres(raiz)
  if (livres.length > 0) return { _tag: "Incompleto", ganchos: livres.length }

  const c = colheita(raiz)
  if (c.length !== tokens.length) return { _tag: "Comprimento", colhido: c.length, esperado: tokens.length }

  for (let i = 0; i < c.length; i++) {
    const obtido = c[i]
    const alvo = tokens[i]
    if (obtido !== undefined && alvo !== undefined && obtido !== alvo) {
      return { _tag: "Desencontro", indice: i, esperado: alvo, encontrado: obtido }
    }
  }
  return { _tag: "Certo" }
}
