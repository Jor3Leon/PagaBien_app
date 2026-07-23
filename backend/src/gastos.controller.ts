import { Controller, Get, Post, Body, Param, Delete, Put, Query } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('gastos')
export class GastosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll(@Query('userEmail') userEmail?: string) {
    return this.prisma.gasto.findMany({
      where: userEmail ? { userEmail } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  create(@Body() data: { userEmail?: string; fecha: string; descripcion: string; categoria: string; monto: number; estado?: string }) {
    return this.prisma.gasto.create({
      data: {
        userEmail: data.userEmail || 'global',
        fecha: data.fecha,
        descripcion: data.descripcion,
        categoria: data.categoria,
        monto: Number(data.monto) || 0,
        estado: data.estado || 'Completado',
      },
    });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.prisma.gasto.update({
      where: { id },
      data,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prisma.gasto.delete({ where: { id } });
  }
}
