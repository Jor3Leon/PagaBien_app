import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { IngresosController } from './ingresos.controller';
import { GastosController } from './gastos.controller';
import { CuentasPorPagarController } from './cuentas-por-pagar.controller';
import { GoogleSheetsService } from './google-sheets.service';
import { SyncController } from './sync.controller';
import { AuthController } from './auth.controller';

@Module({
  imports: [],
  controllers: [
    AppController,
    IngresosController,
    GastosController,
    CuentasPorPagarController,
    SyncController,
    AuthController,
  ],
  providers: [AppService, PrismaService, GoogleSheetsService],
})
export class AppModule {}
