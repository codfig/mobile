import { describe, expect, it } from "vitest"
import { lexar, regraDe } from "./gramatica.js"
import { ANBN, ARITMETICA } from "./niveis.js"
import { cenaDe, medidas } from "./layout.js"
import {
  encaixar,
  mover,
  mundoVazio,
  novoGarfo,
  por,
  posAnel,
  posPonta,
  tirar,
  verificar,
  type Mundo
} from "./mundo.js"

const tokens = lexar(ANBN, "a a b b")
const R = { r1: regraDe(ANBN, "S → a S b")!, r2: regraDe(ANBN, "S → ε")! }
const m = medidas(tokens.length)
const c = cenaDe(m, tokens.length)

/** Traz um garfo e devolve o mundo novo junto com o id dele. */
const trazer = (w: Mundo, regra: keyof typeof R) => {
  const g = novoGarfo(R[regra], { x: m.largura / 2, y: 120 })
  return { mundo: por(w, g), id: g.id }
}

/** Arrasta uma parte até um ponto e larga, deixando o encaixe acontecer (ou não). */
const levar = (w: Mundo, id: string, parte: Parameters<typeof mover>[3], destino: { x: number; y: number }) =>
  encaixar(ANBN, mover(w, c, id, parte, destino), c, tokens, id, parte)

describe("garfo solto no mundo", () => {
  it("chega sem contato nenhum", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    const g = mundo.garfos.find((x) => x.id === id)!
    expect(g.anelEm).toBeNull()
    expect(g.pontasEm.every((p) => p === null)).toBe(true)
  })

  it("arrastar o corpo move anel e pontas juntos", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    const antes = mundo.garfos.find((x) => x.id === id)!
    const pontaAntes = posPonta(mundo, c, antes, 0)
    const depois = mover(mundo, c, id, { _tag: "Corpo" }, { x: antes.anel.x + 40, y: antes.anel.y + 10 })
    const g = depois.garfos.find((x) => x.id === id)!
    expect(posAnel(depois, c, g).x).toBeCloseTo(antes.anel.x + 40)
    expect(posPonta(depois, c, g, 0).x).toBeCloseTo(pontaAntes.x + 40)
  })

  it("arrastar o corpo nao desfaz encaixe: anel no gancho, ponta no token", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    let w = levar(mundo, id, { _tag: "Anel" }, c.teto)
    w = levar(w, id, { _tag: "Ponta", i: 0 }, c.token(0))
    const antes = w.garfos.find((x) => x.id === id)!
    const soltaAntes = posPonta(w, c, antes, 2)
    // o destino é relativo ao anel, que está no teto
    w = mover(w, c, id, { _tag: "Corpo" }, { x: c.teto.x + 30, y: c.teto.y + 20 })
    const g = w.garfos.find((x) => x.id === id)!
    expect(g.anelEm).toEqual({ _tag: "Teto" })
    expect(g.pontasEm[0]).toEqual({ _tag: "Token", i: 0 })
    expect(posPonta(w, c, g, 0)).toEqual(c.token(0))
    expect(posPonta(w, c, g, 2)).toEqual({ x: soltaAntes.x + 30, y: soltaAntes.y + 20 })
  })

  it("nenhuma peca arrastada sai da sala", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    const naSala = (p: { x: number; y: number }) =>
      p.x >= 0 && p.x <= c.largura && p.y >= 0 && p.y <= c.altura
    const pecas = (w: Mundo) => {
      const g = w.garfos.find((x) => x.id === id)!
      return [posAnel(w, c, g), ...g.pontas.map((_, j) => posPonta(w, c, g, j))]
    }
    expect(pecas(mover(mundo, c, id, { _tag: "Corpo" }, { x: -500, y: 5000 })).every(naSala)).toBe(true)
    expect(pecas(mover(mundo, c, id, { _tag: "Anel" }, { x: 9000, y: -40 })).every(naSala)).toBe(true)
    expect(pecas(mover(mundo, c, id, { _tag: "Ponta", i: 1 }, { x: -300, y: -300 })).every(naSala)).toBe(true)
  })

  it("arrastar so o anel estica o garfo, sem levar as pontas", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    const antes = mundo.garfos.find((x) => x.id === id)!
    const pontaAntes = posPonta(mundo, c, antes, 0)
    const depois = mover(mundo, c, id, { _tag: "Anel" }, { x: antes.anel.x, y: antes.anel.y - 50 })
    const g = depois.garfos.find((x) => x.id === id)!
    expect(posAnel(depois, c, g).y).toBeCloseTo(antes.anel.y - 50)
    expect(posPonta(depois, c, g, 0)).toEqual(pontaAntes)
  })
})

