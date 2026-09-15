import { regraPorId, type Categoria } from "./gramatica.js"
import { dist, type Cena, type Ponto } from "./layout.js"

/**
 * O mundo é uma sacola de garfos soltos.
 *
 * Um garfo não precisa estar preso a nada: ele existe na sala, e o anel e cada
 * ponta se arrastam em separado. Encaixar é só o que acontece quando uma peça
 * é largada perto de um lugar que a aceita — não é o jeito de mover.
 */

/** Onde o anel de um garfo está pendurado. */
export type Encaixe =
  | { readonly _tag: "Teto" }
  | { readonly _tag: "Ponta"; readonly garfo: string; readonly i: number }

/** Onde a ponta de um garfo está presa, lá embaixo. */
export type Preso =
  | { readonly _tag: "Token"; readonly i: number }
  | { readonly _tag: "Fresta"; readonly i: number }

export type Garfo = {
  readonly id: string
  readonly regra: string
  readonly anel: Ponto
  readonly pontas: ReadonlyArray<Ponto>
  readonly anelEm: Encaixe | null
  readonly pontasEm: ReadonlyArray<Preso | null>
}

export type Mundo = { readonly garfos: ReadonlyArray<Garfo> }

export type Parte = { readonly _tag: "Corpo" } | { readonly _tag: "Anel" } | { readonly _tag: "Ponta"; readonly i: number }

export const mundoVazio: Mundo = { garfos: [] }

let seq = 0
export const novoGarfo = (regraId: string, onde: Ponto): Garfo => {
  const regra = regraPorId(regraId)
  const corpo = regra?.corpo ?? []
  const vao = 54 * Math.max(corpo.length - 1, 0)
  return {
    id: `g${++seq}`,
    regra: regraId,
    anel: onde,
    pontas: corpo.map((_, i) => ({ x: onde.x - vao / 2 + i * 54, y: onde.y + 66 })),
    anelEm: null,
    pontasEm: corpo.map(() => null)
  }
}

export const por = (mundo: Mundo, g: Garfo): Mundo => ({ garfos: [...mundo.garfos, g] })

export const tirar = (mundo: Mundo, id: string): Mundo => ({
  garfos: mundo.garfos
    .filter((g) => g.id !== id)
    // quem estava pendurado nele cai solto, em vez de sumir junto
    .map((g) => (g.anelEm?._tag === "Ponta" && g.anelEm.garfo === id ? { ...g, anelEm: null } : g))
})

const achar = (mundo: Mundo, id: string): Garfo | undefined => mundo.garfos.find((g) => g.id === id)

export const posAnel = (mundo: Mundo, c: Cena, g: Garfo, prof = 0): Ponto => {
  const em = g.anelEm
  if (em === null || prof > 24) return g.anel
  if (em._tag === "Teto") return c.teto
  const pai = achar(mundo, em.garfo)
  return pai === undefined ? g.anel : posPonta(mundo, c, pai, em.i, prof + 1)
}

export const posPonta = (mundo: Mundo, c: Cena, g: Garfo, i: number, prof = 0): Ponto => {
  const preso = g.pontasEm[i]
  if (preso != null) return preso._tag === "Token" ? c.token(preso.i) : c.fresta(preso.i)
  const p = g.pontas[i]
  if (p !== undefined) return p
  return posAnel(mundo, c, g, prof + 1)
}

export const posDaParte = (mundo: Mundo, c: Cena, g: Garfo, parte: Parte): Ponto =>
  parte._tag === "Ponta" ? posPonta(mundo, c, g, parte.i) : posAnel(mundo, c, g)

/** Todo garfo que pende deste, direta ou indiretamente (inclui ele mesmo). */
export const pendentes = (mundo: Mundo, id: string): ReadonlySet<string> => {
  const dentro = new Set([id])
  for (let volta = 0; volta < mundo.garfos.length + 1; volta++) {
    let mudou = false
    for (const g of mundo.garfos) {
      const em = g.anelEm
      if (!dentro.has(g.id) && em?._tag === "Ponta" && dentro.has(em.garfo)) {
        dentro.add(g.id)
        mudou = true
      }
    }
    if (!mudou) break
  }
  return dentro
}

// ---- mover ----

const trocar = (mundo: Mundo, id: string, f: (g: Garfo) => Garfo): Mundo => ({
  garfos: mundo.garfos.map((g) => (g.id === id ? f(g) : g))
})

