const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

export async function fetchModuleData(endpoint: string, userEmail?: string) {
  try {
    const url = userEmail ? `${API_URL}/${endpoint}?userEmail=${encodeURIComponent(userEmail)}` : `${API_URL}/${endpoint}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.warn(`Falló la conexión con la API en /${endpoint}, usando almacenamiento local:`, error);
    return null;
  }
}

export async function createModuleData(endpoint: string, data: any) {
  try {
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error al crear registro');
    return await response.json();
  } catch (error) {
    console.warn(`Falló POST en /${endpoint}:`, error);
    return null;
  }
}

export async function updateModuleData(endpoint: string, id: string, data: any) {
  try {
    const response = await fetch(`${API_URL}/${endpoint}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error al actualizar registro');
    return await response.json();
  } catch (error) {
    console.warn(`Falló PUT en /${endpoint}/${id}:`, error);
    return null;
  }
}

export async function deleteModuleData(endpoint: string, id: string) {
  try {
    const response = await fetch(`${API_URL}/${endpoint}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Error al eliminar registro');
    return await response.json();
  } catch (error) {
    console.warn(`Falló DELETE en /${endpoint}/${id}:`, error);
    return null;
  }
}

// Google Sheets Sync Services
export async function getSyncStatus() {
  try {
    const response = await fetch(`${API_URL}/sync/status`);
    if (!response.ok) throw new Error('Error al obtener estado de sincronización');
    return await response.json();
  } catch (error) {
    return {
      status: 'offline',
      serviceAccountEmail: 'pagabien-sheets-bot@pagabien.iam.gserviceaccount.com',
      supportedModules: ['Ingresos', 'Gastos', 'Cuentas por Pagar'],
    };
  }
}

export async function exportToGoogleSheets(spreadsheetId: string) {
  const response = await fetch(`${API_URL}/sync/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spreadsheetId }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al exportar a Google Sheets');
  }
  return await response.json();
}

export async function importFromGoogleSheets(spreadsheetId: string) {
  const response = await fetch(`${API_URL}/sync/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spreadsheetId }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error al importar desde Google Sheets');
  }
  return await response.json();
}

export async function syncBidirectionalGoogleSheets(spreadsheetId: string) {
  const response = await fetch(`${API_URL}/sync/bidirectional`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spreadsheetId }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Error en la sincronización bidireccional');
  }
  return await response.json();
}

// Google Auth Services
export async function authenticateGoogleUser(payload: any) {
  try {
    const response = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // HTTP error from backend (4xx/5xx) — propagate to UI
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message || `Error de autenticación (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    // Distinguish network errors (backend unreachable) from auth errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      // Network/CORS error — backend is down, allow offline session
      console.warn('Backend no disponible. Creando sesión offline:', error.message);
      return {
        success: true,
        offline: true,
        user: {
          id: payload.sub || `offline-${Date.now()}`,
          name: payload.name || payload.email?.split('@')[0] || 'Usuario Google',
          email: payload.email || 'usuario@google.com',
          picture: payload.picture || 'https://lh3.googleusercontent.com/a/default-user',
          token: 'offline-session-token',
        },
      };
    }

    // Auth error (HTTP 4xx/5xx or parsed error) — re-throw to UI
    throw error;
  }
}