describe("pontas vizinhas se repelem", () => {
  const pontasDe = (w: Mundo, id: string) => {
    const g = w.garfos.find((x) => x.id === id)!
    return g.pontas.map((_, j) => posPonta(w, c, g, j))
  }

  it("arrastar para longe, bem abaixo das irmas, nao mexe nelas", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    const antes = pontasDe(mundo, id)
    const w = mover(mundo, c, id, { _tag: "Ponta", i: 0 }, { x: antes[0]!.x, y: antes[0]!.y + 200 })
    const depois = pontasDe(w, id)
    expect(depois[1]).toEqual(antes[1])
    expect(depois[2]).toEqual(antes[2])
  })

  it("chegar perto empurra a vizinha de leve, so na horizontal", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    const antes = pontasDe(mundo, id)
    const w = mover(mundo, c, id, { _tag: "Ponta", i: 0 }, { x: antes[0]!.x + 30, y: antes[0]!.y })
    const depois = pontasDe(w, id)
    const andou = depois[1]!.x - antes[1]!.x
    expect(andou).toBeGreaterThan(0)
    expect(andou).toBeLessThan(30)
    expect(depois[1]!.y).toBe(antes[1]!.y)
  })

  it("empurrar alem das irmas as carrega adiante, sem trocar a ordem", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    const antes = pontasDe(mundo, id)
    const w = mover(mundo, c, id, { _tag: "Ponta", i: 0 }, { x: antes[2]!.x + 80, y: antes[0]!.y })
    const [a, s, b] = pontasDe(w, id)
    expect(s!.x).toBeGreaterThan(a!.x)
    expect(b!.x).toBeGreaterThan(s!.x)
  })

  it("voltar o dedo ao lugar devolve as irmas ao lugar", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    const antes = pontasDe(mundo, id)
    const w = mover(mundo, c, id, { _tag: "Ponta", i: 0 }, antes[0]!)
    expect(pontasDe(w, id)).toEqual(antes)
  })

  it("a ponta presa fica parada e a arrastada nao passa por cima dela", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    // a ponta 2 e o "b"; o token 2 e um "b"
    let w = levar(mundo, id, { _tag: "Ponta", i: 2 }, c.token(2))
    w = mover(w, c, id, { _tag: "Ponta", i: 0 }, { x: c.token(3).x, y: c.token(2).y })
    const g = w.garfos.find((x) => x.id === id)!
    expect(g.pontasEm[2]).toEqual({ _tag: "Token", i: 2 })
    const [a, s, b] = pontasDe(w, id)
    expect(b).toEqual(c.token(2))
    expect(a!.x).toBeLessThan(s!.x)
    expect(s!.x).toBeLessThan(b!.x)
  })

  it("o garfo pendurado numa ponta acompanha quando ela e empurrada", () => {
    let w = mundoVazio
    const pai = trazer(w, "r1"); w = pai.mundo
    const filho = trazer(w, "r1"); w = filho.mundo
    w = levar(w, filho.id, { _tag: "Anel" }, pontasDe(w, pai.id)[1]!)
    const antes = pontasDe(w, pai.id)
    w = mover(w, c, pai.id, { _tag: "Ponta", i: 0 }, { x: antes[1]!.x, y: antes[0]!.y })
    const gFilho = w.garfos.find((x) => x.id === filho.id)!
    expect(posAnel(w, c, gFilho)).toEqual(pontasDe(w, pai.id)[1])
    expect(pontasDe(w, pai.id)[1]!.x).toBeGreaterThan(antes[1]!.x)
  })
})

