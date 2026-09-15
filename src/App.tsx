import { useMemo, useRef, useState } from "react"
import { NIVEIS, REGRAS } from "./gramatica.js"
import { cenaDe, medidas, type Ponto } from "./layout.js"
import {
  encaixar,
  mover,
  mundoVazio,
  novoGarfo,
  por,
  tirar,
  verificar,
  type Mundo,
  type Parte,
  type Veredito
} from "./mundo.js"
import { Forma, Sala } from "./Sala.jsx"

type Recado = { readonly tom: "bom" | "ruim" | "neutro"; readonly texto: string }

const recadoDoVeredito = (v: Veredito): Recado => {
  switch (v._tag) {
    case "SemRaiz":
      return { tom: "neutro", texto: "Nada pendurado no gancho do teto ainda." }
    case "GanchoVazio":
      return { tom: "neutro", texto: `Faltam ${v.quantos} gancho${v.quantos > 1 ? "s" : ""} por preencher.` }
    case "PontaSolta":
      return { tom: "neutro", texto: `${v.quantos} ponta${v.quantos > 1 ? "s" : ""} ainda não alcança o chão.` }
    case "Cruzado":
      return { tom: "ruim", texto: "Os ramos se cruzam: a ordem da árvore não é a ordem do chão." }
    case "TokenLivre":
      return { tom: "ruim", texto: `Sobra${v.quantos > 1 ? "m" : ""} ${v.quantos} token${v.quantos > 1 ? "s" : ""} sem ninguém.` }
    case "FrestaErrada":
      return { tom: "ruim", texto: `O ε pousou na fresta ${v.encontrada}, mas o lugar dele é a fresta ${v.esperada}.` }
    case "Certo":
      return { tom: "bom", texto: "Pendurada. A colheita bate com o chão, na ordem." }
  }
}

export const App = () => {
  const [iNivel, setINivel] = useState(0)
  const [mundo, setMundo] = useState<Mundo>(mundoVazio)
  const [recado, setRecado] = useState<Recado | null>(null)

  const nivel = NIVEIS[iNivel] ?? NIVEIS[0]!
  const m = useMemo(() => medidas(nivel.tokens.length), [nivel])
  const cena = useMemo(() => cenaDe(m, nivel.tokens.length), [m, nivel])

  const recomecar = (i = iNivel) => {
    setINivel(i)
    setMundo(mundoVazio)
    setRecado(null)
  }

  const trazer = (regraId: string) => {
    // Chega solto, sem contato, num lugar vazio perto do teto.
    const onde: Ponto = { x: m.largura / 2 + (mundo.garfos.length % 3) * 34 - 34, y: m.tetoY + 96 }
    setMundo((w) => por(w, novoGarfo(regraId, onde)))
    setRecado(null)
  }

  // Todo arrasto é calculado a partir do mundo de quando ele começou.
  const inicioDoArrasto = useRef<Mundo | null>(null)

  const aoMover = (garfo: string, parte: Parte, p: Ponto) =>
    setMundo((w) => {
      if (inicioDoArrasto.current === null) inicioDoArrasto.current = w
      return mover(inicioDoArrasto.current, cena, garfo, parte, p)
    })

  const aoSoltar = (garfo: string, parte: Parte) => {
    inicioDoArrasto.current = null
    setMundo((w) => encaixar(w, cena, nivel.tokens, garfo, parte))
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

      <p className="dica">
        Arraste o <strong>anel</strong> até um gancho, e cada <strong>ponta</strong> até o token dela — as vizinhas
        se afastam de leve, sem trocar de ordem. Arraste o <strong>ramo</strong> para mover o garfo inteiro.
      </p>

      <Sala mundo={mundo} cena={cena} m={m} tokens={nivel.tokens} aoMover={aoMover} aoSoltar={aoSoltar} />

      <section className="bandeja-caixa" aria-label="Bandeja de garfos">
        <p className="etiqueta">Bandeja — toque para trazer um garfo</p>
        <div className="bandeja">
          {REGRAS.map((r) => (
            <button key={r.id} type="button" className="garfo" onClick={() => trazer(r.id)}>
              <svg viewBox="0 0 90 56" className="miniatura" aria-hidden="true">
                <circle cx={45} cy={14} r={7} className="anel" />
                {r.id === "r1" ? (
                  <>
                    <line x1={45} y1={14} x2={18} y2={42} className="ramo" />
                    <line x1={45} y1={14} x2={45} y2={42} className="ramo" />
                    <line x1={45} y1={14} x2={72} y2={42} className="ramo" />
                    <Forma tipo="a" x={18} y={42} r={7} classe="peca folha" />
                    <Forma tipo="naoTerminal" x={45} y={42} r={7} classe="peca livre" />
                    <Forma tipo="b" x={72} y={42} r={7} classe="peca folha" />
                  </>
                ) : (
                  <>
                    <line x1={45} y1={14} x2={45} y2={38} className="ramo vazio" />
                    <text x={45} y={48} className="epsilon">ε</text>
                  </>
                )}
              </svg>
              <span>{r.rotulo}</span>
            </button>
          ))}
        </div>
      </section>

      {recado !== null && <p className={`recado ${recado.tom}`}>{recado.texto}</p>}

      <section className="acoes">
        <button type="button" className="principal" onClick={() => setRecado(recadoDoVeredito(verificar(mundo, nivel.tokens)))}>
          Verificar
        </button>
        <button
          type="button"
          className="secundaria"
          onClick={() =>
            setRecado(
              nivel.penduravel
                ? { tom: "ruim", texto: "Dá sim — existe uma árvore para este programa." }
                : { tom: "bom", texto: "Isso mesmo: este programa está fora da gramática." }
            )
          }
        >
          Não dá para pendurar
        </button>
        <button
          type="button"
          className="secundaria"
          onClick={() => {
            const ultimo = mundo.garfos[mundo.garfos.length - 1]
            if (ultimo !== undefined) setMundo((w) => tirar(w, ultimo.id))
          }}
          disabled={mundo.garfos.length === 0}
        >
          Tirar o último
        </button>
        <button type="button" className="secundaria" onClick={() => recomecar()} disabled={mundo.garfos.length === 0}>
          Recomeçar
        </button>
      </section>
    </main>
  )
}
