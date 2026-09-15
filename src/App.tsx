import { useMemo, useState } from "react"
import { NIVEIS, REGRAS, regraPorId } from "./gramatica.js"
import { ganchosLivres, pendurar, raizInicial, soltar, verificar, type No, type Veredito } from "./arvore.js"
import { medidas, posicionar } from "./layout.js"
import { Forma, Sala } from "./Sala.jsx"

type Recado = { readonly tom: "bom" | "ruim" | "neutro"; readonly texto: string }

const recadoDoVeredito = (v: Veredito): Recado => {
  switch (v._tag) {
    case "Incompleto":
      return { tom: "neutro", texto: `Ainda há ${v.ganchos} gancho${v.ganchos > 1 ? "s" : ""} livre${v.ganchos > 1 ? "s" : ""}.` }
    case "Comprimento":
      return { tom: "ruim", texto: `A árvore colhe ${v.colhido} token${v.colhido === 1 ? "" : "s"}, mas o chão tem ${v.esperado}.` }
    case "Desencontro":
      return { tom: "ruim", texto: `No token ${v.indice + 1} o chão pede "${v.esperado}" e a árvore entrega "${v.encontrado}".` }
    case "Certo":
      return { tom: "bom", texto: "Pendurada. A colheita bate com o chão, token a token." }
  }
}

export const App = () => {
  const [iNivel, setINivel] = useState(0)
  const [raiz, setRaiz] = useState<No>(raizInicial)
  const [regraNaMao, setRegraNaMao] = useState<string | null>(null)
  const [recado, setRecado] = useState<Recado | null>(null)

  const nivel = NIVEIS[iNivel] ?? NIVEIS[0]!
  const m = useMemo(() => medidas(nivel.tokens.length), [nivel])
  const arranjo = useMemo(() => posicionar(raiz, nivel.tokens.length, m), [raiz, nivel, m])
  const livres = ganchosLivres(raiz).length

  const recomecar = (i = iNivel) => {
    setINivel(i)
    setRaiz(raizInicial())
    setRegraNaMao(null)
    setRecado(null)
  }

  const aoTocarGancho = (id: string) => {
    if (regraNaMao === null) {
      setRecado({ tom: "neutro", texto: "Escolha primeiro um garfo na bandeja." })
      return
    }
    const regra = regraPorId(regraNaMao)
    if (regra === undefined) return
    setRaiz((r) => pendurar(r, id, regra))
    setRegraNaMao(null)
    setRecado(null)
  }

  const aoTocarGarfo = (id: string) => {
    setRaiz((r) => soltar(r, id))
    setRecado(null)
  }

  return (
    <main className="app">
      <header>
        <h1>Pendura a árvore</h1>
        <p className="gramatica">S → a S b &nbsp;|&nbsp; ε</p>
      </header>

      <nav className="niveis" aria-label="Programa">
        {NIVEIS.map((n, i) => (
          <button key={n.id} type="button" className={i === iNivel ? "chip ativo" : "chip"} onClick={() => recomecar(i)}>
            {n.tokens.join(" ")}
          </button>
        ))}
      </nav>

      <Sala
        raiz={arranjo}
        m={m}
        tokens={nivel.tokens}
        temRegraNaMao={regraNaMao !== null}
        aoTocarGancho={aoTocarGancho}
        aoTocarGarfo={aoTocarGarfo}
      />

      <section className="bandeja" aria-label="Bandeja de garfos">
        {REGRAS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={regraNaMao === r.id ? "garfo escolhido" : "garfo"}
            onClick={() => setRegraNaMao((atual) => (atual === r.id ? null : r.id))}
          >
            <svg viewBox="0 0 90 56" className="miniatura" aria-hidden="true">
              <line x1={45} y1={8} x2={45} y2={16} className="ramo" />
              <circle cx={45} cy={16} r={7} className="peca" />
              {r.id === "r1" ? (
                <>
                  <line x1={45} y1={16} x2={18} y2={42} className="ramo" />
                  <line x1={45} y1={16} x2={45} y2={42} className="ramo" />
                  <line x1={45} y1={16} x2={72} y2={42} className="ramo" />
                  <Forma tipo="a" x={18} y={42} r={7} classe="peca folha" />
                  <Forma tipo="naoTerminal" x={45} y={42} r={7} classe="peca livre" />
                  <Forma tipo="b" x={72} y={42} r={7} classe="peca folha" />
                </>
              ) : (
                <>
                  <line x1={45} y1={16} x2={45} y2={40} className="ramo vazio" />
                  <text x={45} y={48} className="epsilon">ε</text>
                </>
              )}
            </svg>
            <span>{r.rotulo}</span>
          </button>
        ))}
      </section>

      {recado !== null && <p className={`recado ${recado.tom}`}>{recado.texto}</p>}

      <section className="acoes">
        <button
          type="button"
          className="principal"
          onClick={() => setRecado(recadoDoVeredito(verificar(raiz, nivel.tokens)))}
        >
          Verificar
        </button>
        <button
          type="button"
          className="secundaria"
          onClick={() =>
            setRecado(
              nivel.penduravel
                ? { tom: "ruim", texto: "Dá sim — existe uma árvore para este programa. Continue tentando." }
                : { tom: "bom", texto: "Isso mesmo: este programa está fora da gramática, nenhuma árvore o alcança." }
            )
          }
        >
          Não dá para pendurar
        </button>
        <button type="button" className="secundaria" onClick={() => recomecar()} disabled={livres === 1 && raiz._tag === "Gancho"}>
          Recomeçar
        </button>
      </section>
    </main>
  )
}
