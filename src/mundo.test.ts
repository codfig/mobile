import { describe, expect, it } from "vitest"
import { NIVEIS } from "./gramatica.js"
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

const tokens = ["a", "a", "b", "b"] as const
const m = medidas(tokens.length)
const c = cenaDe(m, tokens.length)

/** Traz um garfo e devolve o mundo novo junto com o id dele. */
const trazer = (w: Mundo, regra: string) => {
  const g = novoGarfo(regra, { x: m.largura / 2, y: 120 })
  return { mundo: por(w, g), id: g.id }
}

/** Arrasta uma parte até um ponto e larga, deixando o encaixe acontecer (ou não). */
const levar = (w: Mundo, id: string, parte: Parameters<typeof mover>[3], destino: { x: number; y: number }) =>
  encaixar(mover(w, c, id, parte, destino), c, tokens, id, parte)

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

describe("pontas em harmonia", () => {
  it("arrastar uma ponta abre o garfo inteiro por igual, como um leque", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    const g0 = mundo.garfos.find((x) => x.id === id)!
    const anel = posAnel(mundo, c, g0)
    // a ponta "a" sai de (-54, +66) do anel e vai para o dobro disso
    const w = mover(mundo, c, id, { _tag: "Ponta", i: 0 }, { x: anel.x - 108, y: anel.y + 132 })
    const g = w.garfos.find((x) => x.id === id)!
    expect(posPonta(w, c, g, 1).x).toBeCloseTo(anel.x)
    expect(posPonta(w, c, g, 1).y).toBeCloseTo(anel.y + 132)
    expect(posPonta(w, c, g, 2).x).toBeCloseTo(anel.x + 108)
    expect(posPonta(w, c, g, 2).y).toBeCloseTo(anel.y + 132)
  })

  it("a ponta presa num token fica onde esta", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    let w = levar(mundo, id, { _tag: "Ponta", i: 0 }, c.token(0))
    const g0 = w.garfos.find((x) => x.id === id)!
    w = mover(w, c, id, { _tag: "Ponta", i: 2 }, { x: posPonta(w, c, g0, 2).x + 60, y: 300 })
    const g = w.garfos.find((x) => x.id === id)!
    expect(g.pontasEm[0]).toEqual({ _tag: "Token", i: 0 })
    expect(posPonta(w, c, g, 0)).toEqual(c.token(0))
  })

  it("puxar a ponta do meio de lado arrasta as outras de lado, sem esmagar", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    const g0 = mundo.garfos.find((x) => x.id === id)!
    const antes0 = posPonta(mundo, c, g0, 0)
    const meio = posPonta(mundo, c, g0, 1)
    const w = mover(mundo, c, id, { _tag: "Ponta", i: 1 }, { x: meio.x + 30, y: meio.y })
    const g = w.garfos.find((x) => x.id === id)!
    expect(posPonta(w, c, g, 0).x).toBeCloseTo(antes0.x + 30)
    expect(posPonta(w, c, g, 0).y).toBeCloseTo(antes0.y)
  })

  it("o garfo pendurado numa ponta acompanha quando ela se move", () => {
    let w = mundoVazio
    const pai = trazer(w, "r1"); w = pai.mundo
    const filho = trazer(w, "r1"); w = filho.mundo
    w = levar(w, filho.id, { _tag: "Anel" }, posPonta(w, c, w.garfos.find((x) => x.id === pai.id)!, 1))
    const gPai = w.garfos.find((x) => x.id === pai.id)!
    const anelPai = posAnel(w, c, gPai)
    w = mover(w, c, pai.id, { _tag: "Ponta", i: 0 }, { x: anelPai.x - 108, y: anelPai.y + 132 })
    const gPaiDepois = w.garfos.find((x) => x.id === pai.id)!
    const gFilho = w.garfos.find((x) => x.id === filho.id)!
    expect(posAnel(w, c, gFilho)).toEqual(posPonta(w, c, gPaiDepois, 1))
    expect(posAnel(w, c, gFilho).y).toBeCloseTo(anelPai.y + 132)
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
    expect(verificar(mundoVazio, tokens)).toEqual({ _tag: "SemRaiz" })
  })

  it("acusa gancho por preencher", () => {
    const { mundo, id } = trazer(mundoVazio, "r1")
    const w = levar(mundo, id, { _tag: "Anel" }, c.teto)
    expect(verificar(w, tokens)).toEqual({ _tag: "GanchoVazio", quantos: 1 })
  })

  it("aceita a arvore inteira de aabb", () => {
    expect(verificar(arvoreDeAabb(), tokens)).toEqual({ _tag: "Certo" })
  })

  it("o e pousado na fresta errada e recusado", () => {
    let w = arvoreDeAabb()
    const eps = w.garfos.find((g) => g.regra === "r2")!
    w = levar(w, eps.id, { _tag: "Ponta", i: 0 }, c.fresta(0))
    expect(verificar(w, tokens)).toEqual({ _tag: "FrestaErrada", esperada: 2, encontrada: 0 })
  })

  it("todos os niveis tem tokens coerentes com a marca de penduravel", () => {
    for (const n of NIVEIS) {
      const as = n.tokens.filter((t) => t === "a").length
      const bs = n.tokens.filter((t) => t === "b").length
      const formaDeAnBn = n.tokens.join("") === "a".repeat(as) + "b".repeat(bs) && as === bs
      expect(formaDeAnBn).toBe(n.penduravel)
    }
  })
})
