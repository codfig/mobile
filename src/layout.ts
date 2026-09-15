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
  readonly largura: number
  readonly altura: number
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
    largura: m.largura,
    altura: m.altura,
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

const ESCALA_MAX = 3
/** Quanto de vazio, em pixels de tela, pode aparecer entre a borda da sala e a da vista. */
const FOLGA = 12

/** Afastar para quando a sala inteira cabe: longe disso só se veria vazio. */
const escalaMinima = (m: Medidas, w: number, h: number): number =>
  Math.min(ESCALA_MAX, Math.min(w / m.largura, h / m.altura) * 0.96)

export const limitarEscala = (m: Medidas, w: number, h: number, k: number): number =>
  Math.min(ESCALA_MAX, Math.max(escalaMinima(m, w, h), k))

/** Num eixo: a sala menor que a vista fica no meio; maior, a vista não passa da borda dela. */
const limitarEixo = (inicio: number, vista: number, sala: number, folga: number): number =>
  sala + 2 * folga <= vista ? (sala - vista) / 2 : Math.min(sala + folga - vista, Math.max(-folga, inicio))

/**
 * A sala fica presa à janela: não se afasta além de caber inteira, e as bordas
 * dela não entram na vista mais que a folga. Assim a sala nunca foge da tela.
 */
export const limitar = (m: Medidas, cam: Camera): Camera => {
  const escala = limitarEscala(m, cam.w, cam.h, cam.escala)
  const folga = FOLGA / escala
  return {
    ...cam,
    escala,
    x: limitarEixo(cam.x, cam.w / escala, m.largura, folga),
    y: limitarEixo(cam.y, cam.h / escala, m.altura, folga)
  }
}

/** A sala inteira na tela, centralizada. */
export const ajustar = (m: Medidas, w: number, h: number): Camera => {
  const escala = escalaMinima(m, w, h)
  return { x: (m.largura - w / escala) / 2, y: (m.altura - h / escala) / 2, escala, w, h }
}

/** Aproxima ou afasta mantendo parado o ponto da sala sob (px, py). */
export const zoomEm = (m: Medidas, cam: Camera, fator: number, px: number, py: number): Camera => {
  const escala = limitarEscala(m, cam.w, cam.h, cam.escala * fator)
  const sx = cam.x + px / cam.escala
  const sy = cam.y + py / cam.escala
  return limitar(m, { ...cam, escala, x: sx - px / escala, y: sy - py / escala })
}

export const paraSala = (cam: Camera, px: number, py: number): Ponto => ({
  x: cam.x + px / cam.escala,
  y: cam.y + py / cam.escala
})
