import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { formatSeconds } from '../helpers/report-formatters';
import { buildReportFilename } from '../helpers/report-filename';
import { getRangeLabel } from '../helpers/report-period';
import {
  getReportDisplayStatus,
  getStatusColors,
  type ReportDisplayStatus,
} from '../helpers/report-status';
import type {
  ReportDataset,
  ReportExportContext,
  ReportFile,
  ReportIncidentRow,
  ReportRow,
} from '../types/report.types';
import type { ReportExporter } from './report-exporter.interface';

const COLORS = {
  brand: '#1d4ed8',
  brandDark: '#1e3a8a',
  text: '#0f172a',
  muted: '#64748b',
  border: '#cbd5e1',
  soft: '#f8fafc',
  white: '#ffffff',
};

type PdfDoc = PDFKit.PDFDocument;

@Injectable()
export class ReportPdfExporter implements ReportExporter {
  async export({
    dataset,
    filenameSuffix,
  }: ReportExportContext): Promise<ReportFile> {
    return {
      filename: buildReportFilename(
        dataset.summary.range,
        filenameSuffix,
        'pdf',
      ),
      contentType: 'application/pdf',
      buffer: await this.buildPdf(dataset),
    };
  }

  private buildPdf(dataset: ReportDataset): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 48,
        bufferPages: true,
        info: {
          Title: 'Informe Monitoring',
          Author: 'Monitoring',
          Subject: getRangeLabel(dataset.summary.range),
        },
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      this.addCover(doc, dataset);
      this.addExecutiveSummary(doc, dataset);
      this.addMonitorTable(doc, dataset.summary.rows);
      this.addIncidents(doc, dataset.incidents);
      this.addConclusions(doc, dataset);
      this.addFooters(doc);

