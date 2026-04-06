const mongoose = require('mongoose');

// Define inline schemas to avoid dependency issues in standalone script
const LedgerEntrySchema = new mongoose.Schema({
  companyId: String,
  partyId: String,
  partyName: String,
  date: String,
  entryType: String,
  refType: String,
  refId: String,
  refNo: String,
  debit: Number,
  credit: Number,
  narration: String,
  paymentMode: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const InvoiceSchema = new mongoose.Schema({
  companyId: String,
  invoice_no: String,
  invoiceNo: String,
  date: String,
  partyId: String,
  partyName: String,
  items: Array,
  grandTotal: Number,
  type: String,
  paymentMode: String
});

const LedgerEntry = mongoose.models.LedgerEntry || mongoose.model('LedgerEntry', LedgerEntrySchema);
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);

const MONGODB_URI = "mongodb+srv://gurukrupa_1:GuruKrupa%40%237898@gurukrupa-billing.5v95p0w.mongodb.net/?appName=gurukrupa-billing";

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  // 1. Find all invoices with carting info
  const invoices = await Invoice.find({ 
    "items.cartingAmount": { $gt: 0 },
    "items.cartingPartyId": { $exists: true, $ne: "" }
  });

  console.log(`Found ${invoices.length} invoices with carting details. Checking ledgers...`);

  let repairedCount = 0;

  for (const inv of invoices) {
    const id = inv._id.toString();
    const isSales = inv.type === 'SALES';
    const grand = Number(inv.grandTotal || 0);

    // Get current ledger entries for this invoice
    const entries = await LedgerEntry.find({ refId: id, refType: 'INVOICE' });

    // Check if it's already split (more than 1 entry or metadata.isCarting exists)
    const alreadySplit = entries.length > 1 || entries.some(e => e.metadata?.isCarting === true);
    
    if (alreadySplit) {
      console.log(`Invoice ${inv.invoice_no}: Already split. Skipping.`);
      continue;
    }

    if (entries.length === 0) {
      console.log(`Invoice ${inv.invoice_no}: No ledger entries found at all. Skipping for safety.`);
      continue;
    }

    console.log(`Invoice ${inv.invoice_no}: Repairing ledger (splitting carting)...`);

    // Calculate carting split
    const cartingMap = new Map();
    let totalCartingToOthers = 0;

    (inv.items || []).forEach(it => {
      const cAmt = Number(it.cartingAmount || 0);
      const cPartyId = (it.cartingPartyId || '').toString();
      if (cAmt > 0 && cPartyId && cPartyId !== inv.partyId.toString()) {
        const existing = cartingMap.get(cPartyId) || { amount: 0, name: it.cartingPartyName || 'Unknown Carting Party' };
        existing.amount += cAmt;
        cartingMap.set(cPartyId, existing);
        totalCartingToOthers += cAmt;
      }
    });

    if (totalCartingToOthers === 0) {
      console.log(`Invoice ${inv.invoice_no}: No external carting parties found in items. Skipping.`);
      continue;
    }

    // Perform Repair in a pseudo-transaction (manual deletion/insertion)
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Delete old
        await LedgerEntry.deleteMany({ refId: id, refType: 'INVOICE' }).session(session);

        const newEntries = [];
        const invoiceNo = inv.invoice_no || inv.invoiceNo;

        // 1. Main Party (Net)
        newEntries.push({
          companyId: inv.companyId,
          partyId: inv.partyId,
          partyName: inv.partyName,
          date: inv.date,
          entryType: 'INVOICE',
          refType: 'INVOICE',
          refId: id,
          refNo: invoiceNo,
          debit: isSales ? (grand - totalCartingToOthers) : 0,
          credit: isSales ? 0 : (grand - totalCartingToOthers),
          narration: `${isSales ? 'Sales' : 'Purchase'} Invoice: ${invoiceNo} (Net of Carting) [REPAIRED]`,
          paymentMode: inv.paymentMode,
          metadata: { invoiceType: inv.type, repaired: true }
        });

        // 2. Carting Parties
        cartingMap.forEach((data, cPartyId) => {
          newEntries.push({
            companyId: inv.companyId,
            partyId: cPartyId,
            partyName: data.name,
            date: inv.date,
            entryType: 'INVOICE',
            refType: 'INVOICE',
            refId: id,
            refNo: invoiceNo,
            debit: isSales ? data.amount : 0,
            credit: isSales ? 0 : data.amount,
            narration: `Carting Charges for Invoice: ${invoiceNo} [REPAIRED]`,
            paymentMode: inv.paymentMode,
            metadata: { invoiceType: inv.type, isCarting: true, repaired: true }
          });
        });

        await LedgerEntry.insertMany(newEntries, { session });
      });
      repairedCount++;
      console.log(`Invoice ${inv.invoice_no}: REPAIRED SUCCESS.`);
    } catch (err) {
      console.error(`Invoice ${inv.invoice_no}: REPAIR FAILED:`, err.message);
    } finally {
      session.endSession();
    }
  }

  console.log(`Repair complete. ${repairedCount} invoices updated.`);
  process.exit(0);
}

run().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
