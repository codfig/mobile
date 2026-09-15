import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { textoDoSimbolo, type Gramatica, type Regra } from "./gramatica.js"
import { Etiqueta, NaoTerminal } from "./Formas.jsx"
import { cenaDe, medidas, type Camera, type Ponto } from "./layout.js"
import {
  assentar,
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
import { TRILHAS } from "./niveis.js"
import { Sala } from "./Sala.jsx"

/** Fração do caminho que cada junta anda por quadro: cai rápido e pousa devagar. */
const PASSO_DA_GRAVIDADE = 0.16

type Recado = { readonly tom: "bom" | "ruim" | "neutro"; readonly texto: string }

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios)

const recadoDoVeredito = (v: Veredito): Recado => {
  switch (v._tag) {
    case "SemRaiz":
      return { tom: "neutro", texto: "Nada pendurado no gancho do teto ainda." }
    case "GanchoVazio":
      return { tom: "neutro", texto: `Faltam ${v.quantos} ${plural(v.quantos, "gancho", "ganchos")} por preencher.` }
    case "PontaSolta":
      return { tom: "neutro", texto: `${v.quantos} ${plural(v.quantos, "ponta ainda não alcança", "pontas ainda não alcançam")} o chão.` }
    case "Cruzado":
      return { tom: "ruim", texto: "Os ramos se cruzam: a ordem da árvore não é a ordem do chão." }
    case "TokenLivre":
      return { tom: "ruim", texto: `${plural(v.quantos, "Sobra", "Sobram")} ${v.quantos} ${plural(v.quantos, "token", "tokens")} sem ninguém.` }
    case "FrestaErrada":
      return { tom: "ruim", texto: `Um ε pousou na fresta ${v.encontrada}, mas o lugar dele é a fresta ${v.esperada}.` }
    case "Certo":
      return { tom: "bom", texto: "Pendurada. A colheita bate com o chão, na ordem." }
  }
}

/** A gramática como se escreve no quadro: uma linha por não-terminal. */
const linhasDaGramatica = (g: Gramatica): ReadonlyArray<string> =>
  g.naoTerminais.map(
    (nt) =>
      `${nt} → ${g.regras
        .filter((r) => r.cabeca === nt)
        .map((r) => r.corpo.map(textoDoSimbolo).join(" "))
        .join("  |  ")}`
  )

const MiniGarfo = ({ gramatica, regra }: { gramatica: Gramatica; regra: Regra }) => {
  const n = regra.corpo.length
  const passo = 30
  const largura = Math.max(84, (n - 1) * passo + 44)
  const cx = largura / 2
  const indice = (nome: string) => Math.max(0, gramatica.naoTerminais.indexOf(nome))
  return (
    <svg viewBox={`0 0 ${largura} 60`} width={largura} height={60} className="miniatura" aria-hidden="true">
      {regra.corpo.map((s, i) => {
        const x = cx + (i - (n - 1) / 2) * passo
        return <line key={`l${i}`} x1={cx} y1={15} x2={x} y2={42} className={s.tipo === "vazio" ? "ramo vazio" : "ramo"} />
      })}
      {regra.corpo.map((s, i) => {
        const x = cx + (i - (n - 1) / 2) * passo
        return s.tipo === "naoTerminal" ? (
          <NaoTerminal key={`p${i}`} indice={indice(s.nome)} nome={s.nome} x={x} y={44} r={8} classe="peca livre" classeRotulo="rotulo-mini" />
        ) : s.tipo === "vazio" ? (
          <text key={`p${i}`} x={x} y={52} className="epsilon">
            ε
          </text>
        ) : (
          <Etiqueta key={`p${i}`} texto={s.categoria} x={x} y={44} altura={16} porLetra={6} classe="terminal" classeTexto="rotulo-mini claro" />
        )
      })}
      <NaoTerminal indice={indice(regra.cabeca)} nome={regra.cabeca} x={cx} y={15} r={8} classe="anel" classeRotulo="rotulo-mini" />
    </svg>
  )
}