      doc.end();
    });
  }

  private addCover(doc: PdfDoc, dataset: ReportDataset) {
    const title = dataset.scopeName ?? 'Todos los monitores';

    doc.rect(0, 0, doc.page.width, 170).fill(COLORS.brandDark);
    doc
      .fillColor(COLORS.white)
      .font('Helvetica-Bold')
      .fontSize(28)
      .text('Monitoring', 48, 54);
    doc
      .font('Helvetica')
      .fontSize(13)
      .fillColor('#dbeafe')
      .text('Informe de disponibilidad y rendimiento', 48, 92);

    doc
      .fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .fontSize(24)
      .text(title, 48, 220, { width: 490 });
    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor(COLORS.muted)
      .text(`Periodo: ${getRangeLabel(dataset.summary.range)}`, 48, 275)
      .text(`Desde: ${this.formatDate(dataset.summary.from)}`, 48, 296)
      .text(`Hasta: ${this.formatDate(dataset.summary.to)}`, 48, 317)
      .text(`Generado: ${this.formatDate(new Date().toISOString())}`, 48, 338);

    const totals = dataset.summary.totals;
    const cards = [
      ['Uptime medio', `${totals.averageUptimePercent}%`],
      ['Respuesta media', `${totals.averageResponseTimeMs} ms`],
      ['Incidencias', String(totals.incidents)],
      ['Downtime estimado', formatSeconds(totals.estimatedDowntimeSeconds)],
    ];

    cards.forEach(([label, value], index) => {
      const x = 48 + (index % 2) * 250;
      const y = 410 + Math.floor(index / 2) * 96;
      this.drawKpiCard(doc, x, y, 222, 72, label, value);
    });

    doc.addPage();
  }

  private addExecutiveSummary(doc: PdfDoc, dataset: ReportDataset) {
    this.addSectionTitle(doc, 'Resumen ejecutivo');

    const totals = dataset.summary.totals;
    const worstMonitor = this.getWorstMonitor(dataset.summary.rows);
    const slowestMonitor = this.getSlowestMonitor(dataset.summary.rows);

    const lines = [
      `El informe cubre ${totals.monitors} monitores con ${totals.checks} checks registrados.`,
      `La disponibilidad media del periodo es ${totals.averageUptimePercent}% y el tiempo medio de respuesta es ${totals.averageResponseTimeMs} ms.`,
      worstMonitor
        ? `Peor SLA: ${worstMonitor.monitor.name} con ${worstMonitor.uptimePercent}%.`
        : 'No hay monitores con datos suficientes para destacar peor SLA.',
      slowestMonitor
        ? `Monitor más lento: ${slowestMonitor.monitor.name} con ${slowestMonitor.averageResponseTimeMs} ms.`
        : 'No hay datos de respuesta suficientes para destacar monitor lento.',
    ];

    doc
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor(COLORS.text)
      .text(lines.join('\n'), { width: 500, lineGap: 5 });

    doc.moveDown(1.4);
    this.drawKpiGrid(doc, dataset);
  }

  private drawKpiGrid(doc: PdfDoc, dataset: ReportDataset) {
    const totals = dataset.summary.totals;
    const y = doc.y;
    const cards = [
      ['SLA medio', `${totals.averageUptimePercent}%`],
      ['Respuesta', `${totals.averageResponseTimeMs} ms`],
      ['Checks', String(totals.checks)],
      ['Incidencias', String(totals.incidents)],
    ];

    cards.forEach(([label, value], index) => {
      const x = 48 + index * 125;
      this.drawKpiCard(doc, x, y, 112, 64, label, value);
    });

    doc.y = y + 86;
  }

  private addMonitorTable(doc: PdfDoc, rows: ReportRow[]) {
    this.ensureSpace(doc, 120);
    this.addSectionTitle(doc, 'Tabla de monitores');

    const columns = [
      { label: 'Monitor', x: 48, width: 142 },
      { label: 'Estado', x: 196, width: 70 },
      { label: 'SLA', x: 276, width: 58 },
      { label: 'Resp.', x: 342, width: 58 },
      { label: 'Inc.', x: 408, width: 42 },
      { label: 'Checks', x: 456, width: 58 },
    ];

    this.drawTableHeader(doc, columns);

    rows.forEach((row) => {
      this.ensureSpace(doc, 42, () => this.drawTableHeader(doc, columns));
      const y = doc.y;
      const status = getReportDisplayStatus(row);
      const statusColors = getStatusColors(status);

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.text)
        .text(row.monitor.name, 48, y, { width: 142, ellipsis: true })
        .fillColor(COLORS.muted)
        .fontSize(7.5)
        .text(row.monitor.target, 48, y + 13, {
          width: 142,
          ellipsis: true,
        });

      this.drawStatusPill(doc, 196, y, status, statusColors);
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.text)
        .text(`${row.uptimePercent}%`, 276, y + 5, { width: 58 })
        .text(`${row.averageResponseTimeMs} ms`, 342, y + 5, { width: 58 })
        .text(String(row.incidents), 408, y + 5, { width: 42 })
        .text(String(row.checks), 456, y + 5, { width: 58 });

      doc
        .strokeColor(COLORS.border)
        .lineWidth(0.5)
        .moveTo(48, y + 31)
        .lineTo(548, y + 31)
        .stroke();
      doc.y = y + 36;
    });

    doc.moveDown();
  }

  private addIncidents(doc: PdfDoc, incidents: ReportIncidentRow[]) {
    this.ensureSpace(doc, 120);
    this.addSectionTitle(doc, 'Detalle de incidencias');

    if (incidents.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(COLORS.muted)
        .text('No se registraron incidencias en el periodo seleccionado.');
      doc.moveDown();
      return;
    }

    incidents.forEach((incident) => {
      this.ensureSpace(doc, 58);
      const y = doc.y;
      doc
        .roundedRect(48, y, 500, 44, 8)
        .fillAndStroke(COLORS.soft, COLORS.border);
      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(COLORS.text)
        .text(incident.monitorName, 60, y + 9, { width: 180 })
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(COLORS.muted)
        .text(incident.title, 60, y + 24, { width: 220, ellipsis: true })
        .text(incident.status, 300, y + 9, { width: 80 })
        .text(incident.severity ?? '-', 386, y + 9, { width: 72 })
        .text(this.formatDate(incident.startedAt), 300, y + 24, {
          width: 180,
        });
      doc.y = y + 54;
    });
  }

  private addConclusions(doc: PdfDoc, dataset: ReportDataset) {
    this.ensureSpace(doc, 120);
    this.addSectionTitle(doc, 'Conclusiones automáticas');

    const totals = dataset.summary.totals;
    const conclusions = [
      totals.averageUptimePercent >= 99.9
        ? 'Disponibilidad excelente durante el periodo seleccionado.'
        : 'Disponibilidad por debajo de 99.9%; conviene revisar monitores con peor SLA.',
      totals.incidents === 0
        ? 'No se detectaron incidencias registradas en el rango.'
        : `Se registraron ${totals.incidents} incidencias; priorizar las abiertas o críticas.`,
      totals.averageResponseTimeMs > 1000
        ? 'Tiempo medio de respuesta elevado; revisar rendimiento de endpoints lentos.'
        : 'Tiempo medio de respuesta dentro de un rango operativo razonable.',
    ];

    conclusions.forEach((conclusion) => {
      doc
        .circle(54, doc.y + 6, 3)
        .fill(COLORS.brand)
        .fillColor(COLORS.text)
        .font('Helvetica')
        .fontSize(10)
        .text(conclusion, 66, doc.y, { width: 470, lineGap: 3 });
      doc.moveDown(0.7);
    });
  }

  private addSectionTitle(doc: PdfDoc, title: string) {
    doc
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor(COLORS.text)
      .text(title, 48, doc.y);
    doc
      .moveTo(48, doc.y + 4)
      .lineTo(548, doc.y + 4)
      .strokeColor(COLORS.border)
      .lineWidth(0.8)
      .stroke();
    doc.moveDown();
  }

  private drawKpiCard(
    doc: PdfDoc,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    value: string,
  ) {
    doc
      .roundedRect(x, y, width, height, 10)
      .fillAndStroke(COLORS.soft, COLORS.border);
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(COLORS.muted)
      .text(label, x + 12, y + 13, { width: width - 24 });
    doc
      .font('Helvetica-Bold')
      .fontSize(17)
      .fillColor(COLORS.text)
      .text(value, x + 12, y + 32, { width: width - 24 });
  }

  private drawTableHeader(
    doc: PdfDoc,
    columns: Array<{ label: string; x: number; width: number }>,
  ) {
    const y = doc.y;
    doc.rect(48, y, 500, 24).fill(COLORS.brandDark);
    columns.forEach((column) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(COLORS.white)
        .text(column.label, column.x, y + 8, { width: column.width });
    });
    doc.y = y + 30;
  }

  private drawStatusPill(
    doc: PdfDoc,
    x: number,
    y: number,
    status: ReportDisplayStatus,
    colors: { fgColor: string; bgColor: string },
  ) {
    doc.roundedRect(x, y + 2, 62, 18, 9).fill(`#${colors.bgColor}`);
    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor(`#${colors.fgColor}`)
      .text(status, x, y + 7, { width: 62, align: 'center' });
  }

  private ensureSpace(doc: PdfDoc, height: number, afterAddPage?: () => void) {
    if (doc.y + height <= doc.page.height - 72) {
      return;
    }

    doc.addPage();
    doc.y = 48;
    afterAddPage?.();
  }

  private addFooters(doc: PdfDoc) {
    const range = doc.bufferedPageRange();
    for (
      let index = range.start;
      index < range.start + range.count;
      index += 1
    ) {
      doc.switchToPage(index);
      const pageNumber = index + 1;
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(
          `Monitoring · Página ${pageNumber} de ${range.count}`,
          48,
          doc.page.height - 58,
          { width: 500, align: 'center', lineBreak: false },
        );
    }
  }

  private getWorstMonitor(rows: ReportRow[]) {
    return rows
      .slice()
      .sort((first, second) => first.uptimePercent - second.uptimePercent)[0];
  }

  private getSlowestMonitor(rows: ReportRow[]) {
    return rows
      .filter((row) => row.averageResponseTimeMs > 0)
      .sort(
        (first, second) =>
          second.averageResponseTimeMs - first.averageResponseTimeMs,
      )[0];
  }

  private formatDate(value: string) {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}
