import type { Gramatica, Regra, Token } from "./gramatica.js"

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
 * Os conjuntos de Earley do programa: em `conjuntos[i]`, cada produção em
 * andamento depois de ler `i` tokens, com o ponto `p` no corpo e a origem `o`.
 *
 * Earley foi escolhido porque aceita qualquer gramática livre de contexto sem
 * preparo: recursão à esquerda (`E → E + T`), produções vazias, ambiguidade.
 * Uma gramática que alguém escreva em BNF amanhã funciona sem ser reescrita.
 */
const earley = (g: Gramatica, tokens: ReadonlyArray<Token>): ReadonlyArray<ReadonlyArray<Item>> => {
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

  return conjuntos
}

/** Diz se o programa pertence à gramática. É daqui que sai o gabarito do botão "Não dá para pendurar". */
export const reconhece = (g: Gramatica, tokens: ReadonlyArray<Token>): boolean =>
  earley(g, tokens)[tokens.length]!.some((it) => {
    const r = g.regras[it.r]!
    return it.o === 0 && r.cabeca === g.inicio && it.p === r.corpo.length
  })

/** Uma árvore de derivação: cada nó é uma produção, e cada símbolo do corpo dela vira um filho. */
export type No = { readonly regra: Regra; readonly filhos: ReadonlyArray<Filho> }
export type Filho =
  | { readonly _tag: "No"; readonly no: No }
  | { readonly _tag: "Token"; readonly i: number }
  /** O ε pousa na fresta antes do token `i`. */
  | { readonly _tag: "Fresta"; readonly i: number }

/**
 * Uma árvore de derivação do programa, ou null se ele está fora da gramática.
 * Com gramática ambígua, devolve uma das árvores.
 *
 * Sai dos mesmos conjuntos do reconhecedor: uma produção completa de `i` a `j`
 * é um nó possível, e basta repartir o trecho entre os símbolos do corpo.
 */
export const derivar = (g: Gramatica, tokens: ReadonlyArray<Token>): No | null => {
  const conjuntos = earley(g, tokens)
  // completas[j] guarda "regra:origem" de toda produção que termina depois do token j
  const completas = conjuntos.map(
    (conjunto) =>
      new Set(conjunto.filter((it) => it.p === g.regras[it.r]!.corpo.length).map((it) => `${it.r}:${it.o}`))
  )

  // o nó em construção não pode reaparecer dentro de si no mesmo trecho: evita laço em A → A
  const abertos = new Set<string>()

  const no = (cabeca: string, i: number, j: number): No | null => {
    for (let ri = 0; ri < g.regras.length; ri++) {
      const regra = g.regras[ri]!
      const chave = `${ri}:${i}:${j}`
      if (regra.cabeca !== cabeca || !completas[j]!.has(`${ri}:${i}`) || abertos.has(chave)) continue
      abertos.add(chave)
      const filhos = corpo(regra, 0, i, j)
      abertos.delete(chave)
      if (filhos !== null) return { regra, filhos }
    }
    return null
  }

  // reparte o trecho [k, j] entre os símbolos do corpo a partir de `s`
  const corpo = (regra: Regra, s: number, k: number, j: number): Filho[] | null => {
    const simbolo = regra.corpo[s]
    if (simbolo === undefined) return k === j ? [] : null
    if (simbolo.tipo === "vazio") {
      const resto = corpo(regra, s + 1, k, j)
      return resto === null ? null : [{ _tag: "Fresta", i: k }, ...resto]
    }
    if (simbolo.tipo === "terminal") {
      if (k >= j || tokens[k]!.categoria !== simbolo.categoria) return null
      const resto = corpo(regra, s + 1, k + 1, j)
      return resto === null ? null : [{ _tag: "Token", i: k }, ...resto]
    }
    for (let fim = k; fim <= j; fim++) {
      const sub = no(simbolo.nome, k, fim)
      if (sub === null) continue
      const resto = corpo(regra, s + 1, fim, j)
      if (resto !== null) return [{ _tag: "No", no: sub }, ...resto]
    }
    return null
  }

  return no(g.inicio, 0, tokens.length)
}
