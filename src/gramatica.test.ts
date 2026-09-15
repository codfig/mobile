import { describe, expect, it } from "vitest"
import { definir, lexar } from "./gramatica.js"
import { ALGOL, ANBN, ARITMETICA, LET, LISP, PARENTESES, TRILHAS } from "./niveis.js"
import { anulaveis, derivacoes, reconhece } from "./reconhecer.js"

describe("definir", () => {
  it("toda cabeca e nao-terminal, o resto e terminal, a primeira cabeca e o inicio", () => {
    expect(ARITMETICA.inicio).toBe("E")
    expect(ARITMETICA.naoTerminais).toEqual(["E", "T", "F"])
    expect(ARITMETICA.terminais).toEqual(["+", "*", "(", ")", "num"])
  })

  it("cada producao vira uma regra, e portanto um garfo", () => {
    expect(ARITMETICA.regras.map((r) => r.rotulo)).toEqual([
      "E → E + T",
      "E → T",
      "T → T * F",
      "T → F",
      "F → ( E )",
      "F → num"
    ])
  })

  it("ε vira o simbolo vazio", () => {
    expect(ANBN.regras[1]!.corpo).toEqual([{ tipo: "vazio" }])
  })
})

describe("lexar", () => {
  it("numero vira num, literal da gramatica e sua propria categoria", () => {
    expect(lexar(ARITMETICA, "( 12 + 3 )").map((t) => t.categoria)).toEqual(["(", "num", "+", "num", ")"])
    expect(lexar(ARITMETICA, "( 12 + 3 )").map((t) => t.texto)).toEqual(["(", "12", "+", "3", ")"])
  })

  it("nome so vira id se a gramatica tiver id", () => {
    const comId = definir("x", "x", [["S", "id = num"]])
    expect(lexar(comId, "total = 3").map((t) => t.categoria)).toEqual(["id", "=", "num"])
    expect(lexar(ARITMETICA, "total").map((t) => t.categoria)).toEqual(["total"])
  })

  it("em LET, palavra-chave e literal, nao id; zero? tambem", () => {
    expect(lexar(LET, "let x = 5 in zero? ( x )").map((t) => t.categoria)).toEqual([
      "let", "id", "=", "num", "in", "zero?", "(", "id", ")"
    ])
  })

  it("em Lisp, tudo o que nao e parentese e atomo", () => {
    expect(lexar(LISP, "( + 1 ( car x ) )").map((t) => t.categoria)).toEqual(["(", "atom", "atom", "(", "atom", "atom", ")", ")"])
  })
})

