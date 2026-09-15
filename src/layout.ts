import type { No } from "./arvore.js"

export type Posicionado = {
  readonly no: No
  readonly x: number
  readonly y: number
  /** Só para ganchos livres: o trecho do chão que este gancho ainda tem de cobrir. */
  readonly vao: readonly [number, number] | null
  readonly filhos: ReadonlyArray<Posicionado>
}

export type Medidas = {
  readonly largura: number
  readonly altura: number
  readonly tetoY: number
  readonly chaoY: number
  readonly passo: number
  readonly xToken: (i: number) => number
}

export const medidas = (nTokens: number): Medidas => {
  const passo = 74
  const largura = Math.max(340, 96 + Math.max(nTokens - 1, 0) * passo)
  return {
    largura,
    altura: 520,
    tetoY: 48,
    chaoY: 432,
    passo,
    xToken: (i) => largura / 2 + (i - (nTokens - 1) / 2) * passo
  }
}

const contarFolhas = (no: No): number =>
  no._tag === "Folha" ? 1 : no._tag === "Garfo" ? no.filhos.reduce((s, f) => s + contarFolhas(f), 0) : 0

const profundidade = (no: No): number =>
  no._tag === "Garfo" ? 1 + Math.max(0, ...no.filhos.map(profundidade)) : 0

/**
 * Posiciona a árvore na sala.
 *
 * A regra que faz tudo funcionar: cada folha terminal fica exatamente em cima
 * do token que vai consumir. Como os terminais saem na ordem da colheita e o
 * chão não se move, os ramos nunca se cruzam — a proibição de cruzamento não
 * precisa ser imposta, ela cai de graça do jeito de desenhar.
 */
export const posicionar = (raiz: No, nTokens: number, m: Medidas): Posicionado => {
  const alturaNivel = (m.chaoY - m.tetoY) / (profundidade(raiz) + 1)
  const totalFolhas = contarFolhas(raiz)
  let consumidos = 0

  /** O ponto entre dois tokens, onde pousam o ε e os ganchos de vão vazio. */
  const naFresta = (k: number): number => {
    if (nTokens === 0) return m.largura / 2
    if (k <= 0) return m.xToken(0) - m.passo / 2
    if (k >= nTokens) return m.xToken(nTokens - 1) + m.passo / 2
    return (m.xToken(k - 1) + m.xToken(k)) / 2
  }

  const ir = (no: No, d: number): Posicionado => {
    const y = m.tetoY + d * alturaNivel
    switch (no._tag) {
      case "Folha": {
        const x = m.xToken(Math.min(consumidos, Math.max(nTokens - 1, 0)))
        consumidos += 1
        return { no, x, y, vao: null, filhos: [] }
      }
      case "Vazio":
        return { no, x: naFresta(consumidos), y, vao: null, filhos: [] }
      case "Gancho": {
        // Os terminais já colhidos ficam à esquerda deste gancho; os que
        // faltam, à direita. O que sobra no meio é o vão que ele tem de cobrir.
        const inicio = consumidos
        const fim = nTokens - (totalFolhas - consumidos) - 1
        const vazio = inicio > fim
        return {
          no,
          x: vazio ? naFresta(consumidos) : (m.xToken(inicio) + m.xToken(fim)) / 2,
          y,
          vao: vazio ? null : [inicio, fim],
          filhos: []
        }
      }
      case "Garfo": {
        const filhos = no.filhos.map((f) => ir(f, d + 1))
        const xs = filhos.map((f) => f.x)
        return {
          no,
          x: xs.length === 0 ? m.largura / 2 : (Math.min(...xs) + Math.max(...xs)) / 2,
          y,
          vao: null,
          filhos
        }
      }
    }
  }

  return ir(raiz, 0)
}

export const achatar = (p: Posicionado): ReadonlyArray<Posicionado> => [p, ...p.filhos.flatMap(achatar)]
