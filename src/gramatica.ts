/**
 * Uma gramática é só dado: uma lista de produções escritas quase como BNF.
 *
 * `definir` recebe pares [cabeça, corpo] e deduz o resto — quem é
 * não-terminal (toda cabeça), quem é terminal (o que sobra), qual é o
 * símbolo inicial (a primeira cabeça). Cada produção vira um garfo.
 *
 * É isso que deixa o próximo passo pequeno: uma gramática escrita em BNF
 * pelo usuário só precisa virar esses pares para ganhar seus garfos.
 */

export type Simbolo =
  | { readonly tipo: "naoTerminal"; readonly nome: string }
  | { readonly tipo: "terminal"; readonly categoria: string }
  | { readonly tipo: "vazio" }

export type Regra = {
  readonly id: string
  readonly cabeca: string
  readonly corpo: ReadonlyArray<Simbolo>
  readonly rotulo: string
}

export type Gramatica = {
  readonly id: string
  readonly nome: string
  readonly inicio: string
  readonly naoTerminais: ReadonlyArray<string>
  readonly terminais: ReadonlyArray<string>
  readonly regras: ReadonlyArray<Regra>
}

/** Um token do chão: a categoria decide onde ele encaixa; o texto é o que se lê. */
export type Token = { readonly categoria: string; readonly texto: string }

export const VAZIO = "ε"

export const definir = (id: string, nome: string, producoes: ReadonlyArray<readonly [string, string]>): Gramatica => {
  const cabecas = [...new Set(producoes.map(([c]) => c))]
  const regras = producoes.map(([cabeca, texto]): Regra => {
    const partes = texto.trim().split(/\s+/)
    const corpo = partes.map(
      (p): Simbolo =>
        p === VAZIO
          ? { tipo: "vazio" }
          : cabecas.includes(p)
            ? { tipo: "naoTerminal", nome: p }
            : { tipo: "terminal", categoria: p }
    )
    const rotulo = `${cabeca} → ${partes.join(" ")}`
    return { id: rotulo, cabeca, corpo, rotulo }
  })
  const terminais = [
    ...new Set(regras.flatMap((r) => r.corpo.flatMap((s) => (s.tipo === "terminal" ? [s.categoria] : []))))
  ]
  return { id, nome, inicio: cabecas[0] ?? "", naoTerminais: cabecas, terminais, regras }
}

export const regraDe = (g: Gramatica, id: string): Regra | undefined => g.regras.find((r) => r.id === id)

export const textoDoSimbolo = (s: Simbolo): string =>
  s.tipo === "naoTerminal" ? s.nome : s.tipo === "terminal" ? s.categoria : VAZIO

/**
 * Quebra um programa em tokens. Os programas dos níveis vêm com espaço entre
 * os tokens, então basta separar por espaço e classificar: um terminal literal
 * da gramática é sua própria categoria; um número vira `num` e um nome vira
 * `id`, se a gramática tiver essas categorias. Numa gramática com `atom`, como
 * a de Lisp, todo o resto é átomo: `car`, `x`, `+`, `1`. Sem nada disso, a
 * palavra fica com uma categoria que nenhum garfo aceita — e o programa,
 * impendurável.
 */
export const lexar = (g: Gramatica, programa: string): ReadonlyArray<Token> =>
  programa
    .trim()
    .split(/\s+/)
    .filter((t) => t !== "")
    .map((texto) => ({
      texto,
      categoria: g.terminais.includes(texto)
        ? texto
        : /^\d+$/.test(texto) && g.terminais.includes("num")
          ? "num"
          : /^[A-Za-z_]\w*$/.test(texto) && g.terminais.includes("id")
            ? "id"
            : g.terminais.includes("atom")
              ? "atom"
              : texto
    }))
