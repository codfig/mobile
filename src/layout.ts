export type Ponto = { readonly x: number; readonly y: number }

export type Medidas = {
  readonly largura: number
  readonly altura: number
  readonly tetoY: number
  readonly chaoY: number
  readonly passo: number
}

export const medidas = (nTokens: number): Medidas => {
  const passo = 72
  return {
    largura: Math.max(340, 110 + Math.max(nTokens - 1, 0) * passo),
    altura: 430,
    tetoY: 44,
    chaoY: 372,
    passo
  }
}

/** Os dois pontos fixos da sala: o gancho do teto e cada token do chão. */
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
