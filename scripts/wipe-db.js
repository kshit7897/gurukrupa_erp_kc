#!/usr/bin/env node
// Wipe DB script - deletes all collections except Company
// Usage:
//  node scripts/wipe-db.js --dry-run
//  node scripts/wipe-db.js --yes

const dbConnect = require('../src/lib/mongodb').default || require('../src/lib/mongodb');
const mongoose = require('mongoose');

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
  const dryRun = !!args['dry-run'] || !!args.dryrun || !!args.dry;
  const yes = !!args.yes || !!args['--yes'];

  console.log('Connecting to MongoDB...');
  try {
    await dbConnect();
  } catch (e) {
    console.error('Failed to connect:', e);
    process.exit(1);
  }

  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const exclude = ['companys', 'companies']; // common plural names - we'll ensure Company stays
    // build list of collections to drop except Company
    const toDrop = collections
      .map(c => c.name)
      .filter(name => {
        const low = name.toLowerCase();
        if (low === 'company' || low === 'companies' || low === 'companys') return false;
        // avoid system collections
        if (low.startsWith('system.')) return false;
        return true;
      });

    if (toDrop.length === 0) {
      console.log('No collections to drop (only Company present). Exiting.');
      process.exit(0);
    }

    console.log('Collections found:');
    collections.map(c => console.log(` - ${c.name}`));

    console.log('\nCollections that will be DROPPED (except company):');
    toDrop.forEach(c => console.log(` - ${c}`));

    // show counts
    console.log('\nDocument counts preview:');
    for (const name of toDrop) {
      const count = await mongoose.connection.db.collection(name).countDocuments();
      console.log(` - ${name}: ${count}`);
    }

    if (dryRun) {
      console.log('\nDry-run mode. No collections were dropped. To drop, re-run without --dry-run and with --yes to confirm.');
      process.exit(0);
    }

    if (!yes) {
      console.log('\nTo actually drop these collections, re-run the command with the --yes flag. Exiting.');
      process.exit(0);
    }

    // drop collections
    for (const name of toDrop) {
      try {
        await mongoose.connection.db.dropCollection(name);
        console.log(`Dropped collection ${name}`);
      } catch (e) {
        console.error(`Failed to drop ${name}:`, e.message || e);
      }
    }

    console.log('\nDone. Collections dropped.');
    process.exit(0);
  } catch (err) {
    console.error('Error while inspecting/dropping collections:', err);
    process.exit(1);
  }
})();
