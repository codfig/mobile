import { describe, expect, it } from "vitest"
import { escreverBNF, lerGramatica, lerProgramas, montarGramatica, revisar, LIMITE_DE_TOKENS } from "./bnf.js"
import { definir, lexar } from "./gramatica.js"
import { ALGOL, ARITMETICA, LISP, TRILHAS } from "./niveis.js"
import { reconhece } from "./reconhecer.js"

const producoes = (texto: string) => lerGramatica(texto).producoes
const queixas = (texto: string) => lerGramatica(texto).erros.map((e) => `${e.linha}: ${e.texto}`)

describe("lerGramatica", () => {
  it("uma alternativa por producao", () => {
    expect(producoes("E → E + T | T")).toEqual([
      ["E", "E + T"],
      ["E", "T"]
    ])
  })

  it("servem as tres setas", () => {
    expect(producoes("S -> a")).toEqual([["S", "a"]])
    expect(producoes("S ::= a")).toEqual([["S", "a"]])
    expect(producoes("S → a")).toEqual([["S", "a"]])
  })

  it("linha que comeca com | continua a cabeca de cima", () => {
    expect(producoes("E → E + T\n  | T")).toEqual([
      ["E", "E + T"],
      ["E", "T"]
    ])
  })

  it("linha em branco e comentario nao contam", () => {
    expect(producoes("# a gramatica\n\nS → a\n")).toEqual([["S", "a"]])
  })

  it("corpo vazio e ε escrito sao o mesmo ε", () => {
    expect(producoes("L → | S L")).toEqual([
      ["L", "ε"],
      ["L", "S L"]
    ])
    expect(producoes("L → epsilon")).toEqual([["L", "ε"]])
  })

  it("da para escrever a gramatica inteira sem as teclas que ninguem tem", () => {
    const g = montarGramatica("L -> S L\nL ->\nS ::= atom").gramatica!
    expect(escreverBNF(g)).toBe("L → S L | ε\nS → atom")
  })

  it("ε se escreve de varios jeitos, com maiuscula ou sem", () => {
    for (const eps of ["ε", "epsilon", "EPSILON", "eps", "vazio"]) {
      expect(producoes(`S → ${eps}`)).toEqual([["S", "ε"]])
    }
  })

  it("λ nao e cadeia vazia: numa disciplina de linguagens ele e terminal", () => {
    const g = montarGramatica("E → λ id . E | id").gramatica!
    expect(g.terminais).toContain("λ")
    expect(g.regras[0]!.corpo).toHaveLength(4)
  })

  it("simbolos se separam por espaco, como os tokens do chao", () => {
    expect(producoes("F → ( E )")).toEqual([["F", "( E )"]])
    expect(producoes("F → (E)")).toEqual([["F", "(E)"]])
  })

  it("producao repetida vira aviso e conta uma vez so", () => {
    const lida = lerGramatica("S → a\nS → a")
    expect(lida.producoes).toEqual([["S", "a"]])
    expect(lida.erros).toEqual([])
    expect(lida.avisos).toHaveLength(1)
  })
})

describe("lerGramatica: o que o texto pode ter de errado", () => {
  it("linha sem seta", () => {
    expect(queixas("S a S b")[0]).toMatch(/^1: Falta a seta/)
  })

  it("| na primeira linha nao tem o que continuar", () => {
    expect(queixas("| a")[0]).toMatch(/^1: Esta linha continua/)
  })

  it("cabeca ausente, ou com mais de um simbolo", () => {
    expect(queixas("→ a")[0]).toBe("1: Falta o não-terminal antes da seta.")
    expect(queixas("S T → a")[0]).toMatch(/um símbolo só/)
  })

  it("ε nao tem producao propria", () => {
    expect(queixas("ε → a")[0]).toMatch(/ε não tem produção/)
  })

  it("ε no meio de um corpo", () => {
    expect(queixas("S → a ε b")[0]).toMatch(/ε vai sozinho/)
  })

  it("texto sem producao nenhuma", () => {
    expect(lerGramatica("\n# so comentario\n").erros[0]!.linha).toBe(null)
  })

  it("o erro de uma linha nao derruba as outras", () => {
    const lida = lerGramatica("S → a S b\nS b\nS → ε")
    expect(lida.producoes).toEqual([
      ["S", "a S b"],
      ["S", "ε"]
    ])
    expect(lida.erros).toHaveLength(1)
  })
})

