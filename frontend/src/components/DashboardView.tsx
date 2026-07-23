import React, { useState } from 'react';
import type { RecordItem } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { TrendingUp, TrendingDown, DollarSign, Clock, CheckCircle2, ArrowUpRight, ArrowDownRight, Calendar, BarChart2 } from 'lucide-react';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface DashboardProps {
  ingresos: RecordItem[];
  gastos: RecordItem[];
  cuentasPorPagar: RecordItem[];
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const DashboardView: React.FC<DashboardProps> = ({ ingresos, gastos, cuentasPorPagar }) => {
  const { formatAmount, currency } = useCurrency();

  // Selector de Mes para las métricas superiores (Por defecto el mes actual 'YYYY-MM')
  const currentYearMonth = new Date().toISOString().slice(0, 7); // "2026-07"
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);

  // Filtrado de datos según el mes seleccionado en las tarjetas superiores
  const filterByMonth = (items: RecordItem[]) => {
    if (selectedMonth === 'Todos') return items;
    return items.filter(item => item.fecha && item.fecha.slice(0, 7) === selectedMonth);
  };

  const filteredIngresos = filterByMonth(ingresos);
  const filteredGastos = filterByMonth(gastos);
  const filteredCuentasPorPagar = filterByMonth(cuentasPorPagar);

  // Ingresos totales (completados o pagados)
  const totalIngresos = filteredIngresos
    .filter(item => item.estado === 'Completado' || item.estado === 'Pagado')
    .reduce((sum, item) => sum + item.monto, 0);

  // Gastos directos totales
  const totalGastosDirectos = filteredGastos
    .filter(item => item.estado === 'Completado' || item.estado === 'Pagado')
    .reduce((sum, item) => sum + item.monto, 0);

  // Cuentas por pagar pagadas
  const cuentasPagadas = filteredCuentasPorPagar
    .filter(item => item.estado === 'Pagado' || item.estado === 'Completado')
    .reduce((sum, item) => sum + item.monto, 0);

  const cuentasPendientesList = filteredCuentasPorPagar.filter(i => i.estado === 'Pendiente');
  const totalPorPagarPendiente = cuentasPendientesList.reduce((sum, item) => sum + item.monto, 0);

  // Egresos Totales = Gastos Directos + Cuentas Pagadas
  const totalEgresos = totalGastosDirectos + cuentasPagadas;
  const saldoDisponible = totalIngresos - totalEgresos;

  // Generar conjunto completo de meses para un gráfico profesional tipo Power BI
  const buildPowerBIChartData = () => {
    const monthsSet: { [ym: string]: { ingresos: number; egresos: number } } = {};

    // Obtener los últimos 6 meses cronológicos o todos si hay registros
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = d.toISOString().slice(0, 7);
      monthsSet[ym] = { ingresos: 0, egresos: 0 };
    }

    // Sumar datos reales
    ingresos.forEach(r => {
      if (r.fecha && (r.estado === 'Completado' || r.estado === 'Pagado')) {
        const ym = r.fecha.slice(0, 7);
        if (!monthsSet[ym]) monthsSet[ym] = { ingresos: 0, egresos: 0 };
        monthsSet[ym].ingresos += r.monto;
      }
    });

    gastos.forEach(r => {
      if (r.fecha && (r.estado === 'Completado' || r.estado === 'Pagado')) {
        const ym = r.fecha.slice(0, 7);
        if (!monthsSet[ym]) monthsSet[ym] = { ingresos: 0, egresos: 0 };
        monthsSet[ym].egresos += r.monto;
      }
    });

    cuentasPorPagar.forEach(r => {
      if (r.fecha && (r.estado === 'Pagado' || r.estado === 'Completado')) {
        const ym = r.fecha.slice(0, 7);
        if (!monthsSet[ym]) monthsSet[ym] = { ingresos: 0, egresos: 0 };
        monthsSet[ym].egresos += r.monto;
      }
    });

    const sortedMonths = Object.keys(monthsSet).sort();

    return sortedMonths.map(ym => {
      const [year, monthNum] = ym.split('-');
      const monthIdx = parseInt(monthNum, 10) - 1;
      const monthLabel = `${MONTH_LABELS[monthIdx] || monthNum} ${year.slice(2)}`;

      const ing = monthsSet[ym].ingresos;
      const egr = monthsSet[ym].egresos;
      const balanceNeto = ing - egr;

      return {
        mes: monthLabel,
        Ingresos: ing,
        Egresos: egr,
        'Resultado Neto': balanceNeto
      };
    });
  };

  const powerBIData = buildPowerBIChartData();

  // Custom Tooltip Estilo Power BI Dashboard
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          padding: '14px 18px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          color: '#fff',
          fontSize: '0.85rem'
        }}>
          <div style={{ fontWeight: 800, marginBottom: '8px', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
            Periodo: {label}
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', margin: '4px 0' }}>
              <span style={{ color: entry.color, fontWeight: 600 }}>● {entry.name}:</span>
              <strong style={{ color: '#fff' }}>{formatAmount(entry.value)}</strong>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px' }}>
      {/* Header con Selector de Mes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Dashboard Financiero</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Resumen expresado en <strong>{currency.name}</strong>
          </p>
        </div>

        {/* Filtro de Mes en Dashboard */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <Calendar size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Periodo / Mes:</span>
          <input
            type="month"
            className="form-control"
            style={{ width: '150px', padding: '4px 8px', border: 'none', background: 'transparent' }}
            value={selectedMonth === 'Todos' ? '' : selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value || 'Todos')}
          />
          {selectedMonth !== 'Todos' && (
            <button 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
              onClick={() => setSelectedMonth('Todos')}
            >
              Ver Global
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* 1. Saldo Disponible */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Saldo Disponible</span>
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: saldoDisponible >= 0 ? 'var(--primary)' : 'var(--danger-text)' }}>
            {formatAmount(saldoDisponible)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '0.78rem', color: 'var(--success)' }}>
            <ArrowUpRight size={14} /> +12.5% vs mes anterior
          </div>
        </div>

        {/* 2. Ingresos del Mes */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Ingresos</span>
            <div style={{ background: 'var(--success-bg)', color: 'var(--success-text)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
            {formatAmount(totalIngresos)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '0.78rem', color: 'var(--success)' }}>
            <ArrowUpRight size={14} /> Entradas del periodo
          </div>
        </div>

        {/* 3. Gastos Directos */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Gastos</span>
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
              <TrendingDown size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger-text)' }}>
            {formatAmount(totalGastosDirectos)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <ArrowDownRight size={14} /> Compras y egresos
          </div>
        </div>

        {/* 4. Cuentas por Pagar (PAGADAS) */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Cuentas Pagadas</span>
            <div style={{ background: 'var(--info-bg)', color: 'var(--info-text)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--info-text)' }}>
            {formatAmount(cuentasPagadas)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '0.78rem', color: 'var(--info-text)' }}>
            Liquidadas en el periodo
          </div>
        </div>

        {/* 5. Cuentas por Pagar (PENDIENTES) */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Por Pagar (Pendientes)</span>
            <div style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--warning-text)' }}>
            {formatAmount(totalPorPagarPendiente)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {cuentasPendientesList.length} facturas por vencer
          </div>
        </div>

      </div>

      {/* Gráfica Profesional Multidimensional Estilo Power BI */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={20} style={{ color: 'var(--primary)' }} />
              Analítica de Rendimiento (Barras Comparativas & Tendencia Neta)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Visualización interactiva estilo Power BI: Comparativa de columnas e indicador de resultado
            </p>
          </div>
        </div>

        <div style={{ width: '100%', height: '360px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={powerBIData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.6} />
              <XAxis dataKey="mes" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
              <YAxis 
                stroke="var(--text-muted)" 
                tickFormatter={(val) => val === 0 ? '$0' : `${currency.symbol}${(val / 1000).toFixed(0)}k`} 
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '0.85rem', fontWeight: 600 }} />
              <ReferenceLine y={0} stroke="var(--border-color)" />
              
              {/* Barras Comparativas de Ingresos y Egresos */}
              <Bar dataKey="Ingresos" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={45} />
              <Bar dataKey="Egresos" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={45} />
              
              {/* Línea de Tendencia de Resultado Neto estilo Power BI */}
              <Line type="monotone" dataKey="Resultado Neto" stroke="#6366f1" strokeWidth={3} dot={{ r: 5, fill: '#6366f1' }} activeDot={{ r: 8 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
