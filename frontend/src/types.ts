export interface Currency {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'Dólar Estadounidense (USD)', locale: 'en-US' },
  { code: 'COP', symbol: '$', name: 'Peso Colombiano (COP)', locale: 'es-CO' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)', locale: 'de-DE' },
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano (MXN)', locale: 'es-MX' },
  { code: 'PEN', symbol: 'S/', name: 'Sol Peruano (PEN)', locale: 'es-PE' },
  { code: 'CLP', symbol: '$', name: 'Peso Chileno (CLP)', locale: 'es-CL' },
  { code: 'ARS', symbol: '$', name: 'Peso Argentino (ARS)', locale: 'es-AR' },
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileño (BRL)', locale: 'pt-BR' },
];

export interface RecordItem {
  id: string;
  fecha: string;
  descripcion: string;
  categoria: string;
  monto: number;
  estado: 'Pendiente' | 'Completado' | 'Pagado';
  comprobanteUrl?: string;
}

export type ModuleType = 
  | 'dashboard' 
  | 'ingresos' 
  | 'gastos' 
  | 'cuentas-por-pagar' 
  | 'reportes' 
  | 'configuracion';
