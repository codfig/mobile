import { describe, expect, it } from "vitest"
import { NIVEIS, REGRAS, regraPorId } from "./gramatica.js"
import { colheita, ganchosLivres, pendurar, raizInicial, soltar, verificar, type No } from "./arvore.js"

const r1 = regraPorId("r1")!  // S → a S b
const r2 = regraPorId("r2")!  // S → ε

/** Pendura a árvore completa de aⁿbⁿ: n vezes a regra recursiva, depois o ε. */
const arvoreCompleta = (n: number): No => {
  let raiz = raizInicial()
  for (let i = 0; i < n; i++) {
    const gancho = ganchosLivres(raiz)[0]!
    raiz = pendurar(raiz, gancho, r1)
  }
  return pendurar(raiz, ganchosLivres(raiz)[0]!, r2)
}

describe("gramática", () => {
  it("tem as duas regras de aⁿbⁿ", () => {
    expect(REGRAS.map((r) => r.rotulo)).toEqual(["S → a S b", "S → ε"])
  })
})

describe("pendurar e soltar", () => {
  it("começa com um único gancho livre", () => {
    expect(ganchosLivres(raizInicial())).toHaveLength(1)
  })

  it("a regra recursiva deixa um gancho novo no meio", () => {
    const antes = raizInicial()
    const raiz = pendurar(antes, ganchosLivres(antes)[0]!, r1)
    expect(ganchosLivres(raiz)).toHaveLength(1)
    expect(colheita(raiz)).toEqual(["a", "b"])
  })

  it("o \u03b5 fecha o ramo sem deixar gancho", () => {
    const antes = raizInicial()
    expect(ganchosLivres(pendurar(antes, ganchosLivres(antes)[0]!, r2))).toHaveLength(0)
  })

  it("pendurar num gancho que não existe não muda nada", () => {
    const raiz = raizInicial()
    expect(pendurar(raiz, "gancho-inventado", r1)).toBe(raiz)
  })

  it("soltar devolve o gancho e derruba a subárvore inteira", () => {
    const cheia = arvoreCompleta(2)
    expect(colheita(cheia)).toHaveLength(4)
    const solta = soltar(cheia, cheia.id)
    expect(solta._tag).toBe("Gancho")
    expect(colheita(solta)).toHaveLength(0)
  })
})

describe("colheita", () => {
  it("sai na ordem: todos os a antes de todos os b", () => {
    expect(colheita(arvoreCompleta(3))).toEqual(["a", "a", "a", "b", "b", "b"])
  })

  it("o ε não colhe token nenhum", () => {
    expect(colheita(pendurar(raizInicial(), ganchosLivres(raizInicial())[0]!, r2))).toEqual([])
  })
})

describe("verificar", () => {
  it("recusa enquanto sobra gancho livre", () => {
    const raiz = raizInicial()
    expect(verificar(raiz, ["a", "b"])).toEqual({ _tag: "Incompleto", ganchos: 1 })
  })

  it("aceita a árvore certa de aabb", () => {
    expect(verificar(arvoreCompleta(2), ["a", "a", "b", "b"])).toEqual({ _tag: "Certo" })
  })

  it("reclama do comprimento quando a árvore é rasa demais", () => {
    expect(verificar(arvoreCompleta(1), ["a", "a", "b", "b"])).toEqual({
      _tag: "Comprimento",
      colhido: 2,
      esperado: 4
    })
  })

  it("aponta o primeiro token em desencontro", () => {
    const v = verificar(arvoreCompleta(2), ["a", "b", "a", "b"])
    expect(v).toEqual({ _tag: "Desencontro", indice: 1, esperado: "b", encontrado: "a" })
  })

  it("nenhuma profundidade resolve um nível marcado como não-pendurável", () => {
    for (const nivel of NIVEIS.filter((n) => !n.penduravel)) {
      for (let n = 0; n <= 6; n++) {
        expect(verificar(arvoreCompleta(n), nivel.tokens)).not.toEqual({ _tag: "Certo" })
      }
    }
  })

  it("todo nível pendurável tem mesmo uma árvore que o resolve", () => {
    for (const nivel of NIVEIS.filter((n) => n.penduravel)) {
      const n = nivel.tokens.length / 2
      expect(verificar(arvoreCompleta(n), nivel.tokens)).toEqual({ _tag: "Certo" })
    }
  })
})
