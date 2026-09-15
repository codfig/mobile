import { useEffect, useRef, useState } from "react"
import { regraDe, type Gramatica, type Token } from "./gramatica.js"
import { Etiqueta, NaoTerminal } from "./Formas.jsx"
import {
  ajustar,
  dist,
  limitar,
  limitarEscala,
  paraSala,
  zoomEm,
  type Camera,
  type Cena,
  type Medidas,
  type Ponto
} from "./layout.js"
import {
  encaixesLivres,
  pendentes,
  posAnel,
  posDaParte,
  posPonta,
  simboloDaPonta,
  tokensOcupados,
  type Garfo,
  type Mundo,
  type Parte
} from "./mundo.js"

type Arrasto = {
  readonly garfo: string
  readonly parte: Parte
  readonly dx: number
  readonly dy: number
  readonly ponteiro: number
}

/**
 * A sala e os gestos sobre ela.
 *
 * Um dedo numa peça arrasta a peça. Um dedo no vazio arrasta a vista; dois
 * dedos no vazio aproximam e afastam. A roda do mouse também aproxima. Assim
 * um programa maior que a tela continua tocável.
 */
export const Sala = ({
  gramatica,
  mundo,
  cena,
  m,
  tokens,
  camera,
  aoMudarCamera,
  aoMover,
  aoSoltar
}: {
  gramatica: Gramatica
  mundo: Mundo
  cena: Cena
  m: Medidas
  tokens: ReadonlyArray<Token>
  camera: Camera | null
  aoMudarCamera: (c: Camera) => void
  aoMover: (garfo: string, parte: Parte, p: Ponto) => void
  aoSoltar: (garfo: string, parte: Parte) => void
}) => {
  const caixaRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [arrasto, setArrasto] = useState<Arrasto | null>(null)

  const cameraRef = useRef(camera)
  cameraRef.current = camera
  const dedos = useRef(new Map<number, Ponto>())
  const gesto = useRef<{ cam: Camera; pts: ReadonlyArray<Ponto> } | null>(null)

  const indice = (nome: string) => Math.max(0, gramatica.naoTerminais.indexOf(nome))

  // A área de desenho mede a si mesma; a câmera nasce enquadrando a sala inteira.
  useEffect(() => {
    const caixa = caixaRef.current
    if (caixa === null) return
    const medir = () => {
      const w = caixa.clientWidth
      const h = caixa.clientHeight
      if (w === 0 || h === 0) return
      const atual = cameraRef.current
      aoMudarCamera(atual === null ? ajustar(m, w, h) : limitar(m, { ...atual, w, h }))
    }
    const obs = new ResizeObserver(medir)
    obs.observe(caixa)
    if (cameraRef.current === null) medir()
    return () => obs.disconnect()
  }, [m, camera === null, aoMudarCamera])

  // A roda precisa de um ouvinte não-passivo, senão a página rola junto.
  useEffect(() => {
    const svg = svgRef.current
    if (svg === null) return
    const roda = (e: WheelEvent) => {
      const cam = cameraRef.current
      if (cam === null) return
      e.preventDefault()
      const r = svg.getBoundingClientRect()
      aoMudarCamera(zoomEm(m, cam, Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top))
    }
    svg.addEventListener("wheel", roda, { passive: false })
    return () => svg.removeEventListener("wheel", roda)
  }, [m, aoMudarCamera])

  const relativo = (e: { clientX: number; clientY: number }): Ponto => {
    const r = svgRef.current?.getBoundingClientRect()
    return r === undefined ? { x: 0, y: 0 } : { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const comecar = (e: React.PointerEvent, g: Garfo, parte: Parte) => {
    // com dedos já na vista, este toque é o segundo dedo de uma pinça
    if (camera === null || arrasto !== null || dedos.current.size > 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const q = relativo(e)
    const p = paraSala(camera, q.x, q.y)
    const atual = posDaParte(mundo, cena, g, parte)
    setArrasto({ garfo: g.id, parte, dx: atual.x - p.x, dy: atual.y - p.y, ponteiro: e.pointerId })
  }

  const tocarVista = (e: React.PointerEvent<SVGSVGElement>) => {
    if (camera === null || arrasto !== null) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dedos.current.set(e.pointerId, relativo(e))
    gesto.current = { cam: camera, pts: [...dedos.current.values()] }
  }

  const mexer = (e: React.PointerEvent) => {
    if (camera === null) return
    if (arrasto !== null) {
      if (e.pointerId !== arrasto.ponteiro) return
      const q = relativo(e)
      const p = paraSala(camera, q.x, q.y)
      aoMover(arrasto.garfo, arrasto.parte, { x: p.x + arrasto.dx, y: p.y + arrasto.dy })
      return
    }
    const g = gesto.current
    if (g === null || !dedos.current.has(e.pointerId)) return
    dedos.current.set(e.pointerId, relativo(e))
    const agora = [...dedos.current.values()]
    const { cam, pts: antes } = g

    if (agora.length === 1 && antes.length === 1) {
      const a0 = antes[0]!
      const a1 = agora[0]!
      aoMudarCamera(limitar(m, { ...cam, x: cam.x - (a1.x - a0.x) / cam.escala, y: cam.y - (a1.y - a0.y) / cam.escala }))
    } else if (agora.length >= 2 && antes.length >= 2) {
      const [a0, b0] = [antes[0]!, antes[1]!]
      const [a1, b1] = [agora[0]!, agora[1]!]
      const escala = limitarEscala(cam.escala * (dist(a1, b1) / Math.max(dist(a0, b0), 1)))
      const meio0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 }
      const meio1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 }
      const fixo = paraSala(cam, meio0.x, meio0.y)
      aoMudarCamera(limitar(m, { ...cam, escala, x: fixo.x - meio1.x / escala, y: fixo.y - meio1.y / escala }))
    }
  }

  const soltarDedo = (e: React.PointerEvent) => {
    if (arrasto !== null && e.pointerId === arrasto.ponteiro) {
      aoSoltar(arrasto.garfo, arrasto.parte)
      setArrasto(null)
      return
    }
    if (!dedos.current.delete(e.pointerId)) return
    // quem continua na tela recomeça o gesto de onde está, sem salto
    gesto.current =
      camera !== null && dedos.current.size > 0 ? { cam: camera, pts: [...dedos.current.values()] } : null
  }

  // ---- o que acende durante um arrasto ----

  const garfoArrastado = arrasto === null ? undefined : mundo.garfos.find((g) => g.id === arrasto.garfo)
  const regraArrastada = garfoArrastado === undefined ? undefined : regraDe(gramatica, garfoArrastado.regra)
  const alvosDoAnel =
    arrasto?.parte._tag === "Anel" && regraArrastada !== undefined
      ? encaixesLivres(gramatica, mundo, cena, pendentes(mundo, arrasto.garfo), regraArrastada.cabeca)
      : []
  const simboloArrastado =
    garfoArrastado !== undefined && arrasto?.parte._tag === "Ponta"
      ? simboloDaPonta(gramatica, garfoArrastado, arrasto.parte.i)
      : undefined
  const ocupados = tokensOcupados(mundo)
  const tokensAcesos = new Set(
    simboloArrastado?.tipo === "terminal"
      ? tokens.flatMap((t, i) => (!ocupados.has(i) && t.categoria === simboloArrastado.categoria ? [i] : []))
      : []
  )
  const frestasAcesas = simboloArrastado?.tipo === "vazio" ? [...Array(cena.nTokens + 1).keys()] : []

  const viewBox =
    camera === null
      ? `0 0 ${m.largura} ${m.altura}`
      : `${camera.x} ${camera.y} ${camera.w / camera.escala} ${camera.h / camera.escala}`

  const zoomNoCentro = (fator: number) => camera !== null && aoMudarCamera(zoomEm(m, camera, fator, camera.w / 2, camera.h / 2))

  return (
    <div className="sala-caixa" ref={caixaRef}>
      <svg
        ref={svgRef}
        className="sala"
        viewBox={viewBox}
        preserveAspectRatio="none"
        onPointerDown={tocarVista}
        onPointerMove={mexer}
        onPointerUp={soltarDedo}
        onPointerCancel={soltarDedo}
        role="img"
        aria-label="Sala onde a árvore é pendurada"
      >
        {camera !== null && (
          <>
            <rect x={0} y={0} width={m.largura} height={m.altura} className="quarto" />
            <line x1={12} y1={m.tetoY - 22} x2={m.largura - 12} y2={m.tetoY - 22} className="viga" />
            <line x1={12} y1={m.chaoY + 40} x2={m.largura - 12} y2={m.chaoY + 40} className="viga" />

            {/* gancho do teto: a forma do símbolo inicial */}
            <line x1={cena.teto.x} y1={m.tetoY - 22} x2={cena.teto.x} y2={cena.teto.y} className="ramo" />
            <NaoTerminal
              indice={indice(gramatica.inicio)}
              nome={gramatica.inicio}
              x={cena.teto.x}
              y={cena.teto.y}
              r={13}
              classe={alvosDoAnel.some((a) => a.alvo._tag === "Teto") ? "encaixe aceso" : "encaixe"}
            />

            {frestasAcesas.map((i) => (
              <circle key={`fr-${i}`} cx={cena.fresta(i).x} cy={cena.fresta(i).y} r={10} className="encaixe aceso" />
            ))}

            {tokens.map((t, i) => {
              const q = cena.token(i)
              return (
                <g key={`tok-${i}`} className={tokensAcesos.has(i) ? "token-caixa aceso" : "token-caixa"}>
                  <Etiqueta texto={t.texto} x={q.x} y={q.y} altura={30} porLetra={9} classe="token" classeTexto="rotulo-token" />
                  {t.categoria !== t.texto && (
                    <text x={q.x} y={q.y + 30} className="categoria-token">
                      {t.categoria}
                    </text>
                  )}
                </g>
              )
            })}

            {/* ganchos vagos que aceitam o anel em viagem */}
            {alvosDoAnel.flatMap((a) =>
              a.alvo._tag === "Ponta" ? [<circle key={`alvo-${a.alvo.garfo}-${a.alvo.i}`} cx={a.p.x} cy={a.p.y} r={20} className="encaixe aceso" />] : []
            )}

            {mundo.garfos.map((g) => {
              const regra = regraDe(gramatica, g.regra)
              if (regra === undefined) return null
              const anel = posAnel(mundo, cena, g)
              return (
                <g key={g.id} className={arrasto?.garfo === g.id ? "garfo-mundo movendo" : "garfo-mundo"}>
                  {regra.corpo.map((s, i) => {
                    const p = posPonta(mundo, cena, g, i)
                    return (
                      <g key={`r-${i}`}>
                        <line x1={anel.x} y1={anel.y} x2={p.x} y2={p.y} className={s.tipo === "vazio" ? "ramo vazio" : "ramo"} />
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
                      <g key={`p-${i}`} className="pega" onPointerDown={(e) => comecar(e, g, { _tag: "Ponta", i })}>
                        <circle cx={p.x} cy={p.y} r={22} className="alvo" />
                        {s.tipo === "naoTerminal" ? (
                          <NaoTerminal indice={indice(s.nome)} nome={s.nome} x={p.x} y={p.y} r={13} classe="peca livre" />
                        ) : s.tipo === "vazio" ? (
                          <text x={p.x} y={p.y + 5} className="epsilon">
                            ε
                          </text>
                        ) : (
                          <Etiqueta texto={s.categoria} x={p.x} y={p.y} classe="terminal" classeTexto="rotulo-terminal" />
                        )}
                      </g>
                    )
                  })}

                  <g className="pega" onPointerDown={(e) => comecar(e, g, { _tag: "Anel" })}>
                    <circle cx={anel.x} cy={anel.y} r={22} className="alvo" />
                    <NaoTerminal
                      indice={indice(regra.cabeca)}
                      nome={regra.cabeca}
                      x={anel.x}
                      y={anel.y}
                      r={12}
                      classe="anel"
                      classeRotulo="rotulo-anel"
                    />
                  </g>
                </g>
              )
            })}
          </>
        )}
      </svg>

      <div className="camera-botoes">
        <button type="button" aria-label="Aproximar" onClick={() => zoomNoCentro(1.3)}>
          +
        </button>
        <button type="button" aria-label="Afastar" onClick={() => zoomNoCentro(1 / 1.3)}>
          −
        </button>
        <button
          type="button"
          className="largo"
          onClick={() => camera !== null && aoMudarCamera(ajustar(m, camera.w, camera.h))}
        >
          Ver tudo
        </button>
      </div>
    </div>
  )
}
