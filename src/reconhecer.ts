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

/** Os nós abertos acima do atual, do mais perto ao mais longe. */
type Caminho = { readonly chave: string; readonly acima: Caminho } | null

const noCaminho = (c: Caminho, chave: string): boolean => {
  for (let k = c; k !== null; k = k.acima) if (k.chave === chave) return true
  return false
}

/**
 * As árvores de derivação do programa, no máximo `limite` delas; nenhuma se ele
 * está fora da gramática. Mais de uma quer dizer que o programa é ambíguo: o
 * mesmo chão pendura de dois jeitos, como no `else` pendente.
 *
 * Saem dos mesmos conjuntos do reconhecedor: uma produção completa de `i` a `j`
 * é um nó possível, e basta repartir o trecho entre os símbolos do corpo, de
 * todos os jeitos que derem. Árvores diferentes vêm de escolhas diferentes, então
 * nenhuma sai repetida.
 */
export const derivacoes = (g: Gramatica, tokens: ReadonlyArray<Token>, limite: number): ReadonlyArray<No> => {
  const conjuntos = earley(g, tokens)
  // completas[j] guarda "regra:origem" de toda produção que termina depois do token j
  const completas = conjuntos.map(
    (conjunto) =>
      new Set(conjunto.filter((it) => it.p === g.regras[it.r]!.corpo.length).map((it) => `${it.r}:${it.o}`))
  )

  // Um nó não pode reaparecer dentro de si no mesmo trecho, senão A → A daria
  // árvores sem fim. Só os de cima contam: um irmão igual ao lado é outra coisa.
  function* no(cabeca: string, i: number, j: number, caminho: Caminho): Generator<No> {
    for (let ri = 0; ri < g.regras.length; ri++) {
      const regra = g.regras[ri]!
      const chave = `${ri}:${i}:${j}`
      if (regra.cabeca !== cabeca || !completas[j]!.has(`${ri}:${i}`) || noCaminho(caminho, chave)) continue
      for (const filhos of corpo(regra, 0, i, j, { chave, acima: caminho })) yield { regra, filhos }
    }
  }

  // reparte o trecho [k, j] entre os símbolos do corpo a partir de `s`
  function* corpo(regra: Regra, s: number, k: number, j: number, caminho: Caminho): Generator<Filho[]> {
    const simbolo = regra.corpo[s]
    if (simbolo === undefined) {
      if (k === j) yield []
      return
    }
    if (simbolo.tipo === "vazio") {
      for (const resto of corpo(regra, s + 1, k, j, caminho)) yield [{ _tag: "Fresta", i: k }, ...resto]
      return
    }
    if (simbolo.tipo === "terminal") {
      if (k >= j || tokens[k]!.categoria !== simbolo.categoria) return
      for (const resto of corpo(regra, s + 1, k + 1, j, caminho)) yield [{ _tag: "Token", i: k }, ...resto]
      return
    }
    for (let fim = k; fim <= j; fim++) {
      for (const sub of no(simbolo.nome, k, fim, caminho)) {
        for (const resto of corpo(regra, s + 1, fim, j, caminho)) yield [{ _tag: "No", no: sub }, ...resto]
      }
    }
  }

  const achadas: No[] = []
  if (limite < 1) return achadas
  for (const arvore of no(g.inicio, 0, tokens.length, null)) {
    achadas.push(arvore)
    if (achadas.length >= limite) break
  }
  return achadas
}

/** Uma árvore de derivação do programa, ou null se ele está fora da gramática. */
export const derivar = (g: Gramatica, tokens: ReadonlyArray<Token>): No | null => derivacoes(g, tokens, 1)[0] ?? null
