/**
 * O desenho dos símbolos. Cada não-terminal tem uma forma, pela ordem em que
 * aparece na gramática — círculo, triângulo, quadrado, losango, pentágono,
 * hexágono —, então o anel de um garfo e o gancho que o aceita são a mesma
 * forma. Terminais são etiquetas com o nome da categoria.
 */

const poligono = (lados: number, x: number, y: number, r: number, giroGraus: number): string =>
  Array.from({ length: lados }, (_, k) => {
    const a = ((giroGraus + (360 / lados) * k) * Math.PI) / 180
    return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`
  }).join(" ")

export const Forma = ({ indice, x, y, r, classe }: { indice: number; x: number; y: number; r: number; classe: string }) => {
  switch (indice % 6) {
    case 0:
      return <circle cx={x} cy={y} r={r} className={classe} />
    case 1:
      return <polygon points={poligono(3, x, y + r * 0.2, r * 1.25, -90)} className={classe} />
    case 2:
      return <polygon points={poligono(4, x, y, r * 1.2, 45)} className={classe} />
    case 3:
      return <polygon points={poligono(4, x, y, r * 1.25, 0)} className={classe} />
    case 4:
      return <polygon points={poligono(5, x, y, r * 1.15, -90)} className={classe} />
    default:
      return <polygon points={poligono(6, x, y, r * 1.1, 0)} className={classe} />
  }
}

/**
 * O ramo de um garfo, do anel até uma ponta. Sai do anel descendo a prumo e
 * chega à ponta descendo a prumo, com a curva no meio; ponta bem embaixo do
 * anel dá reta.
 */
export const curvaDoRamo = (x1: number, y1: number, x2: number, y2: number): string => {
  const meio = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${meio} ${x2} ${meio} ${x2} ${y2}`
}

/** Forma do não-terminal com o nome dele dentro. */
export const NaoTerminal = ({
  indice,
  nome,
  x,
  y,
  r,
  classe,
  classeRotulo = "rotulo"
}: {
  indice: number
  nome: string
  x: number
  y: number
  r: number
  classe: string
  classeRotulo?: string
}) => (
  <>
    <Forma indice={indice} x={x} y={y} r={r} classe={classe} />
    <text x={x} y={y + (indice % 6 === 1 ? r * 0.45 : 0) + r * 0.36} className={classeRotulo}>
      {nome}
    </text>
  </>
)

/** Caixinha com texto, para terminais e tokens. A largura acompanha o texto. */
export const Etiqueta = ({
  texto,
  x,
  y,
  altura = 22,
  porLetra = 8,
  classe,
  classeTexto
}: {
  texto: string
  x: number
  y: number
  altura?: number
  porLetra?: number
  classe: string
  classeTexto: string
}) => {
  const largura = Math.max(altura, texto.length * porLetra + altura * 0.55)
  return (
    <>
      <rect x={x - largura / 2} y={y - altura / 2} width={largura} height={altura} rx={altura * 0.28} className={classe} />
      <text x={x} y={y + altura * 0.18} className={classeTexto}>
        {texto}
      </text>
    </>
  )
}
