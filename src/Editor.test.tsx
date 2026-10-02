import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { App } from "./App.jsx"
import { lerProgramas, montarGramatica } from "./bnf.js"
import { Editor } from "./Editor.jsx"

const desenhar = (bnf: string, programas: string) =>
  renderToStaticMarkup(
    <Editor
      bnf={bnf}
      programas={programas}
      montagem={montarGramatica(bnf)}
      errosDosProgramas={lerProgramas(programas).erros}
      exemplos={[]}
      aoMudarBnf={() => {}}
      aoMudarProgramas={() => {}}
      aoUsarExemplo={() => {}}
      aoMontar={() => {}}
    />
  )

/** O botão de montar só existe habilitado quando a gramática e os programas fecham. */
const podeMontar = (html: string) => html.includes('class="principal"') && !html.includes('class="principal" disabled')

describe("Editor", () => {
  it("gramatica boa: monta, e mostra as categorias de token que ela criou", () => {
    const html = desenhar("E → E + T | T\nT → num", "1 + 2")
    expect(podeMontar(html)).toBe(true)
    expect(html).toContain("+")
    expect(html).toContain("num")
  })

  it("erro no texto trava o botao e aparece com o numero da linha", () => {
    const html = desenhar("S → a\nS b", "a")
    expect(podeMontar(html)).toBe(false)
    expect(html).toContain("linha 2")
    expect(html).toContain("Falta a seta")
  })

  it("programa sem sala tambem trava o botao", () => {
    expect(podeMontar(desenhar("S → a", ""))).toBe(false)
  })

  it("aviso nao trava nada: a gramatica vale, so nao era bem isso", () => {
    const html = desenhar("S → a T b", "a b")
    expect(podeMontar(html)).toBe(true)
    expect(html).toContain("aparece só em corpo")
  })
})

describe("App", () => {
  it("abre na aritmetica, com a gramatica no quadro e a aba do editor a mais", () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain("Pendura a árvore")
    expect(html).toContain("E → E + T | T")
    expect(html).toContain("Sua gramática")
  })
})