describe("encaixar", () => {
  it("o anel largado no gancho do teto se pendura", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    const w = levar(mundo, id, { _tag: "Anel" }, c.teto)
    expect(w.garfos.find((x) => x.id === id)!.anelEm).toEqual({ _tag: "Teto" })
  })

  it("o anel largado longe de tudo continua solto", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    const w = levar(mundo, id, { _tag: "Anel" }, { x: 20, y: 200 })
    expect(w.garfos.find((x) => x.id === id)!.anelEm).toBeNull()
  })

  it("uma ponta so entra num token da mesma categoria", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    // ponta 0 e o terminal "a"; token 2 e um "b"
    const errado = levar(mundo, id, { _tag: "Ponta", i: 0 }, c.token(2))
    expect(errado.garfos.find((x) => x.id === id)!.pontasEm[0]).toBeNull()
    const certo = levar(mundo, id, { _tag: "Ponta", i: 0 }, c.token(0))
    expect(certo.garfos.find((x) => x.id === id)!.pontasEm[0]).toEqual({ _tag: "Token", i: 0 })
  })

  it("dois terminais nao dividem o mesmo token", () => {
    let w = mundoVazio
    const um = trazer(w, "r1"); w = um.mundo
    const dois = trazer(w, "r1"); w = dois.mundo
    w = levar(w, um.id, { _tag: "Ponta", i: 0 }, c.token(0))
    w = levar(w, dois.id, { _tag: "Ponta", i: 0 }, c.token(0))
    expect(w.garfos.find((x) => x.id === dois.id)!.pontasEm[0]).toBeNull()
  })

  it("um anel nao se pendura numa ponta do proprio galho (sem laco)", () => {
    let w = mundoVazio
    const pai = trazer(w, "r1"); w = pai.mundo
    w = levar(w, pai.id, { _tag: "Anel" }, c.teto)
    const filho = trazer(w, "r1"); w = filho.mundo
    const gPai = w.garfos.find((x) => x.id === pai.id)!
    w = levar(w, filho.id, { _tag: "Anel" }, posPonta(w, c, gPai, 1))
    expect(w.garfos.find((x) => x.id === filho.id)!.anelEm).toEqual({ _tag: "Ponta", garfo: pai.id, i: 1 })
    // agora o pai tenta se pendurar na ponta livre do filho: seria um laco
    const gFilho = w.garfos.find((x) => x.id === filho.id)!
    const depois = levar(w, pai.id, { _tag: "Anel" }, posPonta(w, c, gFilho, 1))
    expect(depois.garfos.find((x) => x.id === pai.id)!.anelEm).not.toEqual({ _tag: "Ponta", garfo: filho.id, i: 1 })
  })
})

describe("tirar", () => {
  it("quem estava pendurado no garfo removido cai solto", () => {
    let w = mundoVazio
    const pai = trazer(w, "r1"); w = pai.mundo
    w = levar(w, pai.id, { _tag: "Anel" }, c.teto)
    const filho = trazer(w, "r1"); w = filho.mundo
    const gPai = w.garfos.find((x) => x.id === pai.id)!
    w = levar(w, filho.id, { _tag: "Anel" }, posPonta(w, c, gPai, 1))
    const depois = tirar(w, pai.id)
    expect(depois.garfos).toHaveLength(1)
    expect(depois.garfos[0]!.anelEm).toBeNull()
  })
})

