export type Ponto = { readonly x: number; readonly y: number }

export type Medidas = {
  readonly largura: number
  readonly altura: number
  readonly tetoY: number
  readonly chaoY: number
  readonly passo: number
}

/** O tamanho da sala cresce com o programa: mais tokens, mais largura e mais fundo. */
export const medidas = (nTokens: number): Medidas => {
  const passo = 72
  const altura = Math.min(1100, Math.max(430, 190 + 58 * nTokens))
  return {
    largura: Math.max(340, 110 + Math.max(nTokens - 1, 0) * passo),
    altura,
    tetoY: 44,
    chaoY: altura - 58,
    passo
  }
}

/** Os pontos fixos da sala: o gancho do teto e cada token do chão. */
export type Cena = {
  readonly teto: Ponto
  readonly nTokens: number
  readonly token: (i: number) => Ponto
  /** A fresta antes do token `i` — onde o ε pousa. Vai de 0 até nTokens. */
  readonly fresta: (i: number) => Ponto
}

export const cenaDe = (m: Medidas, nTokens: number): Cena => {
  const token = (i: number): Ponto => ({
    x: m.largura / 2 + (i - (nTokens - 1) / 2) * m.passo,
    y: m.chaoY
  })
  return {
    teto: { x: m.largura / 2, y: m.tetoY },
    nTokens,
    token,
    fresta: (i) => ({
      x:
        nTokens === 0
          ? m.largura / 2
          : i <= 0
            ? token(0).x - m.passo / 2
            : i >= nTokens
              ? token(nTokens - 1).x + m.passo / 2
              : (token(i - 1).x + token(i).x) / 2,
      y: m.chaoY
    })
  }
}

export const dist = (a: Ponto, b: Ponto): number => Math.hypot(a.x - b.x, a.y - b.y)

// ---- câmera ----

/**
 * O pedaço da sala que aparece na tela. `x`/`y` é o canto superior esquerdo
 * em coordenadas da sala, `escala` é quantos pixels vale uma unidade da sala,
 * e `w`/`h` é o tamanho da área de desenho em pixels.
 *
 * O viewBox sai daqui com a mesma proporção da área de desenho, então um
 * pixel de toque converte para a sala com uma conta só, sem tarja nas bordas.
 */
export type Camera = {
  readonly x: number
  readonly y: number
  readonly escala: number
  readonly w: number
  readonly h: number
}

const ESCALA_MIN = 0.2
const ESCALA_MAX = 3

export const limitarEscala = (k: number): number => Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, k))

/** Não deixa a sala sair inteira da tela: no mínimo metade da vista a mostra. */
export const limitar = (m: Medidas, cam: Camera): Camera => {
  const vw = cam.w / cam.escala
  const vh = cam.h / cam.escala
  return {
    ...cam,
    x: Math.min(m.largura - vw / 2, Math.max(-vw / 2, cam.x)),
    y: Math.min(m.altura - vh / 2, Math.max(-vh / 2, cam.y))
  }
}

/** A sala inteira na tela, centralizada. */
export const ajustar = (m: Medidas, w: number, h: number): Camera => {
  const escala = limitarEscala(Math.min(w / m.largura, h / m.altura) * 0.96)
  return { x: (m.largura - w / escala) / 2, y: (m.altura - h / escala) / 2, escala, w, h }
}

/** Aproxima ou afasta mantendo parado o ponto da sala sob (px, py). */
export const zoomEm = (m: Medidas, cam: Camera, fator: number, px: number, py: number): Camera => {
  const escala = limitarEscala(cam.escala * fator)
  const sx = cam.x + px / cam.escala
  const sy = cam.y + py / cam.escala
  return limitar(m, { ...cam, escala, x: sx - px / escala, y: sy - py / escala })
}

export const paraSala = (cam: Camera, px: number, py: number): Ponto => ({
  x: cam.x + px / cam.escala,
  y: cam.y + py / cam.escala
})
