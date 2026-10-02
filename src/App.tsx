import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { escreverBNF, lerProgramas, montarGramatica } from "./bnf.js"
import { Editor, type Exemplo } from "./Editor.jsx"
import { type Gramatica, type Regra } from "./gramatica.js"
import { curvaDoRamo, Etiqueta, NaoTerminal } from "./Formas.jsx"
import { cenaDe, medidas, type Camera, type Ponto } from "./layout.js"
import {
  assentar,
  encaixar,
  mover,
  mundoVazio,
  novoGarfo,
  pendurarArvore,
  por,
  tirar,
  verificar,
  type Mundo,
  type Parte,
  type Veredito
} from "./mundo.js"
import { ARITMETICA, TRILHAS, trilhaDe, type Trilha } from "./niveis.js"
import { derivacoes } from "./reconhecer.js"
import { Sala } from "./Sala.jsx"

/** Fração do caminho que cada junta anda por quadro: cai rápido e pousa devagar. */
const PASSO_DA_GRAVIDADE = 0.16

/** Quantas árvores de um programa se procuram, no máximo. */
const LIMITE_DE_ARVORES = 4

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

/**
 * O editor abre com uma gramática que não é trilha nenhuma — 0ⁿ1ⁿ, prima da
 * primeira —, para que a primeira coisa a fazer nele seja mexer, não encarar
 * uma folha em branco.
 */
const BNF_INICIAL = `# Uma produção por linha; os símbolos vão separados por espaço.
# Não precisa da tecla → : vale -> ou ::= . Nem da ε : vale epsilon,
# ou nada depois da seta.
S → 0 S 1
S → ε`

const PROGRAMAS_INICIAIS = `0 1
0 0 1 1
0 0 1
0 1 0 1`