/**
 * Arrastar o corpo solta o garfo de tudo: você o pegou na mão. O que estava
 * pendurado nas pontas dele vem junto, porque a posição dos filhos é lida a
 * partir das pontas do pai.
 */
export const moverCorpo = (mundo: Mundo, c: Cena, id: string, destino: Ponto): Mundo => {
  const g = achar(mundo, id)
  if (g === undefined) return mundo
  const atual = posAnel(mundo, c, g)
  const dx = destino.x - atual.x
  const dy = destino.y - atual.y
  return trocar(mundo, id, (x) => ({
    ...x,
    anel: { x: atual.x + dx, y: atual.y + dy },
    pontas: x.pontas.map((_, i) => {
      const daVez = posPonta(mundo, c, x, i)
      return { x: daVez.x + dx, y: daVez.y + dy }
    }),
    anelEm: null,
    pontasEm: x.pontasEm.map(() => null)
  }))
}

export const moverAnel = (mundo: Mundo, id: string, p: Ponto): Mundo =>
  trocar(mundo, id, (g) => ({ ...g, anel: p, anelEm: null }))

export const moverPonta = (mundo: Mundo, id: string, i: number, p: Ponto): Mundo =>
  trocar(mundo, id, (g) => ({
    ...g,
    pontas: g.pontas.map((q, j) => (j === i ? p : q)),
    pontasEm: g.pontasEm.map((q, j) => (j === i ? null : q))
  }))

export const mover = (mundo: Mundo, c: Cena, id: string, parte: Parte, p: Ponto): Mundo =>
  parte._tag === "Corpo"
    ? moverCorpo(mundo, c, id, p)
    : parte._tag === "Anel"
      ? moverAnel(mundo, id, p)
      : moverPonta(mundo, id, parte.i, p)

// ---- encaixar ----

export const RAIO = 34

const encaixesOcupados = (mundo: Mundo): ReadonlySet<string> => {
  const s = new Set<string>()
  for (const g of mundo.garfos) {
    const em = g.anelEm
    if (em === null) continue
    s.add(em._tag === "Teto" ? "teto" : `${em.garfo}:${em.i}`)
  }
  return s
}

/** Os ganchos que aceitam um anel agora: o do teto e as pontas não-terminais vagas. */
export const encaixesLivres = (
  mundo: Mundo,
  c: Cena,
  semEstes: ReadonlySet<string> = new Set()
): ReadonlyArray<{ readonly alvo: Encaixe; readonly p: Ponto }> => {
  const ocupados = encaixesOcupados(mundo)
  const saida: Array<{ alvo: Encaixe; p: Ponto }> = []
  if (!ocupados.has("teto")) saida.push({ alvo: { _tag: "Teto" }, p: c.teto })
  for (const g of mundo.garfos) {
    if (semEstes.has(g.id)) continue
    const regra = regraPorId(g.regra)
    if (regra === undefined) continue
    regra.corpo.forEach((s, i) => {
      if (s.tipo !== "naoTerminal" || ocupados.has(`${g.id}:${i}`)) return
      saida.push({ alvo: { _tag: "Ponta", garfo: g.id, i }, p: posPonta(mundo, c, g, i) })
    })
  }
  return saida
}

export const tokensLivres = (mundo: Mundo): ReadonlySet<number> => {
  const usados = new Set<number>()
  for (const g of mundo.garfos) {
    for (const preso of g.pontasEm) if (preso?._tag === "Token") usados.add(preso.i)
  }
  return usados
}

export const simboloDaPonta = (g: Garfo, i: number) => regraPorId(g.regra)?.corpo[i]

/**
 * Tenta encaixar a peça recém-largada. Uma ponta terminal só entra num token
 * da mesma categoria — a peça errada não encaixa, e é isso que dá o retorno,
 * sem precisar de mensagem de erro.
 */
