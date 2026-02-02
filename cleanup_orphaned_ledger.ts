import dbConnect from './src/lib/mongodb';
import LedgerEntry from './src/lib/models/LedgerEntry';
import Invoice from './src/lib/models/Invoice';

const partyId = '697a036e78808c3ca08dd913';

async function cleanupOrphanedEntries() {
  await dbConnect();
  
  console.log('\n=== Cleaning up orphaned ledger entries ===\n');
  
  // Get all INVOICE type ledger entries for this party
  const invoiceEntries = await LedgerEntry.find({ 
    partyId,
    entryType: 'INVOICE'
  }).lean();
  
  console.log(`Found ${invoiceEntries.length} INVOICE ledger entries`);
  
  let orphaned = 0;
  let valid = 0;
  const orphanedIds = [];
  
  for (const entry of invoiceEntries) {
    // Check if the invoice still exists
    const invoice = await Invoice.findById(entry.refId);
    
    if (!invoice) {
      orphaned++;
      orphanedIds.push(entry._id);
      console.log(`  ❌ Orphaned: ${entry.refNo} (Invoice ${entry.refId} not found)`);
    } else {
      valid++;
    }
  }
  
  console.log(`\nSummary:`);
  console.log(`  Valid entries: ${valid}`);
  console.log(`  Orphaned entries: ${orphaned}`);
  
  if (orphaned > 0) {
    console.log(`\n⚠️  Found ${orphaned} orphaned ledger entries!`);
    console.log(`\nTo clean them up, run:`);
    console.log(`  node cleanup_orphaned_ledger.ts --confirm`);
  } else {
    console.log(`\n✅ No orphaned entries found`);
  }
  
  // If --confirm flag is passed, actually delete them
  if (process.argv.includes('--confirm')) {
    console.log(`\n🗑️  Deleting ${orphaned} orphaned entries...`);
    const result = await LedgerEntry.deleteMany({ 
      _id: { $in: orphanedIds }
    });
    console.log(`✅ Deleted ${result.deletedCount} orphaned ledger entries`);
  }
}

cleanupOrphanedEntries()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
