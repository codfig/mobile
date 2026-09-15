import { describe, expect, it } from "vitest"
import { ajustar, limitar, medidas, zoomEm, type Camera } from "./layout.js"

// um programa longo numa tela de celular: a sala é mais larga que a vista
const m = medidas(11)
const W = 360
const H = 480

/** Onde as bordas da sala caem na tela, em pixels. */
const bordas = (cam: Camera) => ({
  esquerda: -cam.x * cam.escala,
  direita: (m.largura - cam.x) * cam.escala,
  topo: -cam.y * cam.escala,
  base: (m.altura - cam.y) * cam.escala
})

describe("a sala presa à janela", () => {
  it("afastar não passa de caber a sala inteira", () => {
    const tudo = ajustar(m, W, H)
    const longe = zoomEm(m, tudo, 0.1, W / 2, H / 2)
    expect(longe.escala).toBeCloseTo(tudo.escala)
    expect(longe.x).toBeCloseTo(tudo.x)
    expect(longe.y).toBeCloseTo(tudo.y)
  })

  it("com a sala inteira na tela, passear não a tira do meio", () => {
    const tudo = ajustar(m, W, H)
    const passeio = limitar(m, { ...tudo, x: tudo.x + 5000, y: tudo.y - 5000 })
    const b = bordas(passeio)
    expect(b.esquerda).toBeGreaterThanOrEqual(-13)
    expect(b.direita).toBeLessThanOrEqual(W + 13)
    // no eixo em que sobra tela, a sala volta ao meio
    expect(b.topo).toBeCloseTo(H - b.base)
  })

  it("de perto, a borda da sala não entra na vista além da folga", () => {
    const perto = zoomEm(m, ajustar(m, W, H), 4, W / 2, H / 2)
    for (const puxao of [-9000, 9000]) {
      const b = bordas(limitar(m, { ...perto, x: perto.x + puxao, y: perto.y + puxao }))
      expect(b.esquerda).toBeLessThanOrEqual(12.001)
      expect(b.direita).toBeGreaterThanOrEqual(W - 12.001)
      expect(b.topo).toBeLessThanOrEqual(12.001)
      expect(b.base).toBeGreaterThanOrEqual(H - 12.001)
    }
  })
})
