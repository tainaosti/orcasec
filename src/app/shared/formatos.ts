/** Formata valores como "R$ 12.960". */
export function moeda(valor: number): string {
  return 'R$ ' + Math.round(valor).toLocaleString('pt-BR');
}

/** Formata uma faixa como "R$ 12.960 a R$ 15.840". */
export function faixa(minimo: number, maximo: number): string {
  return `${moeda(minimo)} a ${moeda(maximo)}`;
}

/** Formata horas como "72 horas" ou "1 hora". */
export function horas(valor: number): string {
  const texto = valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return valor === 1 ? `${texto} hora` : `${texto} horas`;
}

/** Formata fatores como "1,5". */
export function numero(valor: number): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

export function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function dataHora(iso: string): string {
  const data = new Date(iso);
  return `${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}