describe("montarGramatica", () => {
  it("a aritmetica escrita em BNF e a mesma que esta no codigo", () => {
    const m = montarGramatica("E → E + T | T\nT → T * F | F\nF → ( E ) | num", "aritmetica", "Aritmética")
    expect(m.erros).toEqual([])
    expect(m.gramatica).toEqual(ARITMETICA)
  })

  it("e o programa dela pendura pelo mesmo reconhecedor", () => {
    const g = montarGramatica("E → E + T | T\nT → T * F | F\nF → ( E ) | num").gramatica!
    expect(reconhece(g, lexar(g, "2 + 3 * 4"))).toBe(true)
    expect(reconhece(g, lexar(g, "2 + * 3"))).toBe(false)
  })

  it("recursao a esquerda, ε e ambiguidade passam sem preparo", () => {
    const lisp = montarGramatica("S → atom | ( L )\nL → ε | S L", "lisp", "Lisp").gramatica
    expect(lisp).toEqual(LISP)
    const algol = montarGramatica(
      "S → if E then S\nS → if E then S else S\nS → id := E\nS → begin L end\nL → S\nL → L ; S\nE → id\nE → num",
      "algol",
      "ALGOL"
    ).gramatica
    expect(algol).toEqual(ALGOL)
  })

  it("a primeira cabeca e o inicio, e a ordem dela da as formas", () => {
    const g = montarGramatica("T → F\nF → num\nE → T").gramatica!
    expect(g.inicio).toBe("T")
    expect(g.naoTerminais).toEqual(["T", "F", "E"])
  })

  it("erro no texto nao monta gramatica nenhuma", () => {
    expect(montarGramatica("S a b").gramatica).toBe(null)
  })
})

describe("escreverBNF", () => {
  it("uma linha por nao-terminal, alternativas separadas por |", () => {
    expect(escreverBNF(ARITMETICA)).toBe("E → E + T | T\nT → T * F | F\nF → ( E ) | num")
  })

  it("toda gramatica do jogo volta inteira do proprio texto", () => {
    for (const t of TRILHAS) {
      const g = t.gramatica
      expect(montarGramatica(escreverBNF(g), g.id, g.nome).gramatica).toEqual(g)
    }
  })
})

describe("revisar", () => {
  it("inicio que nao gera palavra e erro: nenhum programa penduraria", () => {
    const m = montarGramatica("S → a S")
    expect(m.gramatica).toBe(null)
    expect(m.erros[0]!.texto).toMatch(/símbolo inicial e não gera/)
  })

  it("nao-terminal que nao gera palavra e aviso", () => {
    const avisos = revisar(definir("x", "x", [["S", "a"], ["X", "X a"]])).avisos
    expect(avisos.some((a) => a.texto.startsWith("X não gera palavra nenhuma"))).toBe(true)
  })

  it("regra que o inicio nao alcanca e aviso", () => {
    const avisos = revisar(definir("x", "x", [["S", "a"], ["X", "b"]])).avisos
    expect(avisos.some((a) => a.texto.includes("nunca alcança X"))).toBe(true)
  })

  it("simbolo de maiuscula que virou token: a producao que faltou escrever", () => {
    const avisos = montarGramatica("S → a T b").avisos
    expect(avisos.some((a) => a.texto.startsWith("T aparece só em corpo"))).toBe(true)
  })

  it("mais nao-terminais que formas: os ganchos comecam a se repetir", () => {
    const sete = "ABCDEFG".split("").map((n, i, todos) => `${n} → ${todos[i + 1] ?? "x"}`)
    expect(montarGramatica(sete.join("\n")).avisos.some((a) => a.texto.includes("7 não-terminais"))).toBe(true)
  })

  it("gramatica limpa nao tem o que reclamar", () => {
    expect(revisar(ARITMETICA)).toEqual({ erros: [], avisos: [] })
    expect(revisar(ALGOL)).toEqual({ erros: [], avisos: [] })
  })
})

describe("lerProgramas", () => {
  it("um por linha, espaco sobrando nao conta", () => {
    expect(lerProgramas("2 + 3\n\n  ( 2 + 3 )  * 4 \n# nota").programas).toEqual(["2 + 3", "( 2 + 3 ) * 4"])
  })

  it("programa largo demais nao vira sala, e os outros viram", () => {
    const lida = lerProgramas(`a\n${Array.from({ length: LIMITE_DE_TOKENS + 1 }, () => "a").join(" ")}`)
    expect(lida.programas).toEqual(["a"])
    expect(lida.erros[0]!.linha).toBe(2)
  })

  it("sem programa nenhum, nao ha sala", () => {
    expect(lerProgramas("").erros).toHaveLength(1)
  })
})
