/**
 * O editor de gramática: um texto quase BNF de um lado, os programas do outro,
 * e as salas saem dali — uma gramática nova deixa de precisar de código novo.
 *
 * As queixas aparecem enquanto se escreve, porque é enquanto se escreve que
 * elas servem. Erro trava o botão; aviso não trava nada, só conta o que a
 * gramática vai fazer e que talvez não fosse a intenção.
 *
 * `→` e `ε` são as duas teclas que ninguém tem — num celular elas nem existem —,
 * então há um jeito de escrever cada uma sem elas (`->`, `epsilon`, ou nada
 * depois da seta) e um botão que as insere no cursor, para quem quer o texto
 * com a cara que ele tem no quadro.
 */

import { useRef } from "react"
import type { Montagem, Queixa } from "./bnf.js"
import type { Gramatica } from "./gramatica.js"

const Queixas = ({ lista, tom }: { lista: ReadonlyArray<Queixa>; tom: "ruim" | "neutro" }) =>
  lista.length === 0 ? null : (
    <ul className={`queixas ${tom}`}>
      {lista.map((q, i) => (
        <li key={i}>
          {q.linha !== null && <b>linha {q.linha}: </b>}
          {q.texto}
        </li>
      ))}
    </ul>
  )

/** As categorias de token que a gramática ganhou. É onde um símbolo mal escrito aparece por inteiro. */
const Categorias = ({ gramatica }: { gramatica: Gramatica }) => (
  <p className="categorias-token">
    <span>Categorias de token:</span>{" "}
    {gramatica.terminais.length === 0 ? (
      <em>nenhuma</em>
    ) : (
      gramatica.terminais.map((t) => (
        <code key={t} className="categoria">
          {t}
        </code>
      ))
    )}
  </p>
)

export type Exemplo = { readonly nome: string; readonly bnf: string; readonly programas: string }

export const Editor = ({
  bnf,
  programas,
  montagem,
  errosDosProgramas,
  exemplos,
  aoMudarBnf,
  aoMudarProgramas,
  aoUsarExemplo,
  aoMontar
}: {
  bnf: string
  programas: string
  montagem: Montagem
  errosDosProgramas: ReadonlyArray<Queixa>
  exemplos: ReadonlyArray<Exemplo>
  aoMudarBnf: (t: string) => void
  aoMudarProgramas: (t: string) => void
  aoUsarExemplo: (e: Exemplo) => void
  aoMontar: () => void
}) => {
  const pronta = montagem.gramatica !== null && errosDosProgramas.length === 0

  // Insere no cursor e devolve o cursor para depois do que entrou, senão quem
  // está no meio de uma linha perde o lugar a cada tecla dessas.
  const area = useRef<HTMLTextAreaElement>(null)
  const inserir = (texto: string) => {
    const el = area.current
    if (el === null) {
      aoMudarBnf(bnf + texto)
      return
    }
    const i = el.selectionStart
    const j = el.selectionEnd
    aoMudarBnf(bnf.slice(0, i) + texto + bnf.slice(j))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(i + texto.length, i + texto.length)
    })
  }

  return (
    <div className="editor">
      <label htmlFor="bnf">
        Gramática
        <small>
          uma produção por linha, símbolos separados por espaço, `|` separando alternativas. A seta também se escreve `-&gt;` ou
          `::=`; o corpo vazio, `epsilon` — ou nada depois da seta.
        </small>
      </label>
      <textarea
        id="bnf"
        ref={area}
        className="bnf"
        rows={8}
        spellCheck={false}
        value={bnf}
        onChange={(e) => aoMudarBnf(e.target.value)}
      />
      <div className="teclas">
        <span>Sem essas teclas:</span>
        <button type="button" onClick={() => inserir("→ ")} title="a seta: também vale escrever -> ou ::=">
          →
        </button>
        <button type="button" onClick={() => inserir("ε")} title="o corpo vazio: também vale escrever epsilon, ou nada depois da seta">
          ε
        </button>
      </div>

      <label htmlFor="programas">
        Programas
        <small>um por linha, com espaço entre os tokens; os que estiverem fora da gramática viram as salas que não penduram</small>
      </label>
      <textarea
        id="programas"
        className="bnf"
        rows={5}
        spellCheck={false}
        value={programas}
        onChange={(e) => aoMudarProgramas(e.target.value)}
      />

      <Queixas lista={[...montagem.erros, ...errosDosProgramas]} tom="ruim" />
      <Queixas lista={montagem.avisos} tom="neutro" />
      {montagem.gramatica !== null && <Categorias gramatica={montagem.gramatica} />}

      <div className="acoes-editor">
        <button type="button" className="principal" disabled={!pronta} onClick={aoMontar}>
          Montar as salas
        </button>
        {exemplos.map((e) => (
          <button key={e.nome} type="button" className="chip" onClick={() => aoUsarExemplo(e)}>
            {e.nome}
          </button>
        ))}
      </div>
    </div>
  )
}
