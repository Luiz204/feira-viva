const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function brl(valor: number | string): string {
  // Intl usa espaço não separável entre "R$" e o número; trocamos por espaço comum.
  return brlFormatter.format(Number(valor)).replace(/ /g, ' ')
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function diasSemana(dias: number[]): string {
  if (dias.length === 0) return 'Dias a definir'
  return dias.map((d) => DIAS[d]).join(', ')
}

export function horario(inicio: string, fim: string): string {
  return `${inicio.slice(0, 5)} às ${fim.slice(0, 5)}`
}

/** "5586999991234" -> "(86) 99999-1234" */
export function telefone(numero: string | null): string {
  if (!numero) return ''
  const d = numero.replace(/^55/, '')
  const meio = d.length === 11 ? d.slice(2, 7) : d.slice(2, 6)
  return `(${d.slice(0, 2)}) ${meio}-${d.slice(-4)}`
}

export function quantidade(q: number): string {
  return String(Number(q.toFixed(3))).replace('.', ',')
}
