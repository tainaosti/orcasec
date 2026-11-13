import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Lê números no formato brasileiro: "14.000", "14000", "1,5", "R$ 14.000,50".
 * Retorna null quando o texto não é um número válido.
 */
export function lerNumeroBR(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;

  let texto = String(valor).trim().replace(/^R\$\s*/i, '');
  if (!texto) return null;

  if (texto.includes(',')) {
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
    texto = texto.replace(/\./g, '');
  }

  if (!/^-?\d+(\.\d+)?$/.test(texto)) return null;
  return Number(texto);
}

/** Rejeita caracteres de marcação (< e >), primeira barreira contra XSS. */
export function semMarcacao(): ValidatorFn {
  return (controle: AbstractControl): ValidationErrors | null => {
    const valor = controle.value;
    return typeof valor === 'string' && /[<>]/.test(valor) ? { marcacao: true } : null;
  };
}

/** Exige um número (no formato brasileiro) maior que zero. */
export function numeroPositivo(): ValidatorFn {
  return (controle: AbstractControl): ValidationErrors | null => {
    if (controle.value === null || controle.value === '') return null;
    const numero = lerNumeroBR(controle.value);
    return numero !== null && numero > 0 ? null : { positivo: true };
  };
}

/** Exige um número entre mínimo e máximo, inclusive. */
export function numeroEntre(minimo: number, maximo: number): ValidatorFn {
  return (controle: AbstractControl): ValidationErrors | null => {
    if (controle.value === null || controle.value === '') return null;
    const numero = lerNumeroBR(controle.value);
    return numero !== null && numero >= minimo && numero <= maximo ? null : { intervalo: true };
  };
}
