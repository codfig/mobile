import type { Categoria } from "./gramatica.js"
import type { Medidas, Posicionado } from "./layout.js"
import { achatar } from "./layout.js"

/** Uma forma por categoria de símbolo: o encaixe é visível antes de ser tentado. */
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

export const Sala = ({
  raiz,
  m,
  tokens,
  temRegraNaMao,
  aoTocarGancho,
  aoTocarGarfo
}: {
  raiz: Posicionado
  m: Medidas
  tokens: ReadonlyArray<Categoria>
  temRegraNaMao: boolean
  aoTocarGancho: (id: string) => void
  aoTocarGarfo: (id: string) => void
}) => {
  const nos = achatar(raiz)

  return (
    <svg
      className="sala"
      viewBox={`0 0 ${m.largura} ${m.altura}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Sala onde a árvore é pendurada"
    >
      {/* teto e chão */}
      <line x1={12} y1={m.tetoY - 22} x2={m.largura - 12} y2={m.tetoY - 22} className="viga" />
      <line x1={12} y1={m.chaoY + 30} x2={m.largura - 12} y2={m.chaoY + 30} className="viga" />
      <line x1={raiz.x} y1={m.tetoY - 22} x2={raiz.x} y2={raiz.y} className="ramo" />

      {/* vão que cada gancho livre ainda precisa cobrir */}
      {nos.map((p) =>
        p.vao === null ? null : (
          <line
            key={`vao-${p.no.id}`}
            x1={m.xToken(p.vao[0])}
            y1={m.chaoY - 26}
            x2={m.xToken(p.vao[1])}
            y2={m.chaoY - 26}
            className="vao"
          />
        )
      )}

      {/* ramos do garfo até cada filho */}
      {nos.flatMap((p) =>
        p.filhos.map((f) => (
          <line key={`ramo-${f.no.id}`} x1={p.x} y1={p.y} x2={f.x} y2={f.y} className="ramo" />
        ))
      )}

      {/* descida das folhas até o chão, e do ε até a fresta */}
      {nos.map((p) =>
        p.no._tag === "Folha" ? (
          <line key={`desce-${p.no.id}`} x1={p.x} y1={p.y} x2={p.x} y2={m.chaoY - 20} className="ramo esticado" />
        ) : p.no._tag === "Vazio" ? (
          <line key={`desce-${p.no.id}`} x1={p.x} y1={p.y} x2={p.x} y2={m.chaoY} className="ramo vazio" />
        ) : null
      )}

      {/* tokens do chão: nunca se movem */}
      {tokens.map((t, i) => (
        <g key={`tok-${i}`}>
          <Forma tipo={t} x={m.xToken(i)} y={m.chaoY} r={15} classe="token" />
          <text x={m.xToken(i)} y={m.chaoY + 5} className="rotulo-token">
            {t}
          </text>
        </g>
      ))}

      {/* nós da árvore */}
      {nos.map((p) => {
        const no = p.no
        switch (no._tag) {
          case "Gancho":
            return (
              <g
                key={no.id}
                onClick={() => aoTocarGancho(no.id)}
                className={temRegraNaMao ? "no gancho chamando" : "no gancho"}
              >
                <circle cx={p.x} cy={p.y} r={24} className="alvo" />
                <Forma tipo="naoTerminal" x={p.x} y={p.y} r={13} classe="peca livre" />
                <text x={p.x} y={p.y + 4} className="rotulo">S</text>
              </g>
            )
          case "Garfo":
            return (
              <g key={no.id} onClick={() => aoTocarGarfo(no.id)} className="no garfo">
                <circle cx={p.x} cy={p.y} r={24} className="alvo" />
                <Forma tipo="naoTerminal" x={p.x} y={p.y} r={13} classe="peca" />
                <text x={p.x} y={p.y + 4} className="rotulo">S</text>
              </g>
            )
          case "Folha":
            return (
              <g key={no.id} className="no">
                <Forma tipo={no.categoria} x={p.x} y={p.y} r={11} classe="peca folha" />
              </g>
            )
          case "Vazio":
            return (
              <text key={no.id} x={p.x} y={p.y + 5} className="epsilon">
                ε
              </text>
            )
        }
      })}
    </svg>
  )
}
