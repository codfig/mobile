import { useRef, useState } from "react"
import { regraPorId, type Categoria } from "./gramatica.js"
import type { Cena, Medidas, Ponto } from "./layout.js"
import {
  encaixesLivres,
  pendentes,
  posAnel,
  posDaParte,
  posPonta,
  simboloDaPonta,
  tokensLivres,
  type Garfo,
  type Mundo,
  type Parte
} from "./mundo.js"

export const Forma = ({
  tipo,
  x,
  y,
  r,
  classe
}: {
  tipo: "naoTerminal" | Categoria
  x: number
  y: number
  r: number
  classe: string
}) => {
  if (tipo === "naoTerminal") return <circle cx={x} cy={y} r={r} className={classe} />
  if (tipo === "a") return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} rx={3} className={classe} />
  return <polygon points={`${x},${y - r} ${x + r},${y + r} ${x - r},${y + r}`} className={classe} />
}

type Arrasto = { readonly garfo: string; readonly parte: Parte; readonly dx: number; readonly dy: number }

export const Sala = ({
  mundo,
  cena,
  m,
  tokens,
  aoMover,
  aoSoltar
}: {
  mundo: Mundo
  cena: Cena
  m: Medidas
  tokens: ReadonlyArray<Categoria>
  aoMover: (garfo: string, parte: Parte, p: Ponto) => void
  aoSoltar: (garfo: string, parte: Parte) => void
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [arrasto, setArrasto] = useState<Arrasto | null>(null)

  const ponto = (e: { clientX: number; clientY: number }): Ponto => {
    const svg = svgRef.current
    if (svg === null) return { x: 0, y: 0 }
    const r = svg.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * m.largura, y: ((e.clientY - r.top) / r.height) * m.altura }
  }

  const comecar = (e: React.PointerEvent, g: Garfo, parte: Parte) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = ponto(e)
    const atual = posDaParte(mundo, cena, g, parte)
    setArrasto({ garfo: g.id, parte, dx: atual.x - p.x, dy: atual.y - p.y })
  }

  const mexer = (e: React.PointerEvent) => {
    if (arrasto === null) return
    const p = ponto(e)
    aoMover(arrasto.garfo, arrasto.parte, { x: p.x + arrasto.dx, y: p.y + arrasto.dy })
  }

  const largar = () => {
    if (arrasto === null) return
    aoSoltar(arrasto.garfo, arrasto.parte)
    setArrasto(null)
  }

  // Enquanto um anel viaja, os ganchos que o aceitam se acendem.
  const alvosDoAnel =
    arrasto?.parte._tag === "Anel" ? encaixesLivres(mundo, cena, pendentes(mundo, arrasto.garfo)) : []

  const garfoArrastado = arrasto === null ? undefined : mundo.garfos.find((g) => g.id === arrasto.garfo)
  const simboloArrastado =
    garfoArrastado !== undefined && arrasto?.parte._tag === "Ponta"
      ? simboloDaPonta(garfoArrastado, arrasto.parte.i)
      : undefined
  const usados = tokensLivres(mundo)
  const tokensAcesos =
    simboloArrastado?.tipo === "terminal"
      ? tokens.map((t, i) => (!usados.has(i) && t === simboloArrastado.categoria ? i : -1)).filter((i) => i >= 0)
      : []
  const frestasAcesas = simboloArrastado?.tipo === "vazio" ? [...Array(cena.nTokens + 1).keys()] : []

  return (
    <svg
      ref={svgRef}
      className="sala"
      viewBox={`0 0 ${m.largura} ${m.altura}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={mexer}
      onPointerUp={largar}
      onPointerCancel={largar}
      role="img"
      aria-label="Sala onde a árvore é pendurada"
    >
      <line x1={12} y1={m.tetoY - 20} x2={m.largura - 12} y2={m.tetoY - 20} className="viga" />
      <line x1={12} y1={m.chaoY + 30} x2={m.largura - 12} y2={m.chaoY + 30} className="viga" />

      {/* gancho do teto */}
      <line x1={cena.teto.x} y1={m.tetoY - 20} x2={cena.teto.x} y2={cena.teto.y} className="ramo" />
      <circle
        cx={cena.teto.x}
        cy={cena.teto.y}
        r={13}
        className={alvosDoAnel.some((a) => a.alvo._tag === "Teto") ? "encaixe aceso" : "encaixe"}
      />
      <text x={cena.teto.x} y={cena.teto.y + 4} className="rotulo">S</text>

      {/* frestas acesas, para o ε */}
      {frestasAcesas.map((i) => (
        <circle key={`fr-${i}`} cx={cena.fresta(i).x} cy={cena.fresta(i).y} r={11} className="encaixe aceso" />
      ))}

      {/* tokens do chão */}
      {tokens.map((t, i) => (
        <g key={`tok-${i}`} className={tokensAcesos.includes(i) ? "token-caixa aceso" : "token-caixa"}>
          <Forma tipo={t} x={cena.token(i).x} y={cena.token(i).y} r={15} classe="token" />
          <text x={cena.token(i).x} y={cena.token(i).y + 5} className="rotulo-token">{t}</text>
        </g>
      ))}

      {/* garfos */}
      {mundo.garfos.map((g) => {
        const regra = regraPorId(g.regra)
        if (regra === undefined) return null
        const anel = posAnel(mundo, cena, g)
        const emMovimento = arrasto?.garfo === g.id
        return (
          <g key={g.id} className={emMovimento ? "garfo-mundo movendo" : "garfo-mundo"}>
            {regra.corpo.map((s, i) => {
              const p = posPonta(mundo, cena, g, i)
              return (
                <g key={`${g.id}-${i}`}>
                  <line x1={anel.x} y1={anel.y} x2={p.x} y2={p.y} className={s.tipo === "vazio" ? "ramo vazio" : "ramo"} />
                  {/* o próprio ramo é a alça do corpo */}
                  <line
                    x1={anel.x}
                    y1={anel.y}
                    x2={p.x}
                    y2={p.y}
                    className="pega-corpo"
                    onPointerDown={(e) => comecar(e, g, { _tag: "Corpo" })}
                  />
                </g>
              )
            })}

            {regra.corpo.map((s, i) => {
              const p = posPonta(mundo, cena, g, i)
              return (
                <g key={`pt-${g.id}-${i}`} onPointerDown={(e) => comecar(e, g, { _tag: "Ponta", i })} className="pega">
                  <circle cx={p.x} cy={p.y} r={22} className="alvo" />
                  {s.tipo === "naoTerminal" ? (
                    <>
                      <circle cx={p.x} cy={p.y} r={13} className="peca livre" />
                      <text x={p.x} y={p.y + 4} className="rotulo">S</text>
                    </>
                  ) : s.tipo === "vazio" ? (
                    <text x={p.x} y={p.y + 5} className="epsilon">ε</text>
                  ) : (
                    <Forma tipo={s.categoria} x={p.x} y={p.y} r={11} classe="peca folha" />
                  )}
                </g>
              )
            })}

            <g onPointerDown={(e) => comecar(e, g, { _tag: "Anel" })} className="pega">
              <circle cx={anel.x} cy={anel.y} r={22} className="alvo" />
              <circle cx={anel.x} cy={anel.y} r={11} className="anel" />
            </g>
          </g>
        )
      })}
    </svg>
  )
}
