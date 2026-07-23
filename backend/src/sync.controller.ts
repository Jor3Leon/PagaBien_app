import { Controller, Post, Get, Body, BadRequestException } from '@nestjs/common';
import { GoogleSheetsService } from './google-sheets.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly googleSheetsService: GoogleSheetsService) {}

  @Get('status')
  getStatus() {
    return {
      status: 'active',
      serviceAccountEmail: this.googleSheetsService.getServiceAccountEmail(),
      supportedModules: ['Ingresos', 'Gastos', 'Cuentas por Pagar'],
    };
  }

  @Post('export')
  async exportToSheet(@Body() body: { spreadsheetId: string }) {
    if (!body || !body.spreadsheetId) {
      throw new BadRequestException('Se requiere spreadsheetId o URL de Google Sheets');
    }
    return await this.googleSheetsService.exportDataToSheet(body.spreadsheetId);
  }

  @Post('import')
  async importFromSheet(@Body() body: { spreadsheetId: string }) {
    if (!body || !body.spreadsheetId) {
      throw new BadRequestException('Se requiere spreadsheetId o URL de Google Sheets');
    }
    return await this.googleSheetsService.importDataFromSheet(body.spreadsheetId);
  }

  @Post('bidirectional')
  async syncBidirectional(@Body() body: { spreadsheetId: string }) {
    if (!body || !body.spreadsheetId) {
      throw new BadRequestException('Se requiere spreadsheetId o URL de Google Sheets');
    }
    return await this.googleSheetsService.syncBidirectional(body.spreadsheetId);
  }
}
