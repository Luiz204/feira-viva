import { describe, expect, it } from 'vitest'
import { brl, diasSemana, horario, telefone } from './format'

describe('formatação', () => {
  it('CT35: moeda em reais', () => {
    expect(brl(1234.5)).toBe('R$ 1.234,50')
  })
  it('CT36: dias da feira e horário', () => {
    expect(diasSemana([3, 6])).toBe('Qua, Sáb')
    expect(horario('05:30:00', '11:00:00')).toBe('05:30 às 11:00')
  })
  it('CT37: telefone legível', () => {
    expect(telefone('5586999991234')).toBe('(86) 99999-1234')
  })
})
