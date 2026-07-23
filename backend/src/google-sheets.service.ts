import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from './prisma.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private authClient: any;
  private serviceAccountEmail: string = 'pagabien-sheets-bot@pagabien.iam.gserviceaccount.com';

  constructor(private prisma: PrismaService) {
    this.initAuth();
  }

  private initAuth() {
    try {
      const keyPath = path.resolve(__dirname, '../../pagabien-fd3bc8233d07.json');
      if (fs.existsSync(keyPath)) {
        const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        this.serviceAccountEmail = keyFile.client_email || this.serviceAccountEmail;
        this.authClient = new google.auth.GoogleAuth({
          keyFile: keyPath,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        this.logger.log(`Autenticado con éxito usando cuenta de servicio: ${this.serviceAccountEmail}`);
      } else {
        this.logger.warn(`No se encontró el archivo de credenciales en ${keyPath}`);
      }
    } catch (err) {
      this.logger.error('Error al inicializar credenciales de Google Sheets:', err);
    }
  }

  getServiceAccountEmail() {
    return this.serviceAccountEmail;
  }

  private extractSpreadsheetId(input: string): string {
    if (!input) return '';
    const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input.trim();
  }

  private async getSheetsInstance() {
    if (!this.authClient) {
      this.initAuth();
    }
    if (!this.authClient) {
      throw new BadRequestException('No se pudo autenticar con Google. Verifique el archivo JSON de credenciales.');
    }
    return google.sheets({ version: 'v4', auth: this.authClient });
  }

  private async ensureSheetsExist(sheets: any, spreadsheetId: string) {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = (spreadsheet.data.sheets || []).map((s: any) => s.properties.title);

    const requiredSheets = ['Ingresos', 'Gastos', 'Cuentas por Pagar'];
    const requests: any[] = [];

    for (const title of requiredSheets) {
      if (!existingTitles.includes(title)) {
        requests.push({
          addSheet: {
            properties: { title },
          },
        });
      }
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
    }
  }

  async exportDataToSheet(rawSpreadsheetId: string) {
    const spreadsheetId = this.extractSpreadsheetId(rawSpreadsheetId);
    if (!spreadsheetId) {
      throw new BadRequestException('ID o URL de Google Sheet inválido');
    }

    const sheets = await this.getSheetsInstance();
    await this.ensureSheetsExist(sheets, spreadsheetId);

    const ingresos = await this.prisma.ingreso.findMany({ orderBy: { createdAt: 'desc' } });
    const gastos = await this.prisma.gasto.findMany({ orderBy: { createdAt: 'desc' } });
    const cuentas = await this.prisma.cuentaPorPagar.findMany({ orderBy: { createdAt: 'desc' } });

    // Format Ingresos
    const ingresosData = [
      ['ID', 'Fecha', 'Descripción', 'Categoría', 'Monto', 'Estado', 'Comprobante URL', 'Fecha Creación'],
      ...ingresos.map((i) => [i.id, i.fecha, i.descripcion, i.categoria, i.monto, i.estado, i.comprobanteUrl || '', i.createdAt.toISOString()]),
    ];

    // Format Gastos
    const gastosData = [
      ['ID', 'Fecha', 'Descripción', 'Categoría', 'Monto', 'Estado', 'Comprobante URL', 'Fecha Creación'],
      ...gastos.map((g) => [g.id, g.fecha, g.descripcion, g.categoria, g.monto, g.estado, g.comprobanteUrl || '', g.createdAt.toISOString()]),
    ];

    // Format Cuentas por Pagar
    const cuentasData = [
      ['ID', 'Fecha', 'Descripción', 'Categoría', 'Monto', 'Estado', 'Fecha Creación'],
      ...cuentas.map((c) => [c.id, c.fecha, c.descripcion, c.categoria, c.monto, c.estado, c.createdAt.toISOString()]),
    ];

    // Clear existing data and write new
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: 'Ingresos!A1:Z10000' });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Ingresos!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: ingresosData },
    });

    await sheets.spreadsheets.values.clear({ spreadsheetId, range: 'Gastos!A1:Z10000' });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Gastos!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: gastosData },
    });

    await sheets.spreadsheets.values.clear({ spreadsheetId, range: 'Cuentas por Pagar!A1:Z10000' });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Cuentas por Pagar!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: cuentasData },
    });

    return {
      success: true,
      message: 'Exportación a Google Sheets completada exitosamente',
      counts: {
        ingresos: ingresos.length,
        gastos: gastos.length,
        cuentasPorPagar: cuentas.length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async importDataFromSheet(rawSpreadsheetId: string) {
    const spreadsheetId = this.extractSpreadsheetId(rawSpreadsheetId);
    if (!spreadsheetId) {
      throw new BadRequestException('ID o URL de Google Sheet inválido');
    }

    const sheets = await this.getSheetsInstance();

    let importedIngresosCount = 0;
    let importedGastosCount = 0;
    let importedCuentasCount = 0;

    // Import Ingresos
    try {
      const resIngresos = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Ingresos!A2:H10000' });
      const rowsIngresos = resIngresos.data.values || [];
      for (const row of rowsIngresos) {
        if (!row[1] || !row[2]) continue; // Fecha y descripcion requeridas
        const id = row[0] && row[0].trim() !== '' ? row[0].trim() : undefined;
        const fecha = row[1] || new Date().toISOString().split('T')[0];
        const descripcion = row[2] || '';
        const categoria = row[3] || 'General';
        const monto = parseFloat(row[4]) || 0;
        const estado = row[5] || 'Completado';
        const comprobanteUrl = row[6] || null;

        if (id) {
          await this.prisma.ingreso.upsert({
            where: { id },
            update: { fecha, descripcion, categoria, monto, estado, comprobanteUrl },
            create: { id, fecha, descripcion, categoria, monto, estado, comprobanteUrl },
          });
        } else {
          await this.prisma.ingreso.create({
            data: { fecha, descripcion, categoria, monto, estado, comprobanteUrl },
          });
        }
        importedIngresosCount++;
      }
    } catch (e) {
      this.logger.warn('Pestaña Ingresos no existe o error al importar:', e.message);
    }

    // Import Gastos
    try {
      const resGastos = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Gastos!A2:H10000' });
      const rowsGastos = resGastos.data.values || [];
      for (const row of rowsGastos) {
        if (!row[1] || !row[2]) continue;
        const id = row[0] && row[0].trim() !== '' ? row[0].trim() : undefined;
        const fecha = row[1] || new Date().toISOString().split('T')[0];
        const descripcion = row[2] || '';
        const categoria = row[3] || 'General';
        const monto = parseFloat(row[4]) || 0;
        const estado = row[5] || 'Completado';
        const comprobanteUrl = row[6] || null;

        if (id) {
          await this.prisma.gasto.upsert({
            where: { id },
            update: { fecha, descripcion, categoria, monto, estado, comprobanteUrl },
            create: { id, fecha, descripcion, categoria, monto, estado, comprobanteUrl },
          });
        } else {
          await this.prisma.gasto.create({
            data: { fecha, descripcion, categoria, monto, estado, comprobanteUrl },
          });
        }
        importedGastosCount++;
      }
    } catch (e) {
      this.logger.warn('Pestaña Gastos no existe o error al importar:', e.message);
    }

    // Import Cuentas por Pagar
    try {
      const resCuentas = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Cuentas por Pagar!A2:G10000' });
      const rowsCuentas = resCuentas.data.values || [];
      for (const row of rowsCuentas) {
        if (!row[1] || !row[2]) continue;
        const id = row[0] && row[0].trim() !== '' ? row[0].trim() : undefined;
        const fecha = row[1] || new Date().toISOString().split('T')[0];
        const descripcion = row[2] || '';
        const categoria = row[3] || 'General';
        const monto = parseFloat(row[4]) || 0;
        const estado = row[5] || 'Pendiente';

        if (id) {
          await this.prisma.cuentaPorPagar.upsert({
            where: { id },
            update: { fecha, descripcion, categoria, monto, estado },
            create: { id, fecha, descripcion, categoria, monto, estado },
          });
        } else {
          await this.prisma.cuentaPorPagar.create({
            data: { fecha, descripcion, categoria, monto, estado },
          });
        }
        importedCuentasCount++;
      }
    } catch (e) {
      this.logger.warn('Pestaña Cuentas por Pagar no existe o error al importar:', e.message);
    }

    return {
      success: true,
      message: 'Importación desde Google Sheets completada exitosamente',
      counts: {
        ingresos: importedIngresosCount,
        gastos: importedGastosCount,
        cuentasPorPagar: importedCuentasCount,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async syncBidirectional(rawSpreadsheetId: string) {
    // Import first to get sheet changes, then export back to clean up sheet IDs & ensure exact parity
    const importRes = await this.importDataFromSheet(rawSpreadsheetId);
    const exportRes = await this.exportDataToSheet(rawSpreadsheetId);

    return {
      success: true,
      message: 'Sincronización bidireccional completada con éxito',
      importedCounts: importRes.counts,
      exportedCounts: exportRes.counts,
      timestamp: new Date().toISOString(),
    };
  }
}
