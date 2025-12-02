#!/usr/bin/env node
// Safe invoice deletion script
// Usage examples:
//  node scripts/delete-invoices.js --type=SALES,PURCHASE --dry-run
//  node scripts/delete-invoices.js --type=SALES,PURCHASE --yes

const dbConnect = require('../src/lib/mongodb').default || require('../src/lib/mongodb');
const Invoice = require('../src/lib/models/Invoice').default || require('../src/lib/models/Invoice');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  args.forEach(a => {
    if (a.startsWith('--')) {
      const [k,v] = a.slice(2).split('=');
      out[k] = typeof v === 'undefined' ? true : v;
    }
  });
  return out;
}

(async function main(){
  const args = parseArgs();
  const typesArg = args.type || 'SALES,PURCHASE';
  const types = typesArg.split(',').map(s => s.trim()).filter(Boolean);
  const dryRun = !!args['dry-run'] || !!args.dryrun || !!args.dry;
  const yes = !!args.yes || !!args['--yes'];
  const before = args.before ? new Date(args.before) : null;

  console.log('Connecting to MongoDB...');
  try {
    await dbConnect();
  } catch (e) {
    console.error('Failed to connect:', e);
    process.exit(1);
  }

  const query = { type: { $in: types } };
  if (before) {
    // match by invoice date OR createdAt
    query.$or = [ { date: { $lt: before } }, { createdAt: { $lt: before } } ];
  }

  try {
    const total = await Invoice.countDocuments(query);
    console.log(`Matched invoices: ${total}`);
    if (total === 0) {
      console.log('No invoices matched. Exiting.');
      process.exit(0);
    }

    const sample = await Invoice.find(query).limit(20).select('_id invoiceNo partyId date type').lean();
    console.log('Sample documents (up to 20):');
    sample.forEach(s => console.log(JSON.stringify(s)));

    if (dryRun) {
      console.log('\nDry-run mode. No documents were deleted. To delete, re-run without --dry-run and with --yes to confirm.');
      process.exit(0);
    }

    if (!yes) {
      console.log('\nTo actually delete these documents, re-run the command with the --yes flag. Exiting.');
      process.exit(0);
    }

    // proceed to delete
    console.log('Deleting invoices...');
    const res = await Invoice.deleteMany(query);
    console.log(`Deleted ${res.deletedCount} invoices.`);
    process.exit(0);
  } catch (err) {
    console.error('Error while deleting invoices:', err);
    process.exit(1);
  }
})();
