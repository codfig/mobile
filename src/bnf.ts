/**
 * Ler uma gramática escrita em BNF.
 *
 * `gramatica.ts` já monta uma gramática a partir de pares [cabeça, corpo]; o
 * que falta, para uma gramática vir de quem joga em vez de vir do código, é
 * tirar esses pares de um texto — e reclamar com clareza quando ele não fecha.
 *
 * As queixas são metade do trabalho. Uma gramática recém-escrita costuma estar
 * errada de um punhado de jeitos previsíveis: a seta que faltou, o ε no meio de
 * um corpo, o não-terminal que ninguém definiu e virou token calado. Dizer qual
 * deles foi é o que separa um editor de uma caixa de texto.
 *
 * Erro impede de montar; aviso não — a gramática vale, mas quem escreveu talvez
 * não quisesse aquilo.
 */

import { definir, textoDoSimbolo, VAZIO, type Gramatica } from "./gramatica.js"

/** Uma reclamação sobre o texto. `linha` é null quando é sobre a gramática inteira. */
export type Queixa = { readonly linha: number | null; readonly texto: string }

export type Leitura = {
  readonly producoes: ReadonlyArray<readonly [string, string]>
  readonly erros: ReadonlyArray<Queixa>
  readonly avisos: ReadonlyArray<Queixa>
}

export type Montagem = {
  /** null quando algum erro impediu de montar. */
  readonly gramatica: Gramatica | null
  readonly erros: ReadonlyArray<Queixa>
  readonly avisos: ReadonlyArray<Queixa>
}

/** Quantas formas `Formas.tsx` tem antes de começar a repetir. */
export const FORMAS = 6

/** Uma sala mais larga que isto não cabe na tela, e o reconhecedor cresce com o cubo do chão. */
export const LIMITE_DE_TOKENS = 40

const SETAS = ["→", "::=", "->"] as const

/**
 * Como se pode escrever o ε sem ter a tecla dele — que ninguém tem, e num
 * celular menos ainda. Um corpo vazio também é ε: `L → | S L`, ou nada depois
 * da seta. O λ ficou de fora de propósito: numa disciplina de linguagens ele é
 * terminal antes de ser cadeia vazia, e `E → λ id . E` tem que continuar
 * valendo.
 */
const VAZIOS = ["ε", "epsilon", "eps", "vazio"]

const eVazio = (p: string): boolean => VAZIOS.includes(p.toLowerCase())

const palavras = (s: string): ReadonlyArray<string> => (s.trim() === "" ? [] : s.trim().split(/\s+/))

/** A seta que aparecer primeiro na linha é a que manda. */
const acharSeta = (linha: string): readonly [string, string] | null => {
  let achado: readonly [number, number] | null = null
  for (const seta of SETAS) {
    const i = linha.indexOf(seta)
    if (i >= 0 && (achado === null || i < achado[0])) achado = [i, seta.length]
  }
  return achado === null ? null : [linha.slice(0, achado[0]), linha.slice(achado[0] + achado[1])]
}

/**
 * Uma produção por alternativa: `E → E + T | T` vira duas. Uma linha que começa
 * com `|` continua a cabeça da linha anterior, que é como a gramática costuma
 * aparecer escrita no quadro.
 */
export const lerGramatica = (texto: string): Leitura => {
  const producoes: Array<readonly [string, string]> = []
  const erros: Queixa[] = []
  const avisos: Queixa[] = []
  let cabecaAnterior: string | null = null

  texto.split("\n").forEach((bruta, i) => {
    const linha = i + 1
    const t = bruta.trim()
    if (t === "" || t.startsWith("#")) return

    const seta = acharSeta(t)
    let cabeca: string
    let direita: string

    if (seta === null) {
      if (!t.startsWith("|")) {
        erros.push({ linha, texto: `Falta a seta. Uma produção é "S → a S b", e a seta também se escreve -> ou ::=.` })
        return
      }
      if (cabecaAnterior === null) {
        erros.push({ linha, texto: `Esta linha continua a de cima com "|", mas não há produção antes dela.` })
        return
      }
      cabeca = cabecaAnterior
      direita = t.slice(1)
    } else {
      const antes = palavras(seta[0])
      if (antes.length === 0) {
        erros.push({ linha, texto: `Falta o não-terminal antes da seta.` })
        return
      }
      if (antes.length > 1) {
        erros.push({ linha, texto: `À esquerda da seta vai um símbolo só, e vieram ${antes.length}: ${antes.join(" ")}.` })
        return
      }
      cabeca = antes[0]!
      direita = seta[1]
    }

    if (eVazio(cabeca)) {
      erros.push({ linha, texto: `"${cabeca}" é o corpo vazio, não um não-terminal: ε não tem produção própria.` })
      return
    }
    cabecaAnterior = cabeca

    for (const alternativa of direita.split("|")) {
      const partes = palavras(alternativa).map((p) => (eVazio(p) ? VAZIO : p))
      if (partes.length > 1 && partes.includes(VAZIO)) {
        erros.push({ linha, texto: `ε vai sozinho no corpo: "${cabeca} → ε". Em "${partes.join(" ")}" ele está sobrando.` })
        continue
      }
      const corpo = partes.length === 0 ? VAZIO : partes.join(" ")
      if (producoes.some(([c, b]) => c === cabeca && b === corpo)) {
        avisos.push({ linha, texto: `"${cabeca} → ${corpo}" está repetida; contei uma vez só.` })
        continue
      }
      producoes.push([cabeca, corpo])
    }
  })

  if (producoes.length === 0 && erros.length === 0) {
    erros.push({ linha: null, texto: `Escreva ao menos uma produção, como "S → a S b".` })
  }
  return { producoes, erros, avisos }
}