/** Monta a arvore inteira de aabb, encaixe por encaixe. */
const arvoreDeAabb = (): Mundo => {
  let w = mundoVazio
  const fora = trazer(w, "r1"); w = fora.mundo
  w = levar(w, fora.id, { _tag: "Anel" }, c.teto)
  w = levar(w, fora.id, { _tag: "Ponta", i: 0 }, c.token(0))
  w = levar(w, fora.id, { _tag: "Ponta", i: 2 }, c.token(3))

  const dentro = trazer(w, "r1"); w = dentro.mundo
  w = levar(w, dentro.id, { _tag: "Anel" }, posPonta(w, c, w.garfos.find((x) => x.id === fora.id)!, 1))
  w = levar(w, dentro.id, { _tag: "Ponta", i: 0 }, c.token(1))
  w = levar(w, dentro.id, { _tag: "Ponta", i: 2 }, c.token(2))

  const vazio = trazer(w, "r2"); w = vazio.mundo
  w = levar(w, vazio.id, { _tag: "Anel" }, posPonta(w, c, w.garfos.find((x) => x.id === dentro.id)!, 1))
  w = levar(w, vazio.id, { _tag: "Ponta", i: 0 }, c.fresta(2))
  return w
}

describe("verificar", () => {
  it("sem nada no teto nao ha arvore", () => {
    expect(verificar(ANBN, mundoVazio, tokens)).toEqual({ _tag: "SemRaiz" })
  })

  it("acusa gancho por preencher", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    const w = levar(mundo, id, { _tag: "Anel" }, c.teto)
    expect(verificar(ANBN, w, tokens)).toEqual({ _tag: "GanchoVazio", quantos: 1 })
  })

  it("aceita a arvore inteira de aabb", () => {
    expect(verificar(ANBN, arvoreDeAabb(), tokens)).toEqual({ _tag: "Certo" })
  })

  it("o e pousado na fresta errada e recusado", () => {
    let w = arvoreDeAabb()
    const eps = w.garfos.find((g) => g.regra === R.r2.id)!
    w = levar(w, eps.id, { _tag: "Ponta", i: 0 }, c.fresta(0))
    expect(verificar(ANBN, w, tokens)).toEqual({ _tag: "FrestaErrada", esperada: 2, encontrada: 0 })
  })
})

describe("gramatica com varios nao-terminais", () => {
  const toks = lexar(ARITMETICA, "2")
  const mA = medidas(toks.length)
  const cA = cenaDe(mA, toks.length)
  const regra = (id: string) => regraDe(ARITMETICA, id)!
  const levarA = (w: Mundo, id: string, parte: Parameters<typeof mover>[3], destino: { x: number; y: number }) =>
    encaixar(ARITMETICA, mover(w, cA, id, parte, destino), cA, toks, id, parte)
  const trazerA = (w: Mundo, id: string) => {
    const g = novoGarfo(regra(id), { x: mA.largura / 2, y: 140 })
    return { mundo: por(w, g), id: g.id }
  }

  it("um anel so entra num gancho da mesma forma: F nao pendura no E do teto", () => {
    const { mundo, id } = trazerA(mundoVazio, "F → num")
    const w = levarA(mundo, id, { _tag: "Anel" }, cA.teto)
    expect(w.garfos.find((x) => x.id === id)!.anelEm).toBeNull()
  })

  it("pendura E → T → F → num sobre o programa 2, garfo por garfo", () => {
    let w = mundoVazio
    const e = trazerA(w, "E → T"); w = e.mundo
    w = levarA(w, e.id, { _tag: "Anel" }, cA.teto)

    const t = trazerA(w, "T → F"); w = t.mundo
    w = levarA(w, t.id, { _tag: "Anel" }, posPonta(w, cA, w.garfos.find((x) => x.id === e.id)!, 0))

    const f = trazerA(w, "F → num"); w = f.mundo
    w = levarA(w, f.id, { _tag: "Anel" }, posPonta(w, cA, w.garfos.find((x) => x.id === t.id)!, 0))
    w = levarA(w, f.id, { _tag: "Ponta", i: 0 }, cA.token(0))

    expect(verificar(ARITMETICA, w, toks)).toEqual({ _tag: "Certo" })
  })
})
