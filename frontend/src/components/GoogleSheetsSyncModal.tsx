import React, { useState } from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { exportToGoogleSheets, importFromGoogleSheets, syncBidirectionalGoogleSheets } from '../services/api';
import { Copy, ArrowUpRight, ArrowDownLeft, RefreshCw, CheckCircle2, AlertCircle, X, FileSpreadsheet } from 'lucide-react';

export const GoogleSheetsSyncModal: React.FC<{ onSyncSuccess?: () => void }> = ({ onSyncSuccess }) => {
  const { spreadsheetId, setSpreadsheetId, serviceAccountEmail, isSyncModalOpen, setIsSyncModalOpen } = useGoogleAuth();
  const [inputUrl, setInputUrl] = useState(spreadsheetId);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string; details?: any } | null>(null);

  if (!isSyncModalOpen) return null;

  const copyServiceAccount = () => {
    navigator.clipboard.writeText(serviceAccountEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const executeSyncAction = async (actionType: 'export' | 'import' | 'bidirectional') => {
    if (!inputUrl) {
      setStatusMessage({ type: 'error', text: 'Ingresa la URL o el ID de tu Google Sheet' });
      return;
    }
    setSpreadsheetId(inputUrl);
    setLoading(true);
    setStatusMessage(null);

    try {
      let res;
      if (actionType === 'export') {
        res = await exportToGoogleSheets(inputUrl);
      } else if (actionType === 'import') {
        res = await importFromGoogleSheets(inputUrl);
      } else {
        res = await syncBidirectionalGoogleSheets(inputUrl);
      }

      setStatusMessage({
        type: 'success',
        text: res.message || 'Sincronización realizada correctamente',
        details: res.counts || res.importedCounts,
      });

      if (onSyncSuccess) {
        onSyncSuccess();
      }
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: e.message || 'Ocurrió un error al comunicar con Google Sheets. Verifica que hayas compartido la hoja con el bot.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setIsSyncModalOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Sincronización con Google Sheets</h3>
            <p className="text-xs text-slate-400">Importa, exporta o sincroniza bidireccionalmente</p>
          </div>
        </div>

        {/* Step 1: Share Email */}
        <div className="mb-5 p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
          <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
            Paso 1: Compartir tu Google Sheet
          </label>
          <p className="text-xs text-slate-300">
            Comparte tu hoja de cálculo otorgando permisos de <strong>Editor</strong> al siguiente correo de servicio:
          </p>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              readOnly
              value={serviceAccountEmail}
              className="w-full text-xs font-mono bg-slate-950 border border-slate-700 text-emerald-300 rounded-lg px-3 py-2 select-all focus:outline-none"
            />
            <button
              onClick={copyServiceAccount}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition-colors shrink-0"
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Step 2: Spreadsheet ID / URL */}
        <div className="mb-5 space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            Paso 2: Enlace o ID de la Hoja de Google Sheets
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/1ABC.../edit"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div
            className={`mb-5 p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                : 'bg-red-950/60 border-red-800 text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{statusMessage.text}</p>
              {statusMessage.details && (
                <div className="mt-1 text-[11px] opacity-90 space-x-2 font-mono">
                  <span>Ingresos: {statusMessage.details.ingresos || 0}</span>
                  <span>| Gastos: {statusMessage.details.gastos || 0}</span>
                  <span>| Cuentas: {statusMessage.details.cuentasPorPagar || 0}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sync Actions */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-400 block">Acciones de Sincronización</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              onClick={() => executeSyncAction('export')}
              disabled={loading}
              className="flex flex-col items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all text-emerald-400 hover:border-emerald-500/50 disabled:opacity-50"
            >
              <ArrowUpRight className="w-5 h-5 mb-1" />
              <span className="text-xs font-semibold text-white">Exportar</span>
              <span className="text-[10px] text-slate-400">App ➔ Sheet</span>
            </button>

            <button
              onClick={() => executeSyncAction('import')}
              disabled={loading}
              className="flex flex-col items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all text-blue-400 hover:border-blue-500/50 disabled:opacity-50"
            >
              <ArrowDownLeft className="w-5 h-5 mb-1" />
              <span className="text-xs font-semibold text-white">Importar</span>
              <span className="text-[10px] text-slate-400">Sheet ➔ App</span>
            </button>

            <button
              onClick={() => executeSyncAction('bidirectional')}
              disabled={loading}
              className="flex flex-col items-center justify-center p-3 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 rounded-xl transition-all shadow-md disabled:opacity-50 col-span-1"
            >
              <RefreshCw className={`w-5 h-5 mb-1 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-xs font-bold">Bidireccional</span>
              <span className="text-[10px] text-emerald-100">App ⇄ Sheet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