/** Não-terminais que geram alguma palavra, nem que seja a vazia. */
const produtivos = (g: Gramatica): ReadonlySet<string> => {
  const bons = new Set<string>()
  for (let mudou = true; mudou; ) {
    mudou = false
    for (const r of g.regras) {
      if (bons.has(r.cabeca)) continue
      if (r.corpo.every((s) => s.tipo !== "naoTerminal" || bons.has(s.nome))) {
        bons.add(r.cabeca)
        mudou = true
      }
    }
  }
  return bons
}

/** Não-terminais que o símbolo inicial alcança. */
const alcancaveis = (g: Gramatica): ReadonlySet<string> => {
  const vistos = new Set([g.inicio])
  for (let mudou = true; mudou; ) {
    mudou = false
    for (const r of g.regras) {
      if (!vistos.has(r.cabeca)) continue
      for (const s of r.corpo) {
        if (s.tipo === "naoTerminal" && !vistos.has(s.nome)) {
          vistos.add(s.nome)
          mudou = true
        }
      }
    }
  }
  return vistos
}

/**
 * O que só dá para ver depois de montada: não-terminal que não gera palavra
 * nenhuma, regra que o início nunca alcança, forma repetida, e o engano mais
 * calado de todos — um símbolo que só aparece em corpo vira categoria de token
 * sem avisar, que é exatamente o que acontece quando a produção dele ficou por
 * escrever.
 */
export const revisar = (g: Gramatica): { readonly erros: ReadonlyArray<Queixa>; readonly avisos: ReadonlyArray<Queixa> } => {
  const erros: Queixa[] = []
  const avisos: Queixa[] = []

  const geram = produtivos(g)
  const vistos = alcancaveis(g)

  if (!geram.has(g.inicio)) {
    erros.push({
      linha: null,
      texto: `${g.inicio} é o símbolo inicial e não gera palavra nenhuma: toda produção dele volta a um não-terminal que também não gera. Nenhum programa penduraria.`
    })
  }
  for (const nt of g.naoTerminais) {
    if (nt !== g.inicio && !geram.has(nt)) {
      avisos.push({ linha: null, texto: `${nt} não gera palavra nenhuma: quem pendurar um garfo dele nunca chega ao chão.` })
    }
  }
  for (const nt of g.naoTerminais) {
    if (!vistos.has(nt)) {
      avisos.push({ linha: null, texto: `${g.inicio} nunca alcança ${nt}: os garfos dele ficam na bandeja sem servir a nada.` })
    }
  }

  // Maiúscula inicial é como se escreve não-terminal; num corpo, sem produção
  // própria, quase sempre é a produção que faltou escrever.
  for (const categoria of g.terminais) {
    if (/^[A-Z][A-Za-z0-9_']*$/.test(categoria)) {
      avisos.push({
        linha: null,
        texto: `${categoria} aparece só em corpo, então virou categoria de token. Se era um não-terminal, falta escrever "${categoria} → …".`
      })
    }
  }

  if (g.naoTerminais.length > FORMAS) {
    avisos.push({
      linha: null,
      texto: `São ${g.naoTerminais.length} não-terminais para ${FORMAS} formas: do ${FORMAS + 1}º em diante elas se repetem, e dois ganchos diferentes ficam iguais.`
    })
  }
  return { erros, avisos }
}

export const montarGramatica = (texto: string, id = "minha", nome = "Sua gramática"): Montagem => {
  const lida = lerGramatica(texto)
  if (lida.erros.length > 0) return { gramatica: null, erros: lida.erros, avisos: lida.avisos }
  const g = definir(id, nome, lida.producoes)
  const revisao = revisar(g)
  return {
    gramatica: revisao.erros.length > 0 ? null : g,
    erros: revisao.erros,
    avisos: [...lida.avisos, ...revisao.avisos]
  }
}

/** Um programa por linha. Se ele pendura ou não, quem diz é o reconhecedor; aqui só cabe o tamanho. */
export const lerProgramas = (texto: string): { readonly programas: ReadonlyArray<string>; readonly erros: ReadonlyArray<Queixa> } => {
  const programas: string[] = []
  const erros: Queixa[] = []
  texto.split("\n").forEach((bruta, i) => {
    const t = bruta.trim()
    if (t === "" || t.startsWith("#")) return
    const quantos = palavras(t).length
    if (quantos > LIMITE_DE_TOKENS) {
      erros.push({ linha: i + 1, texto: `${quantos} tokens: a sala vai até ${LIMITE_DE_TOKENS}.` })
      return
    }
    programas.push(palavras(t).join(" "))
  })
  if (programas.length === 0 && erros.length === 0) {
    erros.push({ linha: null, texto: `Escreva ao menos um programa, com espaço entre os tokens.` })
  }
  return { programas, erros }
}

/**
 * O caminho de volta: a gramática escrita como se escreve no quadro, uma linha
 * por não-terminal. É o texto que o editor abre quando se parte de uma
 * gramática pronta, e é também como ela aparece acima da sala — a mesma função,
 * para que o que se lê seja exatamente o que se pode reescrever.
 */
export const escreverBNF = (g: Gramatica): string =>
  g.naoTerminais
    .map(
      (nt) =>
        `${nt} → ${g.regras
          .filter((r) => r.cabeca === nt)
          .map((r) => r.corpo.map(textoDoSimbolo).join(" "))
          .join(" | ")}`
    )
    .join("\n")