describe("reconhece (Earley)", () => {
  const cabe = (g: typeof ANBN, programa: string) => reconhece(g, lexar(g, programa))

  it("sabe quem e anulavel", () => {
    expect([...anulaveis(ANBN)]).toEqual(["S"])
    expect([...anulaveis(ARITMETICA)]).toEqual([])
  })

  it("aⁿbⁿ, inclusive a cadeia vazia", () => {
    expect(cabe(ANBN, "")).toBe(true)
    expect(cabe(ANBN, "a a a b b b")).toBe(true)
    expect(cabe(ANBN, "a a b")).toBe(false)
    expect(cabe(ANBN, "a b a b")).toBe(false)
  })

  it("parenteses balanceados, com ε no meio e no fim", () => {
    expect(cabe(PARENTESES, "( ( ) ( ) )")).toBe(true)
    expect(cabe(PARENTESES, ") (")).toBe(false)
    expect(cabe(PARENTESES, "( ( )")).toBe(false)
  })

  it("aritmetica com recursao a esquerda", () => {
    expect(cabe(ARITMETICA, "1 + 2 + 3")).toBe(true)
    expect(cabe(ARITMETICA, "( 1 + 2 ) * ( 3 + 4 )")).toBe(true)
    expect(cabe(ARITMETICA, "2 + * 3")).toBe(false)
    expect(cabe(ARITMETICA, "")).toBe(false)
  })

  it("lisp: um atomo ou uma lista, e o programa e uma expressao so", () => {
    expect(cabe(LISP, "( define ( sq x ) ( * x x ) )")).toBe(true)
    expect(cabe(LISP, "( )")).toBe(true)
    expect(cabe(LISP, "a b")).toBe(false)
    expect(cabe(LISP, "( ) )")).toBe(false)
  })

  it("let: ligacao aninhada, e o if exige o else", () => {
    expect(cabe(LET, "let x = 3 in let y = - ( x , 1 ) in - ( x , y )")).toBe(true)
    expect(cabe(LET, "if zero? ( x ) then 0 else - ( x , 1 )")).toBe(true)
    expect(cabe(LET, "if x then 1")).toBe(false)
    expect(cabe(LET, "let x = in x")).toBe(false)
  })

  it("algol: sequencia so dentro de begin, e ; nao fecha bloco", () => {
    expect(cabe(ALGOL, "begin x := 1 ; y := 2 end")).toBe(true)
    expect(cabe(ALGOL, "x := 1 ; y := 2")).toBe(false)
    expect(cabe(ALGOL, "begin x := 1 ; end")).toBe(false)
  })

  it("o gabarito de cada sala confere com a resposta escrita a mao", () => {
    const esperado: Record<string, boolean> = {
      "anbn:a b": true,
      "anbn:a a b b": true,
      "anbn:a a a b b b": true,
      "anbn:a a b": false,
      "anbn:a b a b": false,
      "parenteses:( )": true,
      "parenteses:( ) ( )": true,
      "parenteses:( ( ) )": true,
      "parenteses:) (": false,
      "parenteses:( ( ) ( ) )": true,
      "parenteses:( ( )": false,
      "lisp:x": true,
      "lisp:( )": true,
      "lisp:( car x )": true,
      "lisp:a b": false,
      "lisp:( + 1 2 )": true,
      "lisp:( a ( b ) )": true,
      "lisp:( car x": false,
      "lisp:( ( lambda ( x ) x ) 1 )": true,
      "lisp:( ) )": false,
      "lisp:( define ( sq x ) ( * x x ) )": true,
      "aritmetica:2": true,
      "aritmetica:2 + 3": true,
      "aritmetica:2 * 3": true,
      "aritmetica:2 + 3 * 4": true,
      "aritmetica:2 * 3 + 4": true,
      "aritmetica:1 + 2 + 3": true,
      "aritmetica:( 2 + 3 ) * 4": true,
      "aritmetica:2 + * 3": false,
      "aritmetica:( 1 + 2 ) * ( 3 + 4 )": true,
      "aritmetica:( 2 + 3": false,
      "let:5": true,
      "let:x": true,
      "let:- ( x , 1 )": true,
      "let:zero? ( x )": true,
      "let:let x = 5 in x": true,
      "let:- ( x 1 )": false,
      "let:if zero? ( x ) then 0 else - ( x , 1 )": true,
      "let:let x = in x": false,
      "let:let x = 7 in let y = 2 in - ( x , y )": true,
      "let:if x then 1": false,
      "let:let x = 3 in let y = - ( x , 1 ) in - ( x , y )": true,
      "algol:x := 1": true,
      "algol:begin x := 1 end": true,
      "algol:if a then x := 1": true,
      "algol:x := 1 ; y := 2": false,
      "algol:if a then x := 1 else x := 2": true,
      "algol:begin x := 1 ; y := 2 end": true,
      "algol:if a then else x := 1": false,
      "algol:if a then if b then x := 1 else x := 2": true,
      "algol:begin x := 1 ; end": false,
      "algol:if a then begin if b then x := 1 end else x := 2": true
    }
    const niveis = TRILHAS.flatMap((t) => t.niveis)
    expect(niveis.map((n) => n.id).sort()).toEqual(Object.keys(esperado).sort())
    for (const n of niveis) expect([n.id, n.penduravel]).toEqual([n.id, esperado[n.id]])
  })
})

describe("derivacoes: quantas arvores", () => {
  it("o else pendente pendura de dois jeitos: o else e do if de fora ou do de dentro", () => {
    const arvores = derivacoes(ALGOL, lexar(ALGOL, "if a then if b then x := 1 else x := 2"), 10)
    expect(arvores).toHaveLength(2)
    expect(arvores.map((a) => a.regra.rotulo).sort()).toEqual(["S → if E then S", "S → if E then S else S"])
  })

  it("begin … end escolhe um dos jeitos", () => {
    expect(derivacoes(ALGOL, lexar(ALGOL, "if a then begin if b then x := 1 end else x := 2"), 10)).toHaveLength(1)
  })

  it("fora o else pendente, toda sala de toda trilha tem uma arvore so, ou nenhuma", () => {
    for (const t of TRILHAS) {
      for (const n of t.niveis) {
        const quantas = derivacoes(t.gramatica, n.tokens, 3).length
        const esperado = n.id === "algol:if a then if b then x := 1 else x := 2" ? 2 : n.penduravel ? 1 : 0
        expect([n.id, quantas]).toEqual([n.id, esperado])
      }
    }
  })
})
