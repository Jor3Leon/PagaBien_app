import React, { useState } from 'react';
import type { RecordItem } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { Search, Plus, RefreshCw, Edit2, Trash2, FileText, Filter, Calendar } from 'lucide-react';

interface SharedModuleProps {
  title: string;
  subtitle: string;
  data: RecordItem[];
  onAdd: (item: Partial<RecordItem>) => void;
  onEdit: (item: RecordItem) => void;
  onDelete: (id: string) => void;
  categories: string[];
}

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const SharedModuleView: React.FC<SharedModuleProps> = ({
  title,
  subtitle,
  data,
  onAdd,
  onEdit,
  onDelete,
  categories
}) => {
  const { formatAmount, currency } = useCurrency();
  const { setIsSyncModalOpen } = useGoogleAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  
  // Mes y Año seleccionado (Por defecto el mes actual 'YYYY-MM')
  const currentYearMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-07"
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RecordItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    descripcion: '',
    monto: '',
    categoria: categories[0] || 'General',
    fecha: new Date().toISOString().split('T')[0],
    estado: 'Completado' as RecordItem['estado']
  });

  // Filtrar por Mes/Año seleccionado, búsqueda y categoría
  const filteredData = data.filter(item => {
    const itemYearMonth = item.fecha ? item.fecha.slice(0, 7) : '';
    const matchesMonth = selectedMonth === 'Todos' || itemYearMonth === selectedMonth;
    const matchesSearch = item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || item.categoria === selectedCategory;
    
    return matchesMonth && matchesSearch && matchesCategory;
  });

  // Calcular total acumulado del mes seleccionado
  const totalMes = filteredData.reduce((sum, item) => sum + item.monto, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      onEdit({
        ...editingItem,
        descripcion: formData.descripcion,
        monto: parseFloat(formData.monto) || 0,
        categoria: formData.categoria,
        fecha: formData.fecha,
        estado: formData.estado
      });
    } else {
      onAdd({
        descripcion: formData.descripcion,
        monto: parseFloat(formData.monto) || 0,
        categoria: formData.categoria,
        fecha: formData.fecha,
        estado: formData.estado
      });
    }
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      descripcion: '',
      monto: '',
      categoria: categories[0] || 'General',
      fecha: new Date().toISOString().split('T')[0],
      estado: 'Completado'
    });
  };

  const handleOpenEdit = (item: RecordItem) => {
    setEditingItem(item);
    setFormData({
      descripcion: item.descripcion,
      monto: item.monto.toString(),
      categoria: item.categoria,
      fecha: item.fecha,
      estado: item.estado
    });
    setShowModal(true);
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="module-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div className="module-header-info">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{title}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{subtitle}</p>
        </div>
        <div className="module-header-actions" style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => setIsSyncModalOpen(true)}>
            <RefreshCw size={16} /> Sincronizar Google Sheets
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => { resetForm(); setShowModal(true); }}
          >
            <Plus size={18} /> Nuevo Registro
          </button>
        </div>
      </div>

      {/* Selector de Mes & Control Bar */}
      <div className="glass-card filter-bar" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        
        {/* Selector de Mes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-hover)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <Calendar size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Mes:</span>
          <input
            type="month"
            className="form-control"
            style={{ width: '150px', padding: '4px 8px', border: 'none', background: 'transparent' }}
            value={selectedMonth === 'Todos' ? '' : selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value || 'Todos')}
          />
          {selectedMonth !== 'Todos' && (
            <button 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
              onClick={() => setSelectedMonth('Todos')}
            >
              (Ver Todos)
            </button>
          )}
        </div>

        {/* Buscador */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '38px' }}
            placeholder="Buscar por descripción o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filtro por Categoría */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <select 
            className="form-control" 
            style={{ width: '180px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="Todas">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Resumen Total del Mes Filtrado */}
        <div style={{ background: 'var(--primary-light)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid ' + (title.includes('Gastos') || title.includes('Pagar') ? 'var(--danger)' : 'var(--primary-border)') }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Filtrado: </span>
          <strong style={{ color: title.includes('Gastos') || title.includes('Pagar') ? 'var(--danger-text)' : 'var(--primary)', fontSize: '0.95rem' }}>{formatAmount(totalMes)}</strong>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card table-responsive-wrapper" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '14px 18px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Fecha</th>
              <th style={{ padding: '14px 18px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Descripción</th>
              <th style={{ padding: '14px 18px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Categoría</th>
              <th style={{ padding: '14px 18px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Estado</th>
              <th style={{ padding: '14px 18px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>Monto ({currency.symbol})</th>
              <th style={{ padding: '14px 18px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No se encontraron registros para el periodo/filtro seleccionado.
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '14px 18px', fontSize: '0.9rem' }}>{item.fecha}</td>
                  <td style={{ padding: '14px 18px', fontSize: '0.9rem', fontWeight: 600 }}>{item.descripcion}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span className="badge badge-info">{item.categoria}</span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span className={`badge ${
                      item.estado === 'Completado' || item.estado === 'Pagado' ? 'badge-success' : 'badge-warning'
                    }`}>
                      {item.estado}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: '0.95rem', fontWeight: 700, textAlign: 'right' }}>
                    {formatAmount(item.monto)}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <button className="btn-icon" title="Comprobante" onClick={() => alert('Comprobante adjuntado correctamente')}>
                      <FileText size={16} />
                    </button>
                    <button className="btn-icon" title="Editar" onClick={() => handleOpenEdit(item)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-icon" title="Eliminar" onClick={() => onDelete(item.id)} style={{ color: 'var(--danger)' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '16px', fontSize: '1.25rem', fontWeight: 700 }}>
              {editingItem ? 'Editar Registro' : 'Nuevo Registro'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Ej. Pago de servicio de hosting"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Monto ({currency.symbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="form-control"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select
                    className="form-control"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Fecha del Registro</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select
                    className="form-control"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as RecordItem['estado'] })}
                  >
                    <option value="Completado">Completado</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Pagado">Pagado</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Guardar Cambios' : 'Crear Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