export const App = () => {
  const [iTrilha, setITrilha] = useState(TRILHAS.length - 1)
  const [iNivel, setINivel] = useState(3)
  const [mundo, setMundo] = useState<Mundo>(mundoVazio)
  const [camera, setCamera] = useState<Camera | null>(null)
  const [recado, setRecado] = useState<Recado | null>(null)
  const [gravidade, setGravidade] = useState(false)

  const trilha = TRILHAS[iTrilha] ?? TRILHAS[0]!
  const gramatica = trilha.gramatica
  const nivel = trilha.niveis[iNivel] ?? trilha.niveis[0]!
  const m = useMemo(() => medidas(nivel.tokens.length), [nivel])
  const cena = useMemo(() => cenaDe(m, nivel.tokens.length), [m, nivel])

  const irPara = (t: number, n: number) => {
    setITrilha(t)
    setINivel(n)
    setMundo(mundoVazio)
    setCamera(null)
    setRecado(null)
  }

  const trazer = (regra: Regra) => {
    // O garfo chega solto, perto do alto do que está na tela agora.
    const base: Ponto =
      camera === null
        ? { x: m.largura / 2, y: m.tetoY + 96 }
        : { x: camera.x + camera.w / camera.escala / 2, y: camera.y + (camera.h / camera.escala) * 0.3 }
    const desvio = ((mundo.garfos.length % 5) - 2) * 26
    setMundo((w) => por(w, novoGarfo(regra, { x: base.x + desvio, y: base.y + Math.abs(desvio) * 0.4 })))
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
    setMundo((w) => {
      const encaixado = encaixar(gramatica, w, cena, nivel.tokens, garfo, parte)
      // o primeiro passo já aqui, para a gravidade retomar mesmo se o encaixe não mudou nada
      return gravidade ? assentar(encaixado, cena, PASSO_DA_GRAVIDADE) : encaixado
    })
  }

  // A gravidade anda um passo por quadro enquanto houver junta fora do lugar, e
  // espera o dedo soltar: ela não disputa a peça com quem a arrasta.
  useEffect(() => {
    if (!gravidade || inicioDoArrasto.current !== null) return
    const quadro = requestAnimationFrame(() =>
      setMundo((w) => (inicioDoArrasto.current !== null ? w : assentar(w, cena, PASSO_DA_GRAVIDADE)))
    )
    return () => cancelAnimationFrame(quadro)
  }, [gravidade, mundo, cena])
  const aoMudarCamera = useCallback((c: Camera) => setCamera(c), [])

  return (
    <main className="app">
      <header>
        <h1>Pendura a árvore</h1>
      </header>

      <nav className="trilhas" aria-label="Gramática">
        {TRILHAS.map((t, i) => (
          <button key={t.gramatica.id} type="button" className={i === iTrilha ? "chip ativo" : "chip"} onClick={() => irPara(i, 0)}>
            {t.gramatica.nome}
          </button>
        ))}
      </nav>

      <pre className="gramatica">{linhasDaGramatica(gramatica).join("\n")}</pre>

      <nav className="niveis" aria-label="Programa">
        {trilha.niveis.map((n, i) => (
          <button key={n.id} type="button" className={i === iNivel ? "chip programa ativo" : "chip programa"} onClick={() => irPara(iTrilha, i)}>
            {n.programa}
          </button>
        ))}
      </nav>

      <Sala
        gramatica={gramatica}
        mundo={mundo}
        cena={cena}
        m={m}
        tokens={nivel.tokens}
        camera={camera}
        aoMudarCamera={aoMudarCamera}
        aoMover={aoMover}
        aoSoltar={aoSoltar}
        canto={
          <button
            type="button"
            role="switch"
            aria-checked={gravidade}
            className={gravidade ? "interruptor ligado" : "interruptor"}
            onClick={() => setGravidade((g) => !g)}
          >
            <span className="trilho" aria-hidden="true">
              <span className="botao" />
            </span>
            Gravidade
          </button>
        }
      />

      <p className="dica">
        Arraste o <strong>anel</strong> até um gancho da mesma forma, e cada <strong>ponta</strong> até o token dela. O{" "}
        <strong>ramo</strong> move o garfo sem desfazer o que já encaixou. Um dedo no vazio passeia pela sala; dois dedos aproximam. Com a{" "}
        <strong>gravidade</strong>, as juntas descem e se alinham sobre o que as prende ao chão.
      </p>

      <section className="bandeja-caixa" aria-label="Bandeja de garfos">
        <p className="etiqueta">Bandeja — toque para trazer um garfo</p>
        <div className="bandeja">
          {gramatica.regras.map((r) => (
            <button key={r.id} type="button" className="garfo" onClick={() => trazer(r)}>
              <MiniGarfo gramatica={gramatica} regra={r} />
              <span>{r.rotulo}</span>
            </button>
          ))}
        </div>
      </section>

      {recado !== null && <p className={`recado ${recado.tom}`}>{recado.texto}</p>}

      <section className="acoes">
        <button type="button" className="principal" onClick={() => setRecado(recadoDoVeredito(verificar(gramatica, mundo, nivel.tokens)))}>
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
          disabled={mundo.garfos.length === 0}
          onClick={() => {
            const ultimo = mundo.garfos[mundo.garfos.length - 1]
            if (ultimo !== undefined) setMundo((w) => tirar(w, ultimo.id))
          }}
        >
          Tirar o último
        </button>
        <button type="button" className="secundaria" disabled={mundo.garfos.length === 0} onClick={() => irPara(iTrilha, iNivel)}>
          Recomeçar
        </button>
      </section>
    </main>
  )
}