export const encaixar = (mundo: Mundo, c: Cena, tokens: ReadonlyArray<Categoria>, id: string, parte: Parte): Mundo => {
  const g = achar(mundo, id)
  if (g === undefined || parte._tag === "Corpo") return mundo
  const aqui = posDaParte(mundo, c, g, parte)

  if (parte._tag === "Anel") {
    let melhor: { alvo: Encaixe; d: number } | null = null
    for (const { alvo, p } of encaixesLivres(mundo, c, pendentes(mundo, id))) {
      const d = dist(aqui, p)
      if (d <= RAIO && (melhor === null || d < melhor.d)) melhor = { alvo, d }
    }
    return melhor === null ? mundo : trocar(mundo, id, (x) => ({ ...x, anelEm: melhor.alvo }))
  }

  const simbolo = simboloDaPonta(g, parte.i)
  if (simbolo === undefined || simbolo.tipo === "naoTerminal") return mundo

  if (simbolo.tipo === "vazio") {
    let melhor: { i: number; d: number } | null = null
    for (let i = 0; i <= c.nTokens; i++) {
      const d = dist(aqui, c.fresta(i))
      if (d <= RAIO && (melhor === null || d < melhor.d)) melhor = { i, d }
    }
    return melhor === null
      ? mundo
      : trocar(mundo, id, (x) => ({
          ...x,
          pontasEm: x.pontasEm.map((q, j) => (j === parte.i ? { _tag: "Fresta" as const, i: melhor.i } : q))
        }))
  }

  const usados = tokensLivres(mundo)
  let melhor: { i: number; d: number } | null = null
  for (let i = 0; i < c.nTokens; i++) {
    if (usados.has(i) || tokens[i] !== simbolo.categoria) continue
    const d = dist(aqui, c.token(i))
    if (d <= RAIO && (melhor === null || d < melhor.d)) melhor = { i, d }
  }
  return melhor === null
    ? mundo
    : trocar(mundo, id, (x) => ({
        ...x,
        pontasEm: x.pontasEm.map((q, j) => (j === parte.i ? { _tag: "Token" as const, i: melhor.i } : q))
      }))
}

// ---- verificar ----

export type Veredito =
  | { readonly _tag: "SemRaiz" }
  | { readonly _tag: "GanchoVazio"; readonly quantos: number }
  | { readonly _tag: "PontaSolta"; readonly quantos: number }
  | { readonly _tag: "Cruzado" }
  | { readonly _tag: "TokenLivre"; readonly quantos: number }
  | { readonly _tag: "FrestaErrada"; readonly esperada: number; readonly encontrada: number }
  | { readonly _tag: "Certo" }

export const verificar = (mundo: Mundo, tokens: ReadonlyArray<Categoria>): Veredito => {
  const raiz = mundo.garfos.find((g) => g.anelEm?._tag === "Teto")
  if (raiz === undefined) return { _tag: "SemRaiz" }

  let ganchosVazios = 0
  let pontasSoltas = 0
  const ordem: number[] = []
  const frestas: Array<{ esperada: number; encontrada: number }> = []

  const andar = (g: Garfo, prof: number): void => {
    if (prof > 64) return
    const regra = regraPorId(g.regra)
    if (regra === undefined) return
    regra.corpo.forEach((s, i) => {
      if (s.tipo === "naoTerminal") {
        const filho = mundo.garfos.find(
          (x) => x.anelEm?._tag === "Ponta" && x.anelEm.garfo === g.id && x.anelEm.i === i
        )
        if (filho === undefined) ganchosVazios += 1
        else andar(filho, prof + 1)
        return
      }
      const preso = g.pontasEm[i]
      if (preso == null) {
        pontasSoltas += 1
        return
      }
      if (s.tipo === "vazio") frestas.push({ esperada: ordem.length, encontrada: preso.i })
      else if (preso._tag === "Token") ordem.push(preso.i)
    })
  }
  andar(raiz, 0)

  if (ganchosVazios > 0) return { _tag: "GanchoVazio", quantos: ganchosVazios }
  if (pontasSoltas > 0) return { _tag: "PontaSolta", quantos: pontasSoltas }

  for (let i = 1; i < ordem.length; i++) {
    const anterior = ordem[i - 1]
    const atual = ordem[i]
    if (anterior !== undefined && atual !== undefined && atual < anterior) return { _tag: "Cruzado" }
  }

  if (ordem.length !== tokens.length) return { _tag: "TokenLivre", quantos: tokens.length - ordem.length }

  const fora = frestas.find((f) => f.esperada !== f.encontrada)
  if (fora !== undefined) return { _tag: "FrestaErrada", esperada: fora.esperada, encontrada: fora.encontrada }

  return { _tag: "Certo" }
}
