import React, { useState } from 'react';
import type { RecordItem } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { 
  BarChart3, 
  FileSpreadsheet, 
  FileText, 
  PieChart, 
  TrendingUp, 
  Calendar, 
  Filter,
  DollarSign,
  AlertTriangle,
  Award
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
autoTable;
import ExcelJS from 'exceljs';

interface ReportesProps {
  ingresos: RecordItem[];
  gastos: RecordItem[];
  cuentasPorPagar: RecordItem[];
}

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const ReportesView: React.FC<ReportesProps> = ({ ingresos, gastos, cuentasPorPagar }) => {
  const { formatAmount, currency } = useCurrency();

  const currentYearMonth = new Date().toISOString().slice(0, 7); // "2026-07"
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [reportType, setReportType] = useState<'pyl' | 'flujo' | 'categorias'>('pyl');

  const filterByMonth = (items: RecordItem[]) => {
    if (selectedMonth === 'Todos') return items;
    return items.filter(item => item.fecha && item.fecha.slice(0, 7) === selectedMonth);
  };

  const filteredIngresos = filterByMonth(ingresos);
  const filteredGastos = filterByMonth(gastos);
  const filteredCuentas = filterByMonth(cuentasPorPagar);

  const getFormattedPeriodText = () => {
    if (selectedMonth === 'Todos') return 'Histórico Global';
    const [year, monthStr] = selectedMonth.split('-');
    const monthIndex = parseInt(monthStr, 10) - 1;
    const monthName = NOMBRES_MESES[monthIndex] || monthStr;
    return `${monthName} ${year}`;
  };

  // Cálculos Financieros Estilo BI Executive Dashboard
  const totalIngresos = filteredIngresos.reduce((sum, item) => sum + item.monto, 0);
  const totalGastosDirectos = filteredGastos.reduce((sum, item) => sum + item.monto, 0);
  const totalCuentasPagadas = filteredCuentas.filter(i => i.estado === 'Pagado' || i.estado === 'Completado').reduce((sum, item) => sum + item.monto, 0);
  const totalCuentasPendientes = filteredCuentas.filter(i => i.estado === 'Pendiente').reduce((sum, item) => sum + item.monto, 0);
  
  const totalEgresos = totalGastosDirectos + totalCuentasPagadas;
  const utilidadNeta = totalIngresos - totalEgresos;
  const margenUtilidad = totalIngresos > 0 ? ((utilidadNeta / totalIngresos) * 100).toFixed(1) : '0';
  const ratioCobertura = totalEgresos > 0 ? (totalIngresos / totalEgresos).toFixed(2) : 'N/A';

  const getCategoryBreakdown = () => {
    const map: { [cat: string]: { ingresos: number; gastos: number; cuentas: number } } = {};

    filteredIngresos.forEach(item => {
      if (!map[item.categoria]) map[item.categoria] = { ingresos: 0, gastos: 0, cuentas: 0 };
      map[item.categoria].ingresos += item.monto;
    });

    filteredGastos.forEach(item => {
      if (!map[item.categoria]) map[item.categoria] = { ingresos: 0, gastos: 0, cuentas: 0 };
      map[item.categoria].gastos += item.monto;
    });

    filteredCuentas.forEach(item => {
      if (!map[item.categoria]) map[item.categoria] = { ingresos: 0, gastos: 0, cuentas: 0 };
      map[item.categoria].cuentas += item.monto;
    });

    return Object.keys(map).map(cat => ({
      categoria: cat,
      ingresos: map[cat].ingresos,
      gastos: map[cat].gastos,
      cuentas: map[cat].cuentas,
      totalEgresosCat: map[cat].gastos + map[cat].cuentas,
      participacion: totalEgresos > 0 ? (((map[cat].gastos + map[cat].cuentas) / totalEgresos) * 100).toFixed(1) + '%' : '0%'
    }));
  };

  const categoryBreakdown = getCategoryBreakdown();

  // Exportar PDF Profesional Detallado Transacción por Transacción
  const exportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');

    doc.setFillColor(15, 23, 42); // Slate 900 Dark Accent
    doc.rect(0, 0, 210, 38, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129); // Primary Emerald Accent
    doc.text(`PagaBien ERP - ${getFormattedPeriodText()}`, 14, 16);

    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    const titleText = reportType === 'pyl' ? 'Informe Detallado de Gastos e Ingresos' :
                      reportType === 'flujo' ? 'Informe Detallado de Flujo de Caja' :
                      'Informe Detallado de Distribución de Gastos por Categoría';
    doc.text(titleText, 14, 26);

    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Periodo: ${getFormattedPeriodText()}  |  Moneda: ${currency.name}`, 14, 32);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 44, 58, 22, 3, 3, 'F');
    doc.roundedRect(76, 44, 58, 22, 3, 3, 'F');
    doc.roundedRect(138, 44, 58, 22, 3, 3, 'F');

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('INGRESOS TOTALES', 18, 51);
    doc.text('EGRESOS TOTALES', 80, 51);
    doc.text('UTILIDAD NETA', 142, 51);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(formatAmount(totalIngresos), 18, 60);

    doc.setTextColor(239, 68, 68);
    doc.text(formatAmount(totalEgresos), 80, 60);

    doc.setTextColor(utilidadNeta >= 0 ? 16 : 239, utilidadNeta >= 0 ? 185 : 68, utilidadNeta >= 0 ? 129 : 68);
    doc.text(formatAmount(utilidadNeta), 142, 60);

    let currentY = 74;

    (doc as any).autoTable({
      startY: currentY,
      head: [['RESUMEN EJECUTIVO DE OPERACIONES', 'MONTO CONSOLIDADOS', 'INCIDENCIA %']],
      body: [
        ['(+) Total Ingresos Realizados', formatAmount(totalIngresos), '100.0%'],
        ['(-) Total Gastos Directos', formatAmount(totalGastosDirectos), totalIngresos > 0 ? `${((totalGastosDirectos / totalIngresos) * 100).toFixed(1)}%` : '0%'],
        ['(-) Total Cuentas por Pagar Liquidadas', formatAmount(totalCuentasPagadas), totalIngresos > 0 ? `${((totalCuentasPagadas / totalIngresos) * 100).toFixed(1)}%` : '0%'],
        ['(=) Total Egresos Ejecutados', formatAmount(totalEgresos), totalIngresos > 0 ? `${((totalEgresos / totalIngresos) * 100).toFixed(1)}%` : '0%'],
        ['(=) RESULTADO / BALANCE NETO', formatAmount(utilidadNeta), `${margenUtilidad}%`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8.5 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    if (filteredIngresos.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text('DETALLE ESPECÍFICO DE INGRESOS REALIZADOS', 14, currentY);
      
      (doc as any).autoTable({
        startY: currentY + 3,
        head: [['FECHA', 'DESCRIPCIÓN DE LA TRANSACCIÓN', 'CATEGORÍA', 'ESTADO', 'MONTO']],
        body: filteredIngresos.map(i => [
          i.fecha,
          i.descripcion,
          i.categoria,
          i.estado,
          formatAmount(i.monto)
        ]),
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
        bodyStyles: { fontSize: 8 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    if (filteredGastos.length > 0) {
      if (currentY > 240) {
        doc.addPage();
        currentY = 15;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text('DETALLE ESPECÍFICO DE GASTOS DIRECTOS', 14, currentY);
      
      (doc as any).autoTable({
        startY: currentY + 3,
        head: [['FECHA', 'DESCRIPCIÓN DEL GASTO', 'CATEGORÍA', 'ESTADO', 'MONTO']],
        body: filteredGastos.map(g => [
          g.fecha,
          g.descripcion,
          g.categoria,
          g.estado,
          formatAmount(g.monto)
        ]),
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
        bodyStyles: { fontSize: 8 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    if (filteredCuentas.length > 0) {
      if (currentY > 240) {
        doc.addPage();
        currentY = 15;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(245, 158, 11);
      doc.text('DETALLE ESPECÍFICO DE CUENTAS POR PAGAR (COMPROMISOS)', 14, currentY);
      
      (doc as any).autoTable({
        startY: currentY + 3,
        head: [['FECHA VENC.', 'DESCRIPCIÓN DE LA CUENTA', 'CATEGORÍA', 'ESTADO', 'MONTO']],
        body: filteredCuentas.map(c => [
          c.fecha,
          c.descripcion,
          c.categoria,
          c.estado,
          formatAmount(c.monto)
        ]),
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
        bodyStyles: { fontSize: 8 }
      });
    }

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`PagaBien ERP Suite - Documento Detallado de Gastos e Ingresos (${getFormattedPeriodText()})  |  Página ${i} de ${pageCount}`, 14, 288);
    }

    doc.save(`Informe_Detallado_PagaBien_${getFormattedPeriodText().replace(/\s+/g, '_')}.pdf`);
  };

  // Exportar Excel BI Profesional con Bordes Grid Notables y Alineación Centrada
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PagaBien ERP Suite';
    workbook.created = new Date();

    // Bordes bien marcados oscuros/slates (Negro / Slate 800) para garantizar delineado en Excel
    const solidBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };

    const headerBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF475569' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF475569' } }
    };

    // Helper para aplicar bordes a un rango exacto de celdas combinadas o individuales
    const applyBordersToRange = (ws: ExcelJS.Worksheet, startCol: number, startRow: number, endCol: number, endRow: number, borderStyle: Partial<ExcelJS.Borders>) => {
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          ws.getCell(r, c).border = borderStyle;
        }
      }
    };

    // ----------------------------------------------------
    // HOJA 1: DETALLE TRANSACCIONAL (Pestaña Principal de Datos)
    // ----------------------------------------------------
    const wsDetail = workbook.addWorksheet('Detalle Transacciones', { views: [{ showGridLines: true }] });

    wsDetail.getRow(1).values = ['TIPO', 'FECHA', 'DESCRIPCIÓN', 'CATEGORÍA / CENTRO DE COSTO', 'MONTO', 'ESTADO'];
    const detailHeader = wsDetail.getRow(1);
    detailHeader.font = { name: 'Segoe UI', bold: true, color: { argb: 'FFFFFFFF' } };
    detailHeader.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = headerBorder;
    });

    const allRecords = [
      ...filteredIngresos.map(i => ({ tipo: 'Ingreso', ...i })),
      ...filteredGastos.map(g => ({ tipo: 'Gasto', ...g })),
      ...filteredCuentas.map(c => ({ tipo: 'Cuenta por Pagar', ...c }))
    ];

    let lastDetailRow = 1;

    allRecords.forEach(rec => {
      lastDetailRow++;
      const r = wsDetail.addRow([rec.tipo, rec.fecha, rec.descripcion, rec.categoria, rec.monto, rec.estado]);
      
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(2).alignment = { horizontal: 'center' }; // Fecha centrada
      r.getCell(5).alignment = { horizontal: 'right' };
      r.getCell(6).alignment = { horizontal: 'center' }; // Estado centrado

      r.getCell(5).numFmt = `"${currency.symbol}"#,##0.00`;

      [1, 2, 3, 4, 5, 6].forEach(colIndex => {
        r.getCell(colIndex).border = solidBorder;
      });

      if (rec.tipo === 'Ingreso') {
        r.getCell(1).font = { name: 'Segoe UI', color: { argb: 'FF047857' }, bold: true };
      } else if (rec.tipo === 'Gasto') {
        r.getCell(1).font = { name: 'Segoe UI', color: { argb: 'FFDC2626' }, bold: true };
      } else {
        r.getCell(1).font = { name: 'Segoe UI', color: { argb: 'FFD97706' }, bold: true };
      }
    });

    wsDetail.getColumn(1).width = 18;
    wsDetail.getColumn(2).width = 16;
    wsDetail.getColumn(3).width = 36;
    wsDetail.getColumn(4).width = 28;
    wsDetail.getColumn(5).width = 20;
    wsDetail.getColumn(6).width = 16;

    // ----------------------------------------------------
    // HOJA 2: DASHBOARD EJECUTIVO BI
    // ----------------------------------------------------
    const wsDashboard = workbook.addWorksheet('Dashboard BI', { views: [{ showGridLines: true }] });

    // Banner de Título
    wsDashboard.mergeCells('A1:E2');
    const titleCell = wsDashboard.getCell('A1');
    titleCell.value = `PAGA BIEN ERP - REPORTES FINANCIEROS Y DE GASTOS (${getFormattedPeriodText().toUpperCase()})`;
    titleCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    applyBordersToRange(wsDashboard, 1, 1, 5, 2, headerBorder);

    // Subtítulo
    wsDashboard.mergeCells('A3:E3');
    const subCell = wsDashboard.getCell('A3');
    subCell.value = `Moneda Base: ${currency.name} (${currency.symbol})  |  Fecha de Generación: ${new Date().toLocaleDateString()}`;
    subCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF475569' } };
    subCell.alignment = { horizontal: 'center' };
    applyBordersToRange(wsDashboard, 1, 3, 5, 3, solidBorder);

    // Rango dinámico exacto de datos de la pestaña de Detalle
    const dataRange = lastDetailRow > 1 ? `E2:E${lastDetailRow}` : 'E2:E2';
    const typeRange = lastDetailRow > 1 ? `A2:A${lastDetailRow}` : 'A2:A2';
    const statusRange = lastDetailRow > 1 ? `F2:F${lastDetailRow}` : 'F2:F2';

    // Tarjeta 1: INGRESOS TOTALES
    wsDashboard.mergeCells('A5:B5');
    wsDashboard.getCell('A5').value = 'INGRESOS TOTALES';
    wsDashboard.getCell('A5').font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF047857' } };
    wsDashboard.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
    wsDashboard.getCell('A5').alignment = { horizontal: 'center' };
    applyBordersToRange(wsDashboard, 1, 5, 2, 5, solidBorder);

    wsDashboard.mergeCells('A6:B6');
    wsDashboard.getCell('A6').value = { formula: `SUMIF('Detalle Transacciones'!${typeRange}, "Ingreso", 'Detalle Transacciones'!${dataRange})`, result: totalIngresos };
    wsDashboard.getCell('A6').font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF047857' } };
    wsDashboard.getCell('A6').numFmt = `"${currency.symbol}"#,##0.00`;
    wsDashboard.getCell('A6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
    wsDashboard.getCell('A6').alignment = { horizontal: 'center' };
    applyBordersToRange(wsDashboard, 1, 6, 2, 6, solidBorder);

    // Tarjeta 2: UTILIDAD NETA BI
    wsDashboard.mergeCells('D5:E5');
    wsDashboard.getCell('D5').value = 'UTILIDAD NETA BI';
    wsDashboard.getCell('D5').font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    wsDashboard.getCell('D5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    wsDashboard.getCell('D5').alignment = { horizontal: 'center' };
    applyBordersToRange(wsDashboard, 4, 5, 5, 5, solidBorder);

    wsDashboard.mergeCells('D6:E6');
    wsDashboard.getCell('D6').value = { formula: 'B6-B13', result: utilidadNeta };
    wsDashboard.getCell('D6').font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF0F172A' } };
    wsDashboard.getCell('D6').numFmt = `"${currency.symbol}"#,##0.00`;
    wsDashboard.getCell('D6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    wsDashboard.getCell('D6').alignment = { horizontal: 'center' };
    applyBordersToRange(wsDashboard, 4, 6, 5, 6, solidBorder);

    // Tabla de Estado de Pérdidas y Gastos
    wsDashboard.getRow(9).values = ['CONCEPTO FINANCIERO BI', 'FÓRMULA / MONTO', '% SOBRE INGRESOS', 'ESTADO FISCAL'];
    const row9 = wsDashboard.getRow(9);
    row9.font = { name: 'Segoe UI', bold: true, color: { argb: 'FFFFFFFF' } };
    row9.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = headerBorder;
    });

    const pnlRows = [
      ['(+) Total Ingresos Operativos', { formula: `SUMIF('Detalle Transacciones'!${typeRange}, "Ingreso", 'Detalle Transacciones'!${dataRange})`, result: totalIngresos }, { formula: 'IF(B10>0, B10/B10, 0)', result: 1 }, 'INGRESADO'],
      ['(-) Gastos Directos Operativos', { formula: `SUMIF('Detalle Transacciones'!${typeRange}, "Gasto", 'Detalle Transacciones'!${dataRange})`, result: totalGastosDirectos }, { formula: 'IF(B10>0, B11/B10, 0)', result: totalIngresos > 0 ? totalGastosDirectos / totalIngresos : 0 }, 'PAGADO'],
      ['(-) Cuentas por Pagar Liquidadas', { formula: `SUMIFS('Detalle Transacciones'!${dataRange}, 'Detalle Transacciones'!${typeRange}, "Cuenta por Pagar", 'Detalle Transacciones'!${statusRange}, "Pagado")`, result: totalCuentasPagadas }, { formula: 'IF(B10>0, B12/B10, 0)', result: totalIngresos > 0 ? totalCuentasPagadas / totalIngresos : 0 }, 'LIQUIDADO'],
      ['(=) Total Egresos Consolidados', { formula: 'B11+B12', result: totalEgresos }, { formula: 'IF(B10>0, B13/B10, 0)', result: totalIngresos > 0 ? totalEgresos / totalIngresos : 0 }, 'CONSOLIDADOS'],
      ['(=) RESULTADO NETO DEL EJERCICIO', { formula: 'B10-B13', result: utilidadNeta }, { formula: 'IF(B10>0, B14/B10, 0)', result: totalIngresos > 0 ? utilidadNeta / totalIngresos : 0 }, 'RESULTADO'],
    ];

    pnlRows.forEach((rData, idx) => {
      const addedRow = wsDashboard.addRow(rData);
      addedRow.getCell(1).alignment = { horizontal: 'left' };
      addedRow.getCell(2).alignment = { horizontal: 'right' };
      addedRow.getCell(3).alignment = { horizontal: 'right' };
      addedRow.getCell(4).alignment = { horizontal: 'center' }; // Estado fiscal centrado

      addedRow.getCell(2).numFmt = `"${currency.symbol}"#,##0.00`;
      addedRow.getCell(3).numFmt = '0.0%';

      [1, 2, 3, 4].forEach(col => {
        addedRow.getCell(col).border = solidBorder;
      });

      if (idx === 4) { // Fila Final
        addedRow.font = { name: 'Segoe UI', bold: true, size: 10, color: { argb: 'FF047857' } };
        addedRow.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
          cell.border = solidBorder;
        });
      }
    });

    wsDashboard.getColumn(1).width = 38;
    wsDashboard.getColumn(2).width = 25;
    wsDashboard.getColumn(3).width = 20;
    wsDashboard.getColumn(4).width = 20;

    // ----------------------------------------------------
    // HOJA 3: TABLA DINÁMICA & CENTROS DE COSTO
    // ----------------------------------------------------
    const wsCategories = workbook.addWorksheet('Resumen por Categorías', { views: [{ showGridLines: true }] });

    wsCategories.getRow(1).values = ['CATEGORÍA / CENTRO DE COSTO', 'INGRESOS ($)', 'GASTOS ($)', 'CUENTAS POR PAGAR ($)', 'TOTAL EGRESOS ($)', '% PARTICIPACIÓN'];
    const catHeader = wsCategories.getRow(1);
    catHeader.font = { name: 'Segoe UI', bold: true, color: { argb: 'FFFFFFFF' } };
    catHeader.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = headerBorder;
    });

    const totalEgresosSum = categoryBreakdown.reduce((s, c) => s + c.totalEgresosCat, 0);

    categoryBreakdown.forEach((c, idx) => {
      const rowNum = idx + 2;
      const r = wsCategories.addRow([
        c.categoria,
        c.ingresos,
        c.gastos,
        c.cuentas,
        { formula: `C${rowNum}+D${rowNum}`, result: c.totalEgresosCat },
        { formula: `E${rowNum}/SUM(E:E)`, result: totalEgresosSum > 0 ? c.totalEgresosCat / totalEgresosSum : 0 }
      ]);

      r.getCell(1).alignment = { horizontal: 'left' };
      r.getCell(2).alignment = { horizontal: 'right' };
      r.getCell(3).alignment = { horizontal: 'right' };
      r.getCell(4).alignment = { horizontal: 'right' };
      r.getCell(5).alignment = { horizontal: 'right' };
      r.getCell(6).alignment = { horizontal: 'center' }; // % Participación centrado

      r.getCell(2).numFmt = `"${currency.symbol}"#,##0.00`;
      r.getCell(3).numFmt = `"${currency.symbol}"#,##0.00`;
      r.getCell(4).numFmt = `"${currency.symbol}"#,##0.00`;
      r.getCell(5).numFmt = `"${currency.symbol}"#,##0.00`;
      r.getCell(6).numFmt = '0.0%';

      [1, 2, 3, 4, 5, 6].forEach(col => {
        r.getCell(col).border = solidBorder;
      });
    });

    wsCategories.getColumn(1).width = 30;
    wsCategories.getColumn(2).width = 20;
    wsCategories.getColumn(3).width = 20;
    wsCategories.getColumn(4).width = 22;
    wsCategories.getColumn(5).width = 22;
    wsCategories.getColumn(6).width = 20;

    // Descargar el libro ExcelJS con bordes notables y alineaciones centradas
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Informe_Excel_BI_PagaBien_${getFormattedPeriodText().replace(/\s+/g, '_')}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-container">
      {/* Header con Selector de Mes y Acciones BI */}
      <div className="module-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="module-header-info">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Informes y Analítica BI</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Business Intelligence ERP: Indicadores de rendimiento, informes ejecutivos y exportación oficial</p>
        </div>

        {/* Filtro por Mes */}
        <div className="module-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <Calendar size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Periodo:</span>
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
                (Ver Todos)
              </button>
            )}
          </div>

          <button className="btn btn-primary" onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} /> Descargar PDF BI
          </button>
          <button className="btn btn-secondary" onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={16} /> Descargar Excel BI
          </button>
        </div>
      </div>

      {/* KPI Cards BI Estilo Power BI Executive Summary */}
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* KPI 1: Márgen de Utilidad */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>MÁRGEN DE UTILIDAD</span>
            <Award size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>
            {margenUtilidad}%
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Eficiencia sobre ingresos</p>
        </div>

        {/* KPI 2: Ratio de Cobertura */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>RATIO DE COBERTURA</span>
            <TrendingUp size={18} style={{ color: 'var(--secondary)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--secondary)' }}>
            {ratioCobertura}x
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Ingresos vs Egresos</p>
        </div>

        {/* KPI 3: Utilidad Neta */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>RESULTADO NETO</span>
            <DollarSign size={18} style={{ color: utilidadNeta >= 0 ? 'var(--primary)' : 'var(--danger-text)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: utilidadNeta >= 0 ? 'var(--primary)' : 'var(--danger-text)' }}>
            {formatAmount(utilidadNeta)}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Balance neto del periodo</p>
        </div>

        {/* KPI 4: Compromisos Pendientes */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>POR PAGAR PENDIENTE</span>
            <AlertTriangle size={18} style={{ color: 'var(--warning-text)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--warning-text)' }}>
            {formatAmount(totalCuentasPendientes)}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Pasivos pendientes de pago</p>
        </div>

      </div>

      {/* Tarjetas de Selección de Tipo de Reporte BI */}
      <div className="bi-report-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* P&L / Gastos */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '20px', 
            cursor: 'pointer', 
            border: reportType === 'pyl' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            transition: 'all 0.2s'
          }}
          onClick={() => setReportType('pyl')}
        >
          <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '10px', borderRadius: '10px', width: 'fit-content', marginBottom: '12px' }}>
            <TrendingUp size={22} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>Informe de Gastos & Balance</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Resultados netos comparando los ingresos contra los egresos totales ejecutados.
          </p>
        </div>

        {/* Flujo de Caja */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '20px', 
            cursor: 'pointer', 
            border: reportType === 'flujo' ? '2px solid var(--secondary)' : '1px solid var(--border-color)',
            transition: 'all 0.2s'
          }}
          onClick={() => setReportType('flujo')}
        >
          <div style={{ background: 'var(--secondary-light)', color: 'var(--secondary)', padding: '10px', borderRadius: '10px', width: 'fit-content', marginBottom: '12px' }}>
            <BarChart3 size={22} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>Flujo de Caja & Liquidez</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Análisis de liquidez disponible, egresos realizados y pasivos pendientes.
          </p>
        </div>

        {/* Por Categorías */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '20px', 
            cursor: 'pointer', 
            border: reportType === 'categorias' ? '2px solid var(--warning)' : '1px solid var(--border-color)',
            transition: 'all 0.2s'
          }}
          onClick={() => setReportType('categorias')}
        >
          <div style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)', padding: '10px', borderRadius: '10px', width: 'fit-content', marginBottom: '12px' }}>
            <PieChart size={22} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>Distribución de Centros de Costo</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Desglose analítico y porcentaje de participación de cada categoría.
          </p>
        </div>

      </div>

      {/* Tabla Dinámica BI Ejecutiva del Reporte Seleccionado */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} style={{ color: 'var(--primary)' }} />
          Informe BI Interactivo: {
            reportType === 'pyl' ? 'Informe de Gastos' :
            reportType === 'flujo' ? 'Flujo de Caja' : 'Desglose por Categorías'
          } ({getFormattedPeriodText()})
        </h3>

        <div className="table-responsive-wrapper">
          {reportType === 'pyl' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
              <tr style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>Concepto Financiero</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-muted)', textAlign: 'right' }}>Monto ({currency.symbol})</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-muted)', textAlign: 'right' }}>% Incidencia</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '14px 18px', fontWeight: 600 }}>(+) Total Ingresos de Operación</td>
                <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                  {formatAmount(totalIngresos)}
                </td>
                <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700 }}>100%</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '14px 18px', fontWeight: 600 }}>(-) Gastos Directos Operativos</td>
                <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--danger-text)' }}>
                  {formatAmount(totalGastosDirectos)}
                </td>
                <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--danger-text)' }}>
                  {totalIngresos > 0 ? `${((totalGastosDirectos / totalIngresos) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '14px 18px', fontWeight: 600 }}>(-) Cuentas por Pagar Liquidadas</td>
                <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--info-text)' }}>
                  {formatAmount(totalCuentasPagadas)}
                </td>
                <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--info-text)' }}>
                  {totalIngresos > 0 ? `${((totalCuentasPagadas / totalIngresos) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}>
                <td style={{ padding: '14px 18px', fontWeight: 800 }}>(=) Total Egresos Consolidados</td>
                <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 800, color: 'var(--danger-text)' }}>
                  {formatAmount(totalEgresos)}
                </td>
                <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 800, color: 'var(--danger-text)' }}>
                  {totalIngresos > 0 ? `${((totalEgresos / totalIngresos) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
              <tr style={{ background: 'var(--primary-light)' }}>
                <td style={{ padding: '16px 18px', fontWeight: 800, fontSize: '1.1rem' }}>(=) RESULTADO NETO DEL EJERCICIO</td>
                <td style={{ padding: '16px 18px', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: utilidadNeta >= 0 ? 'var(--primary)' : 'var(--danger-text)' }}>
                  {formatAmount(utilidadNeta)}
                </td>
                <td style={{ padding: '16px 18px', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>
                  {margenUtilidad}%
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {reportType === 'flujo' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>Flujo de Caja</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-muted)', textAlign: 'right' }}>Monto ({currency.symbol})</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-muted)', textAlign: 'center' }}>Estado de Caja</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '14px 18px', fontWeight: 600 }}>Entradas por Ingresos Efectivos</td>
                <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                  {formatAmount(totalIngresos)}
                </td>
                <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                  <span className="badge badge-success">Ingresado</span>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '14px 18px', fontWeight: 600 }}>Salidas por Gastos Operativos</td>
                <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--danger-text)' }}>
                  {formatAmount(totalGastosDirectos)}
                </td>
                <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                  <span className="badge badge-danger">Pagado</span>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '14px 18px', fontWeight: 600 }}>Salidas por Cuentas Liquidadas</td>
                <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--info-text)' }}>
                  {formatAmount(totalCuentasPagadas)}
                </td>
                <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                  <span className="badge badge-info">Liquidado</span>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '14px 18px', fontWeight: 600 }}>Obligaciones Pendientes por Pagar</td>
                <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--warning-text)' }}>
                  {formatAmount(totalCuentasPendientes)}
                </td>
                <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                  <span className="badge badge-warning">Por Vencer</span>
                </td>
              </tr>
              <tr style={{ background: 'var(--primary-light)' }}>
                <td style={{ padding: '16px 18px', fontWeight: 800, fontSize: '1.1rem' }}>Flujo Neto Disponible</td>
                <td style={{ padding: '16px 18px', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: utilidadNeta >= 0 ? 'var(--primary)' : 'var(--danger-text)' }}>
                  {formatAmount(utilidadNeta)}
                </td>
                <td style={{ padding: '16px 18px', textAlign: 'center' }}>
                  <span className="badge badge-success">Disponible</span>
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {reportType === 'categorias' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>Categoría / Centro de Costo</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-muted)', textAlign: 'right' }}>Ingresos</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-muted)', textAlign: 'right' }}>Gastos</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-muted)', textAlign: 'right' }}>Cuentas por Pagar</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-muted)', textAlign: 'right' }}>Participación (%)</th>
              </tr>
            </thead>
            <tbody>
              {categoryBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No hay datos registrados en el periodo seleccionado.
                  </td>
                </tr>
              ) : (
                categoryBreakdown.map((c) => (
                  <tr key={c.categoria} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 600 }}>{c.categoria}</td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                      {formatAmount(c.ingresos)}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--danger-text)' }}>
                      {formatAmount(c.gastos)}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--warning-text)' }}>
                      {formatAmount(c.cuentas)}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--info-text)' }}>
                      {c.participacion}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
        </div>
      </div>
    </div>
  );
};
