import type { Gramatica, Token } from "./gramatica.js"

/** Não-terminais que podem derivar a cadeia vazia. */
export const anulaveis = (g: Gramatica): ReadonlySet<string> => {
  const nulos = new Set<string>()
  for (let mudou = true; mudou; ) {
    mudou = false
    for (const r of g.regras) {
      if (nulos.has(r.cabeca)) continue
      if (r.corpo.every((s) => s.tipo === "vazio" || (s.tipo === "naoTerminal" && nulos.has(s.nome)))) {
        nulos.add(r.cabeca)
        mudou = true
      }
    }
  }
  return nulos
}

type Item = { readonly r: number; readonly p: number; readonly o: number }

/**
 * Diz se o programa pertence à gramática — reconhecedor de Earley.
 *
 * Escolhido porque aceita qualquer gramática livre de contexto sem preparo:
 * recursão à esquerda (`E → E + T`), produções vazias, ambiguidade. Uma
 * gramática que alguém escreva em BNF amanhã funciona sem ser reescrita.
 *
 * É daqui que sai o gabarito do botão "Não dá para pendurar".
 */
export const reconhece = (g: Gramatica, tokens: ReadonlyArray<Token>): boolean => {
  const n = tokens.length
  const nulos = anulaveis(g)
  const conjuntos: Item[][] = Array.from({ length: n + 1 }, () => [])
  const vistos: Array<Set<string>> = Array.from({ length: n + 1 }, () => new Set())

  const por = (i: number, it: Item) => {
    const chave = `${it.r}.${it.p}.${it.o}`
    if (vistos[i]!.has(chave)) return
    vistos[i]!.add(chave)
    conjuntos[i]!.push(it)
  }

  g.regras.forEach((r, ri) => r.cabeca === g.inicio && por(0, { r: ri, p: 0, o: 0 }))

  for (let i = 0; i <= n; i++) {
    const conjunto = conjuntos[i]!
    for (let q = 0; q < conjunto.length; q++) {
      const it = conjunto[q]!
      const regra = g.regras[it.r]!
      const s = regra.corpo[it.p]
      if (s === undefined) {
        // completar: quem esperava esta cabeça avança
        for (const pai of conjuntos[it.o]!) {
          const esperado = g.regras[pai.r]!.corpo[pai.p]
          if (esperado?.tipo === "naoTerminal" && esperado.nome === regra.cabeca) por(i, { ...pai, p: pai.p + 1 })
        }
      } else if (s.tipo === "vazio") {
        por(i, { ...it, p: it.p + 1 })
      } else if (s.tipo === "naoTerminal") {
        g.regras.forEach((r, ri) => r.cabeca === s.nome && por(i, { r: ri, p: 0, o: i }))
        // sem isto, um não-terminal anulável completado antes de ser esperado se perde
        if (nulos.has(s.nome)) por(i, { ...it, p: it.p + 1 })
      } else if (i < n && tokens[i]!.categoria === s.categoria) {
        por(i + 1, { ...it, p: it.p + 1 })
      }
    }
  }

  return conjuntos[n]!.some((it) => {
    const r = g.regras[it.r]!
    return it.o === 0 && r.cabeca === g.inicio && it.p === r.corpo.length
  })
}