/** Cada trilha do jogo serve de ponto de partida: o editor abre com o texto dela. */
const EXEMPLOS: ReadonlyArray<Exemplo> = TRILHAS.map((t) => ({
  nome: t.gramatica.nome,
  bnf: escreverBNF(t.gramatica),
  programas: t.niveis.map((n) => n.programa).join("\n")
}))

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
        return <path key={`l${i}`} d={curvaDoRamo(cx, 15, x, 42)} className={s.tipo === "vazio" ? "ramo vazio" : "ramo"} />
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
  // abre em 2 + 3 * 4, da aritmética
  const [iTrilha, setITrilha] = useState(Math.max(0, TRILHAS.findIndex((t) => t.gramatica === ARITMETICA)))
  const [iNivel, setINivel] = useState(3)
  const [mundo, setMundo] = useState<Mundo>(mundoVazio)
  const [bnf, setBnf] = useState(BNF_INICIAL)
  const [programasEscritos, setProgramasEscritos] = useState(PROGRAMAS_INICIAIS)
  /** A trilha que veio do editor, se já foi montada. Fica depois das do código. */
  const [minha, setMinha] = useState<Trilha | null>(null)
  const [camera, setCamera] = useState<Camera | null>(null)
  const [recado, setRecado] = useState<Recado | null>(null)
  const [gravidade, setGravidade] = useState(false)

  const montagem = useMemo(() => montarGramatica(bnf), [bnf])
  const leituraDosProgramas = useMemo(() => lerProgramas(programasEscritos), [programasEscritos])

  // Na aba do editor a trilha pode ainda não existir; as contas seguem por uma
  // qualquer, e a sala é que não se desenha.
  const trilha: Trilha | null = iTrilha < TRILHAS.length ? TRILHAS[iTrilha]! : minha
  const viva = trilha ?? TRILHAS[0]!
  const gramatica = viva.gramatica
  const nivel = viva.niveis[iNivel] ?? viva.niveis[0]!
  const m = useMemo(() => medidas(nivel.tokens.length), [nivel])
  const cena = useMemo(() => cenaDe(m, nivel.tokens.length), [m, nivel])

  // Até LIMITE_DE_ARVORES: mais de uma já diz que o programa é ambíguo.
  const arvores = useMemo(() => derivacoes(gramatica, nivel.tokens, LIMITE_DE_ARVORES), [gramatica, nivel])
  const quantasArvores = arvores.length >= LIMITE_DE_ARVORES ? `${LIMITE_DE_ARVORES} ou mais` : `${arvores.length}`
  const [iResposta, setIResposta] = useState(0)

  const irPara = (t: number, n: number) => {
    setITrilha(t)
    setINivel(n)
    setMundo(mundoVazio)
    setCamera(null)
    setRecado(null)
    setIResposta(0)
  }

  const montar = () => {
    if (montagem.gramatica === null || leituraDosProgramas.erros.length > 0) return
    setMinha(trilhaDe(montagem.gramatica, leituraDosProgramas.programas))
    irPara(TRILHAS.length, 0)
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

  const aoDevolver = (garfo: string) => {
    // os que pendiam dele caem soltos onde estavam antes do arrasto, não onde ele os levou
    const inicio = inicioDoArrasto.current
    inicioDoArrasto.current = null
    setMundo((w) => tirar(inicio ?? w, cena, garfo))
    setRecado(null)
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

  const editor = (
    <Editor
      bnf={bnf}
      programas={programasEscritos}
      montagem={montagem}
      errosDosProgramas={leituraDosProgramas.erros}
      exemplos={EXEMPLOS}
      aoMudarBnf={setBnf}
      aoMudarProgramas={setProgramasEscritos}
      aoUsarExemplo={(e) => {
        setBnf(e.bnf)
        setProgramasEscritos(e.programas)
      }}
      aoMontar={montar}
    />
  )

  const cabecalho = (
    <>
      <header>
        <h1>Pendura a árvore</h1>
      </header>

      <nav className="trilhas" aria-label="Gramática">
        {TRILHAS.map((t, i) => (
          <button key={t.gramatica.id} type="button" className={i === iTrilha ? "chip ativo" : "chip"} onClick={() => irPara(i, 0)}>
            {t.gramatica.nome}
          </button>
        ))}
        <button
          type="button"
          className={iTrilha === TRILHAS.length ? "chip ativo" : "chip"}
          onClick={() => irPara(TRILHAS.length, 0)}
        >
          Sua gramática
        </button>
      </nav>
    </>
  )

  // Enquanto a trilha do editor não foi montada, a aba dele é a página inteira:
  // não há sala para desenhar embaixo.
  if (trilha === null)
    return (
      <main className="app">
        {cabecalho}
        <section className="editor-caixa" aria-label="Escrever a gramática">
          {editor}
        </section>
      </main>
    )

  return (
    <main className="app">
      {cabecalho}

      {iTrilha === TRILHAS.length && (
        <details className="editor-caixa">
          <summary>Escrever a gramática</summary>
          {editor}
        </details>
      )}

      <pre className="gramatica">{escreverBNF(gramatica)}</pre>

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
        aoDevolver={aoDevolver}
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
        <strong>ramo</strong> move o garfo sem desfazer o que já encaixou; levado até o pé da sala, devolve o garfo à bandeja. Um dedo no vazio passeia pela sala; dois dedos aproximam. Com a{" "}
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
        <button
          type="button"
          className="principal"
          onClick={() => {
            const veredito = verificar(gramatica, mundo, nivel.tokens)
            setRecado(
              veredito._tag === "Certo" && arvores.length > 1
                ? { tom: "bom", texto: `Pendurada. Mas este programa pendura de ${quantasArvores} jeitos, todos certos: tente outro.` }
                : recadoDoVeredito(veredito)
            )
          }}
        >
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
            inicioDoArrasto.current = null
            if (arvores.length === 0) {
              setMundo(mundoVazio)
              setRecado({ tom: "neutro", texto: "Não há árvore: este programa está fora da gramática." })
              return
            }
            // num programa ambíguo, cada toque pendura a próxima árvore
            const vez = iResposta % arvores.length
            setMundo(pendurarArvore(cena, arvores[vez]!))
            setIResposta(vez + 1)
            setRecado(
              arvores.length === 1
                ? { tom: "neutro", texto: "Uma árvore para este programa, pendurada." }
                : {
                    tom: "neutro",
                    texto: `Árvore ${vez + 1} de ${quantasArvores}: este programa pendura de mais de um jeito. Toque de novo para ver ${vez + 1 === arvores.length ? "a primeira" : "a próxima"}.`
                  }
            )
          }}
        >
          Resposta
        </button>
        <button
          type="button"
          className="secundaria"
          disabled={mundo.garfos.length === 0}
          onClick={() => {
            const ultimo = mundo.garfos[mundo.garfos.length - 1]
            if (ultimo !== undefined) setMundo((w) => tirar(w, cena, ultimo.id))
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

