import { regraDe, type Gramatica, type Regra, type Token } from "./gramatica.js"
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
export const novoGarfo = (regra: Regra, onde: Ponto): Garfo => {
  const corpo = regra.corpo
  const vao = 54 * Math.max(corpo.length - 1, 0)
  return {
    id: `g${++seq}`,
    regra: regra.id,
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

/** Nenhuma peça arrastada sai da sala: fora dela a vista não a alcançaria. */
const MARGEM = 16

const dentro = (c: Cena, p: Ponto): Ponto => ({
  x: Math.min(c.largura - MARGEM, Math.max(MARGEM, p.x)),
  y: Math.min(c.altura - MARGEM, Math.max(MARGEM, p.y))
})

/** O deslocamento `d` encurtado para que nenhum dos valores saia de [lo, hi]; nunca piora quem já está fora. */
const deslocamentoDentro = (valores: ReadonlyArray<number>, d: number, lo: number, hi: number): number =>
  valores.length === 0
    ? d
    : Math.min(Math.max(0, hi - Math.max(...valores)), Math.max(Math.min(0, lo - Math.min(...valores)), d))

/**
 * Arrastar o corpo leva junto só o que está solto. Um anel pendurado continua no
 * gancho e uma ponta presa continua no token: encaixe só se desfaz quando se
 * pega aquela peça em si. O que estava pendurado nas pontas soltas vem junto,
 * porque a posição dos filhos é lida a partir das pontas do pai.
 */
export const moverCorpo = (mundo: Mundo, c: Cena, id: string, destino: Ponto): Mundo => {
  const g = achar(mundo, id)
  if (g === undefined) return mundo
  const atual = posAnel(mundo, c, g)
  const soltas = [
    ...(g.anelEm === null ? [atual] : []),
    ...g.pontas.flatMap((_, i) => (g.pontasEm[i] == null ? [posPonta(mundo, c, g, i)] : []))
  ]
  const dx = deslocamentoDentro(soltas.map((q) => q.x), destino.x - atual.x, MARGEM, c.largura - MARGEM)
  const dy = deslocamentoDentro(soltas.map((q) => q.y), destino.y - atual.y, MARGEM, c.altura - MARGEM)
  return trocar(mundo, id, (x) => ({
    ...x,
    anel: x.anelEm === null ? { x: atual.x + dx, y: atual.y + dy } : x.anel,
    pontas: x.pontas.map((q, i) => {
      if (x.pontasEm[i] != null) return q
      const daVez = posPonta(mundo, c, x, i)
      return { x: daVez.x + dx, y: daVez.y + dy }
    })
  }))
}

export const moverAnel = (mundo: Mundo, c: Cena, id: string, p: Ponto): Mundo =>
  trocar(mundo, id, (g) => ({ ...g, anel: dentro(c, p), anelEm: null }))

// ---- pontas vizinhas se repelem ----

/** Abaixo desta distância horizontal, duas pontas irmãs começam a se empurrar. */
const DISTANCIA_CONFORTAVEL = 64
/** A repulsão enfraquece com a distância vertical e some a partir desta. */
const ALCANCE_VERTICAL = 90
/** Fração do aperto desfeita a cada volta: fraca de propósito. */
const FORCA = 0.25
const VOLTAS = 3
/** Folga mínima entre irmãs vizinhas; é o que impede que troquem de ordem. */
const VAO_MINIMO = 28

/**
 * Arrastar uma ponta empurra as irmãs de leve, só na horizontal, e nunca deixa
 * que troquem de ordem: a ponta 0 fica sempre à esquerda da 1, que fica à
 * esquerda da 2. Uma irmã no caminho é empurrada adiante em vez de atravessada.
 *
 * Ponta presa num token não se mexe, e a arrastada não passa por cima dela.
 * O que estiver pendurado nas pontas acompanha, porque a posição dos filhos é
 * lida a partir delas.
 *
 * Deve ser chamada a partir do mundo do começo do arrasto: assim, voltar o dedo
 * ao lugar devolve as irmãs ao lugar, em vez de deixá-las onde foram empurradas.
 */
export const moverPonta = (mundo: Mundo, c: Cena, id: string, i: number, alvo: Ponto): Mundo => {
  const p = dentro(c, alvo)
  const g = achar(mundo, id)
  if (g === undefined) return mundo
  const n = g.pontas.length
  const fixa = (j: number) => j === i || g.pontasEm[j] != null
  const pos = g.pontas.map((_, j) => posPonta(mundo, c, g, j))
  const xs = pos.map((q) => q.x)
  const ys = pos.map((q) => q.y)
  const inicio = [...xs]

  // a arrastada não atravessa irmã presa nem parede, e deixa lugar para as soltas do meio
  let x = Math.min(c.largura - MARGEM - VAO_MINIMO * (n - 1 - i), Math.max(MARGEM + VAO_MINIMO * i, p.x))
  for (let k = 0; k < n; k++) {
    if (k === i || g.pontasEm[k] == null) continue
    const presa = xs[k] ?? 0
    if (k < i) x = Math.max(x, presa + VAO_MINIMO * (i - k))
    else x = Math.min(x, presa - VAO_MINIMO * (k - i))
  }
  xs[i] = x
  ys[i] = p.y

  const ordenar = () => {
    for (let j = 1; j < n; j++) {
      if (!fixa(j)) xs[j] = Math.max(xs[j] ?? 0, (xs[j - 1] ?? 0) + VAO_MINIMO)
    }
    for (let j = n - 2; j >= 0; j--) {
      if (!fixa(j)) xs[j] = Math.min(xs[j] ?? 0, (xs[j + 1] ?? 0) - VAO_MINIMO)
    }
  }

  for (let volta = 0; volta < VOLTAS; volta++) {
    const empurrao = xs.map((xj, j) => {
      if (fixa(j)) return 0
      let soma = 0
      for (let k = 0; k < n; k++) {
        if (k === j) continue
        // Confortável é o que o par já tinha no começo do arrasto, até o teto:
        // parado, ninguém empurra ninguém, mesmo que tenham ficado apertados antes.
        const conforto = Math.min(DISTANCIA_CONFORTAVEL, Math.abs((inicio[k] ?? 0) - (inicio[j] ?? 0)))
        const aperto = conforto - Math.abs((xs[k] ?? 0) - xj)
        const peso = Math.max(0, 1 - Math.abs((ys[k] ?? 0) - (ys[j] ?? 0)) / ALCANCE_VERTICAL)
        // o sentido vem da ordem, não da posição: quem vem antes é empurrado para a esquerda
        if (aperto > 0) soma += aperto * peso * FORCA * (j < k ? -1 : 1)
      }
      return soma
    })
    empurrao.forEach((d, j) => (xs[j] = (xs[j] ?? 0) + d))
    ordenar()
  }
  // empurrada para fora da sala, a irmã para na parede
  xs.forEach((xj, j) => {
    if (!fixa(j)) xs[j] = Math.min(c.largura - MARGEM, Math.max(MARGEM, xj))
  })
  ordenar()

  return trocar(mundo, id, (x0) => ({
    ...x0,
    pontas: x0.pontas.map((q, j) =>
      j === i ? { x: xs[i] ?? p.x, y: p.y } : x0.pontasEm[j] != null ? q : { x: xs[j] ?? q.x, y: ys[j] ?? q.y }
    ),
    pontasEm: x0.pontasEm.map((q, j) => (j === i ? null : q))
  }))
}

export const mover = (mundo: Mundo, c: Cena, id: string, parte: Parte, p: Ponto): Mundo =>
  parte._tag === "Corpo"
    ? moverCorpo(mundo, c, id, p)
    : parte._tag === "Anel"
      ? moverAnel(mundo, c, id, p)
      : moverPonta(mundo, c, id, parte.i, p)

// ---- o abraço dos ramos ----

/** Quanto o ramo passa da peça mais de fora da subárvore. */
const FOLGA_DO_ABRACO = 18
/** O ramo passa da ponta, para fora, no máximo esta fração da altura dele. */
const ALCANCE_POR_ALTURA = 0.5

export type Abraco = {
  /** Até que x os pontos de controle da curva vão buscar. */
  readonly borda: number
  /** De 0 a 1: quanto do caminho até a borda eles andam. */
  readonly forca: number
}

/**
 * Um garfo com garfos pendurados abraça tudo o que pende dele. Só o primeiro e
 * o último ramo abraçam — o primeiro pela esquerda, o último pela direita —, e
 * a curva vai buscar a peça mais de fora da subárvore naquele lado. Ramo do
 * meio nunca abre: em `F → ( E )`, o E desce sem se entortar, e os parênteses,
 * que já estão por fora, saem do anel para fora e descem até o token por fora
 * da subárvore. Garfo de um ramo só não tem dois lados, então não abraça.
 *
 * Quanto mais garfos embaixo, mais forte: um só abre metade, e cada garfo a
 * mais fecha metade do que falta.
 */
export const abracoDoRamo = (mundo: Mundo, c: Cena, g: Garfo, i: number): Abraco | null => {
  const n = g.pontas.length
  if (n < 2 || (i !== 0 && i !== n - 1)) return null
  const subarvore = pendentes(mundo, g.id)
  const embaixo = mundo.garfos.filter((x) => x.id !== g.id && subarvore.has(x.id))
  if (embaixo.length === 0) return null

  const ponta = posPonta(mundo, c, g, i)
  // ramo curto não dá a volta: o quanto passa da ponta é limitado pela altura dele
  const alcance = ALCANCE_POR_ALTURA * Math.abs(ponta.y - posAnel(mundo, c, g).y)
  const xs = embaixo.flatMap((x) => [posAnel(mundo, c, x).x, ...x.pontas.map((_, j) => posPonta(mundo, c, x, j).x)])
  // Ponta que já está por fora fica com a borda nela mesma: o ramo sai do anel
  // para fora e desce a prumo até ela, sem cortar a subárvore nem passar dela.
  const borda =
    i === 0
      ? Math.max(ponta.x - alcance, Math.min(ponta.x, Math.min(...xs) - FOLGA_DO_ABRACO))
      : Math.min(ponta.x + alcance, Math.max(ponta.x, Math.max(...xs) + FOLGA_DO_ABRACO))
  return { borda, forca: 1 - 0.5 ** embaixo.length }
}

// ---- gravidade ----

/** Distância vertical preferida entre um nível da árvore e o de baixo. */
const DEGRAU = 66
/** Folga que a gravidade deixa abaixo do teto quando a árvore é funda. */
const FOLGA_TETO = 40

/**
 * Onde cada junta cai com a gravidade ligada. Junta é uma ponta com um garfo
 * pendurado nela, desde que por esse garfo se chegue a uma folha presa no chão.
 * Ela desce até um degrau acima do mais alto que tem embaixo, e fica bem em cima
 * dele quando ele é um só, ou no meio deles quando são vários.
 *
 * Folhas estão todas no chão, então "um degrau acima do mais alto embaixo" é o
 * mesmo que o chão menos tantos degraus quanto a junta tem de altura. O degrau
 * encurta se a árvore mais alta não couber abaixo do teto.
 */
const alvosDaGravidade = (mundo: Mundo, c: Cena): ReadonlyMap<string, Ponto> => {
  const chao = c.fresta(0).y
  const filhoEm = new Map<string, Garfo>()
  for (const g of mundo.garfos) {
    if (g.anelEm?._tag === "Ponta") filhoEm.set(`${g.anelEm.garfo}:${g.anelEm.i}`, g)
  }

  // altura e x de cada junta, de baixo para cima; null quando não chega a folha
  const juntas = new Map<string, { x: number; h: number } | null>()
  const junta = (g: Garfo, i: number, prof: number): { x: number; h: number } | null => {
    const chave = `${g.id}:${i}`
    const pronta = juntas.get(chave)
    if (pronta !== undefined) return pronta
    const filho = filhoEm.get(chave)
    if (filho === undefined || prof > 64) return null
    const embaixo = filho.pontas.flatMap((_, j) => {
      const preso = filho.pontasEm[j]
      if (preso != null) return [{ x: posPonta(mundo, c, filho, j).x, h: 0 }]
      const abaixo = junta(filho, j, prof + 1)
      return abaixo === null ? [] : [abaixo]
    })
    const r =
      embaixo.length === 0
        ? null
        : { x: embaixo.reduce((s, q) => s + q.x, 0) / embaixo.length, h: 1 + Math.max(...embaixo.map((q) => q.h)) }
    juntas.set(chave, r)
    return r
  }
  for (const g of mundo.garfos) g.pontas.forEach((_, i) => junta(g, i, 0))

  const alturaMax = Math.max(0, ...[...juntas.values()].map((j) => j?.h ?? 0))
  const degrau = alturaMax === 0 ? DEGRAU : Math.min(DEGRAU, (chao - c.teto.y - FOLGA_TETO) / alturaMax)
  const alvos = new Map<string, Ponto>()
  for (const [chave, j] of juntas) if (j !== null) alvos.set(chave, { x: j.x, y: chao - j.h * degrau })
  return alvos
}

/**
 * Um passo da gravidade: cada junta anda a `fracao` do caminho até onde cai.
 * Com 1, chega de uma vez. Quando nada mais se mexe, devolve o mesmo mundo, e
 * é assim que quem anima sabe que parou.
 */
export const assentar = (mundo: Mundo, c: Cena, fracao = 1): Mundo => {
  const alvos = alvosDaGravidade(mundo, c)
  let mexeu = false
  const garfos = mundo.garfos.map((g) => {
    let mexeuAqui = false
    const pontas = g.pontas.map((q, i) => {
      const alvo = alvos.get(`${g.id}:${i}`)
      if (alvo === undefined || (q.x === alvo.x && q.y === alvo.y)) return q
      mexeuAqui = true
      const perto = Math.hypot(alvo.x - q.x, alvo.y - q.y) * (1 - fracao) < 0.5
      return perto ? alvo : { x: q.x + (alvo.x - q.x) * fracao, y: q.y + (alvo.y - q.y) * fracao }
    })
    if (!mexeuAqui) return g
    mexeu = true
    return { ...g, pontas }
  })
  return mexeu ? { garfos } : mundo
}

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

/**
 * Os ganchos vagos: o do teto e as pontas não-terminais sem ninguém pendurado.
 * Com `aceita`, só os ganchos daquele não-terminal — um anel `F` não entra num
 * gancho `E`, do mesmo jeito que a forma dele não cabe.
 */
export const encaixesLivres = (
  gram: Gramatica,
  mundo: Mundo,
  c: Cena,
  semEstes: ReadonlySet<string> = new Set(),
  aceita?: string
): ReadonlyArray<{ readonly alvo: Encaixe; readonly p: Ponto; readonly nome: string }> => {
  const ocupados = encaixesOcupados(mundo)
  const saida: Array<{ alvo: Encaixe; p: Ponto; nome: string }> = []
  if (!ocupados.has("teto")) saida.push({ alvo: { _tag: "Teto" }, p: c.teto, nome: gram.inicio })
  for (const g of mundo.garfos) {
    if (semEstes.has(g.id)) continue
    const regra = regraDe(gram, g.regra)
    if (regra === undefined) continue
    regra.corpo.forEach((s, i) => {
      if (s.tipo !== "naoTerminal" || ocupados.has(`${g.id}:${i}`)) return
      saida.push({ alvo: { _tag: "Ponta", garfo: g.id, i }, p: posPonta(mundo, c, g, i), nome: s.nome })
    })
  }
  return aceita === undefined ? saida : saida.filter((e) => e.nome === aceita)
}

/** Os tokens que já têm uma ponta presa neles. */
export const tokensOcupados = (mundo: Mundo): ReadonlySet<number> => {
  const usados = new Set<number>()
  for (const g of mundo.garfos) {
    for (const preso of g.pontasEm) if (preso?._tag === "Token") usados.add(preso.i)
  }
  return usados
}

export const simboloDaPonta = (gram: Gramatica, g: Garfo, i: number) => regraDe(gram, g.regra)?.corpo[i]

/**
 * Tenta encaixar a peça recém-largada. Uma ponta terminal só entra num token
 * da mesma categoria — a peça errada não encaixa, e é isso que dá o retorno,
 * sem precisar de mensagem de erro.
 */
export const encaixar = (
  gram: Gramatica,
  mundo: Mundo,
  c: Cena,
  tokens: ReadonlyArray<Token>,
  id: string,
  parte: Parte
): Mundo => {
  const g = achar(mundo, id)
  if (g === undefined || parte._tag === "Corpo") return mundo
  const aqui = posDaParte(mundo, c, g, parte)

  if (parte._tag === "Anel") {
    const regra = regraDe(gram, g.regra)
    if (regra === undefined) return mundo
    let melhor: { alvo: Encaixe; d: number } | null = null
    for (const { alvo, p } of encaixesLivres(gram, mundo, c, pendentes(mundo, id), regra.cabeca)) {
      const d = dist(aqui, p)
      if (d <= RAIO && (melhor === null || d < melhor.d)) melhor = { alvo, d }
    }
    return melhor === null ? mundo : trocar(mundo, id, (x) => ({ ...x, anelEm: melhor.alvo }))
  }

  const simbolo = simboloDaPonta(gram, g, parte.i)
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

  const usados = tokensOcupados(mundo)
  let melhor: { i: number; d: number } | null = null
  for (let i = 0; i < c.nTokens; i++) {
    if (usados.has(i) || tokens[i]?.categoria !== simbolo.categoria) continue
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

export const verificar = (gram: Gramatica, mundo: Mundo, tokens: ReadonlyArray<Token>): Veredito => {
  const raiz = mundo.garfos.find((g) => g.anelEm?._tag === "Teto")
  if (raiz === undefined) return { _tag: "SemRaiz" }

  let ganchosVazios = 0
  let pontasSoltas = 0
  const ordem: number[] = []
  const frestas: Array<{ esperada: number; encontrada: number }> = []

  const andar = (g: Garfo, prof: number): void => {
    if (prof > 64) return
    const regra = regraDe(gram, g.regra)
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
