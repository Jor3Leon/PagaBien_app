import React, { useState, useEffect } from 'react';
import type { ModuleType, RecordItem } from './types';
import { SUPPORTED_CURRENCIES } from './types';
import { CurrencyProvider, useCurrency } from './context/CurrencyContext';
import { GoogleAuthProvider, useGoogleAuth } from './context/GoogleAuthContext';
import { DashboardView } from './components/DashboardView';
import { SharedModuleView } from './components/SharedModuleView';
import { ReportesView } from './components/ReportesView';
import { LoginScreen } from './components/LoginScreen';
import { GoogleLoginModal } from './components/GoogleLoginModal';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { fetchModuleData, createModuleData, updateModuleData, deleteModuleData } from './services/api';
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  BarChart3, 
  Settings, 
  Sun, 
  Moon, 
  Wifi, 
  WifiOff, 
  Sheet,
  Bell,
  Globe,
  LogOut,
  RefreshCw,
  Copy,
  CheckCircle2
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ModuleType>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const { currency, setCurrency } = useCurrency();
  const { 
    user, 
    logout,
    spreadsheetId, 
    setSpreadsheetId, 
    serviceAccountEmail,
    setIsLoginModalOpen, 
    setIsSyncModalOpen 
  } = useGoogleAuth();

  const [copiedEmail, setCopiedEmail] = useState(false);

  // Definición de categorías por módulo
  const categoriasIngresos = ['Salarios', 'Honorarios', 'Arriendos', 'Otros Ingresos'];
  const categoriasGastos = ['Víveres', 'Aseo', 'Ropa', 'Compras', 'Otros Gastos'];
  const categoriasCuentasPorPagar = ['Créditos', 'Servicios Públicos', 'Impuestos', 'Otras Cuentas'];

  const userEmailKey = user?.email ? user.email.replace(/[^a-zA-Z0-9]/g, '_') : 'guest';

  // Persistent States con aislamiento por usuario (userEmailKey)
  const [ingresos, setIngresos] = useState<RecordItem[]>(() => {
    const local = localStorage.getItem(`pagabien_ingresos_${userEmailKey}`);
    return local ? JSON.parse(local) : [];
  });

  const [gastos, setGastos] = useState<RecordItem[]>(() => {
    const local = localStorage.getItem(`pagabien_gastos_${userEmailKey}`);
    return local ? JSON.parse(local) : [];
  });

  const [cuentasPorPagar, setCuentasPorPagar] = useState<RecordItem[]>(() => {
    const local = localStorage.getItem(`pagabien_cuentas_por_pagar_${userEmailKey}`);
    return local ? JSON.parse(local) : [];
  });

  // Cargar datos del usuario desde el Backend NestJS/SQLite al cambiar de usuario
  const loadFromBackend = async () => {
    if (!user?.email) return;

    const dataIngresos = await fetchModuleData('ingresos', user.email);
    if (dataIngresos && Array.isArray(dataIngresos)) {
      setIngresos(dataIngresos);
      localStorage.setItem(`pagabien_ingresos_${userEmailKey}`, JSON.stringify(dataIngresos));
    } else {
      const local = localStorage.getItem(`pagabien_ingresos_${userEmailKey}`);
      setIngresos(local ? JSON.parse(local) : []);
    }

    const dataGastos = await fetchModuleData('gastos', user.email);
    if (dataGastos && Array.isArray(dataGastos)) {
      setGastos(dataGastos);
      localStorage.setItem(`pagabien_gastos_${userEmailKey}`, JSON.stringify(dataGastos));
    } else {
      const local = localStorage.getItem(`pagabien_gastos_${userEmailKey}`);
      setGastos(local ? JSON.parse(local) : []);
    }

    const dataCuentas = await fetchModuleData('cuentas-por-pagar', user.email);
    if (dataCuentas && Array.isArray(dataCuentas)) {
      setCuentasPorPagar(dataCuentas);
      localStorage.setItem(`pagabien_cuentas_por_pagar_${userEmailKey}`, JSON.stringify(dataCuentas));
    } else {
      const local = localStorage.getItem(`pagabien_cuentas_por_pagar_${userEmailKey}`);
      setCuentasPorPagar(local ? JSON.parse(local) : []);
    }
  };

  // Reset data and reload when user account changes (Bug 3)
  useEffect(() => {
    // Immediately clear previous user's data to prevent leaking
    setIngresos([]);
    setGastos([]);
    setCuentasPorPagar([]);
    // Then load the correct user's data
    loadFromBackend();
  }, [user?.email]);

  // Guardar en localStorage aislado de este usuario
  useEffect(() => {
    if (userEmailKey) {
      localStorage.setItem(`pagabien_ingresos_${userEmailKey}`, JSON.stringify(ingresos));
    }
  }, [ingresos, userEmailKey]);

  useEffect(() => {
    if (userEmailKey) {
      localStorage.setItem(`pagabien_gastos_${userEmailKey}`, JSON.stringify(gastos));
    }
  }, [gastos, userEmailKey]);

  useEffect(() => {
    if (userEmailKey) {
      localStorage.setItem(`pagabien_cuentas_por_pagar_${userEmailKey}`, JSON.stringify(cuentasPorPagar));
    }
  }, [cuentasPorPagar, userEmailKey]);

  const toggleTheme = () => {
    const nextTheme = !isDarkMode;
    setIsDarkMode(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme ? 'dark' : 'light');
  };

  // Handlers persistentes aislados por userEmail
  const handleAddRecord = async (
    endpoint: string,
    list: RecordItem[], 
    setList: React.Dispatch<React.SetStateAction<RecordItem[]>>, 
    item: Partial<RecordItem>, 
    defaultCat: string
  ) => {
    const payload = {
      userEmail: user?.email || 'global',
      fecha: item.fecha || new Date().toISOString().split('T')[0],
      descripcion: item.descripcion || 'Sin descripción',
      categoria: item.categoria || defaultCat,
      monto: item.monto || 0,
      estado: item.estado || 'Completado'
    };

    const backendResult = await createModuleData(endpoint, payload);

    const newItem: RecordItem = {
      id: backendResult?.id || Date.now().toString(),
      ...payload
    };

    setList([newItem, ...list]);
  };

  const handleEditRecord = async (
    endpoint: string,
    list: RecordItem[], 
    setList: React.Dispatch<React.SetStateAction<RecordItem[]>>, 
    updatedItem: RecordItem
  ) => {
    await updateModuleData(endpoint, updatedItem.id, {
      ...updatedItem,
      userEmail: user?.email || 'global'
    });
    setList(list.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const handleDeleteRecord = async (
    endpoint: string,
    list: RecordItem[], 
    setList: React.Dispatch<React.SetStateAction<RecordItem[]>>, 
    id: string
  ) => {
    await deleteModuleData(endpoint, id);
    setList(list.filter(item => item.id !== id));
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Sidebar Navigation */}
      <aside style={{ width: '260px', background: 'var(--bg-card)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ background: 'var(--primary)', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
            PB
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.5px' }}>PagaBien</h2>
            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>ERP Suite</span>
          </div>
        </div>

        <nav style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <button 
            className={`btn ${activeModule === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
            onClick={() => setActiveModule('dashboard')}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          
          <button 
            className={`btn ${activeModule === 'ingresos' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
            onClick={() => setActiveModule('ingresos')}
          >
            <TrendingUp size={18} /> Ingresos
          </button>

          <button 
            className={`btn ${activeModule === 'gastos' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
            onClick={() => setActiveModule('gastos')}
          >
            <TrendingDown size={18} /> Gastos
          </button>

          <button 
            className={`btn ${activeModule === 'cuentas-por-pagar' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
            onClick={() => setActiveModule('cuentas-por-pagar')}
          >
            <Receipt size={18} /> Cuentas por Pagar
          </button>

          <button 
            className={`btn ${activeModule === 'reportes' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
            onClick={() => setActiveModule('reportes')}
          >
            <BarChart3 size={18} /> Informes
          </button>

          <button 
            className={`btn ${activeModule === 'configuracion' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
            onClick={() => setActiveModule('configuracion')}
          >
            <Settings size={18} /> Configuración
          </button>
        </nav>

        {/* Footer info & Offline Indicator */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estado Red</span>
            <span className={`badge ${isOnline ? 'badge-success' : 'badge-danger'}`} style={{ cursor: 'pointer' }} onClick={() => setIsOnline(!isOnline)}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isOnline ? ' Online' : ' Offline'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Header */}
        <header className="glass-nav" style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => setIsSyncModalOpen(true)}
              className="badge badge-info" 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', border: 'none' }}
              title="Abrir Sincronización Google Sheets"
            >
              <Sheet size={14} /> Google Sheets Sync: {spreadsheetId ? 'Configurado' : 'Pendiente'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Currency Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-hover)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <Globe size={16} style={{ color: 'var(--text-muted)' }} />
              <select 
                value={currency.code} 
                onChange={(e) => {
                  const selected = SUPPORTED_CURRENCIES.find(c => c.code === e.target.value);
                  if (selected) setCurrency(selected);
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code} style={{ background: 'var(--bg-card)' }}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <button className="btn-icon" onClick={toggleTheme} title="Cambiar tema">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="btn-icon" title="Notificaciones">
              <Bell size={20} />
            </button>
            <div style={{ height: '24px', width: '1px', background: 'var(--border-color)' }}></div>
            
            {/* User Profile & Logout Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                onClick={() => setIsLoginModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'var(--bg-hover)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
              >
                <img
                  src={user?.picture || 'https://lh3.googleusercontent.com/a/default-user'}
                  alt={user?.name || 'Usuario'}
                  style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                />
                <div style={{ fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700, lineHeight: 1.2 }}>{user?.name || 'Usuario'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{user?.email || 'Conectado'}</div>
                </div>
              </div>

              <button 
                onClick={logout}
                className="btn-icon"
                title="Cerrar Sesión"
                style={{ color: 'var(--danger)' }}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* View Switcher */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeModule === 'dashboard' && (
            <DashboardView 
              ingresos={ingresos} 
              gastos={gastos} 
              cuentasPorPagar={cuentasPorPagar} 
            />
          )}

          {activeModule === 'ingresos' && (
            <SharedModuleView
              title="Gestión de Ingresos"
              subtitle="Administración y registro detallado de las entradas de dinero"
              data={ingresos}
              categories={categoriasIngresos}
              onAdd={(item) => handleAddRecord('ingresos', ingresos, setIngresos, item, categoriasIngresos[0])}
              onEdit={(item) => handleEditRecord('ingresos', ingresos, setIngresos, item)}
              onDelete={(id) => handleDeleteRecord('ingresos', ingresos, setIngresos, id)}
            />
          )}

          {activeModule === 'gastos' && (
            <SharedModuleView
              title="Gestión de Gastos"
              subtitle="Control de egresos, compras y costos operativos"
              data={gastos}
              categories={categoriasGastos}
              onAdd={(item) => handleAddRecord('gastos', gastos, setGastos, item, categoriasGastos[0])}
              onEdit={(item) => handleEditRecord('gastos', gastos, setGastos, item)}
              onDelete={(id) => handleDeleteRecord('gastos', gastos, setGastos, id)}
            />
          )}

          {activeModule === 'cuentas-por-pagar' && (
            <SharedModuleView
              title="Cuentas por Pagar"
              subtitle="Seguimiento de compromisos de pago y facturas pendientes"
              data={cuentasPorPagar}
              categories={categoriasCuentasPorPagar}
              onAdd={(item) => handleAddRecord('cuentas-por-pagar', cuentasPorPagar, setCuentasPorPagar, item, categoriasCuentasPorPagar[0])}
              onEdit={(item) => handleEditRecord('cuentas-por-pagar', cuentasPorPagar, setCuentasPorPagar, item)}
              onDelete={(id) => handleDeleteRecord('cuentas-por-pagar', cuentasPorPagar, setCuentasPorPagar, id)}
            />
          )}

          {activeModule === 'reportes' && (
            <ReportesView 
              ingresos={ingresos}
              gastos={gastos}
              cuentasPorPagar={cuentasPorPagar}
            />
          )}

          {activeModule === 'configuracion' && (
            <div className="animate-fade-in" style={{ padding: '24px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Configuración del Sistema</h1>
              <p style={{ color: 'var(--text-muted)' }}>Ajustes de Moneda, Google Sheets API, PIN de seguridad y respaldos</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={18} style={{ color: 'var(--primary)' }} /> Preferencias Generales
                  </h3>
                  
                  <div className="form-group">
                    <label className="form-label">Moneda Principal</label>
                    <select 
                      className="form-control" 
                      value={currency.code}
                      onChange={(e) => {
                        const selected = SUPPORTED_CURRENCIES.find(c => c.code === e.target.value);
                        if (selected) setCurrency(selected);
                      }}
                    >
                      {SUPPORTED_CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sheet size={18} style={{ color: '#10b981' }} /> Integración Google Sheets
                  </h3>

                  <div className="form-group">
                    <label className="form-label">Correo Bot Servicio Google</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        readOnly 
                        className="form-control" 
                        value={serviceAccountEmail} 
                        style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}
                      />
                      <button 
                        className="btn btn-secondary"
                        onClick={() => {
                          navigator.clipboard.writeText(serviceAccountEmail);
                          setCopiedEmail(true);
                          setTimeout(() => setCopiedEmail(false), 2000);
                        }}
                      >
                        {copiedEmail ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">ID o Enlace de Google Sheet</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={spreadsheetId}
                      onChange={(e) => setSpreadsheetId(e.target.value)}
                    />
                  </div>

                  <button 
                    className="btn 100%" 
                    style={{ width: '100%', marginTop: '10px' }}
                    onClick={() => setIsSyncModalOpen(true)}
                  >
                    <RefreshCw size={16} /> Panel de Sincronización
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Render Modals */}
      <GoogleLoginModal />
      <GoogleSheetsSyncModal onSyncSuccess={loadFromBackend} />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useGoogleAuth();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <MainAppContent />;
};

export const App: React.FC = () => {
  return (
    <CurrencyProvider>
      <GoogleAuthProvider>
        <AppContent />
      </GoogleAuthProvider>
    </CurrencyProvider>
  );
};

export default App;
