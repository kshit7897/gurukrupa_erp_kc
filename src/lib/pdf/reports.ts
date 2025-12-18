import PDFDocument from 'pdfkit';

function createPdfBuffer(build: (doc: any) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc: any = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));
    build(doc);
    doc.end();
  });
}

export function buildStockReportPdf(rows: any[]): Promise<Buffer> {
  return createPdfBuffer((doc) => {
    doc.fontSize(18).text('Stock Summary Report', { align: 'center' });
    doc.moveDown();
    const now = new Date().toLocaleString();
    doc.fontSize(10).text(`Generated on: ${now}`, { align: 'right' });
    doc.moveDown();

    // table header
    doc.fontSize(11).text('Item Name', 40, doc.y, { continued: true });
    doc.text('Purchase Rate', 220, doc.y, { width: 90, align: 'right', continued: true });
    doc.text('Stock', 320, doc.y, { width: 70, align: 'right', continued: true });
    doc.text('Total Value', 410, doc.y, { width: 150, align: 'right' });
    doc.moveDown(0.4);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

    rows.forEach((r) => {
      doc.moveDown(0.3);
      doc.fontSize(10).text(String(r.name || ''), 40, doc.y, { continued: true, width: 170 });
      doc.text((Number(r.purchaseRate || 0)).toFixed(2), 220, doc.y, { width: 90, align: 'right', continued: true });
      doc.text(String(r.unitLabel || ''), 320, doc.y, { width: 70, align: 'right', continued: true });
      doc.text((Number(r.totalValue || 0)).toFixed(2), 410, doc.y, { width: 150, align: 'right' });
    });
  });
}

export function buildOutstandingReportPdf(rows: any[]): Promise<Buffer> {
  return createPdfBuffer((doc) => {
    doc.fontSize(18).text('Outstanding Report', { align: 'center' });
    doc.moveDown();
    const now = new Date().toLocaleString();
    doc.fontSize(10).text(`Generated on: ${now}`, { align: 'right' });
    doc.moveDown();

    // header
    doc.fontSize(11).text('Party', 40, doc.y, { continued: true });
    doc.text('Mobile', 220, doc.y, { width: 100, align: 'left', continued: true });
    doc.text('Status', 340, doc.y, { width: 80, align: 'left', continued: true });
    doc.text('Amount', 430, doc.y, { width: 120, align: 'right' });
    doc.moveDown(0.4);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

    rows.forEach((p) => {
      const isCustomer = (p.type || '').toString().toLowerCase() === 'customer';
      const status = isCustomer ? 'To Receive' : 'To Pay';
      const amount = Math.abs(Number(p.currentBalance || 0) || 0);
      doc.moveDown(0.3);
      doc.fontSize(10).text(String(p.name || ''), 40, doc.y, { width: 160, continued: true });
      doc.text(String(p.mobile || ''), 220, doc.y, { width: 100, align: 'left', continued: true });
      doc.text(status, 340, doc.y, { width: 80, align: 'left', continued: true });
      doc.text(amount.toFixed(2), 430, doc.y, { width: 120, align: 'right' });
    });
  });
}

export function buildProfitLossPdf(data: any): Promise<Buffer> {
  return createPdfBuffer((doc) => {
    const { from, to, openingBalance, sales, purchase, otherIncome, otherExpense, grossProfit, netProfit } = data || {};

    doc.fontSize(18).text('Profit & Loss Statement', { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).text(`Period: ${from} to ${to}`, { align: 'center' });
    doc.moveDown();

    if (openingBalance) {
      doc.fontSize(11).text(`Opening Balance: ${Number(openingBalance || 0).toFixed(2)}`);
      doc.moveDown();
    }

    doc.fontSize(13).text('Revenue', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).text(`Sales: ${Number(sales || 0).toFixed(2)}`);
    doc.text(`Other Income: ${Number(otherIncome || 0).toFixed(2)}`);
    const totalRevenue = Number(sales || 0) + Number(otherIncome || 0);
    doc.text(`Total Revenue: ${totalRevenue.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(13).text('Expenses', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).text(`Purchase: ${Number(purchase || 0).toFixed(2)}`);
    doc.text(`Other Expenses: ${Number(otherExpense || 0).toFixed(2)}`);
    const totalExpenses = Number(purchase || 0) + Number(otherExpense || 0);
    doc.text(`Total Expenses: ${totalExpenses.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(13).text('Summary', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).text(`Gross Profit: ${Number(grossProfit || 0).toFixed(2)}`);
    doc.text(`Net Profit/Loss: ${Number(netProfit || 0).toFixed(2)}`);

    if (openingBalance || netProfit) {
      const closing = Number(openingBalance || 0) + Number(netProfit || 0);
      doc.moveDown();
      doc.fontSize(11).text(`Closing Balance: ${closing.toFixed(2)}`);
    }
  });
}


