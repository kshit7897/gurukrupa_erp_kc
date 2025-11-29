#!/usr/bin/env node
/**
 * seeds the MongoDB cluster with dummy data for Items, Parties and Invoices.
 *
 * Usage:
 *  - Set your connection string in environment variable `MONGODB_URI` then run:
 *      node scripts/seed.js
 *  - or pass the URI as the first argument:
 *      node scripts/seed.js "mongodb+srv://user:pass@cluster..."
 *
 * NOTE: Do NOT commit credentials to source control. Keep the URI secret.
 */

const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || process.argv[2];
if (!uri) {
  console.error('ERROR: Please provide MongoDB URI via MONGODB_URI env var or as first argument.');
  process.exit(1);
}

const ItemSchema = new mongoose.Schema({
  name: String,
  hsn: String,
  unit: String,
  purchaseRate: Number,
  saleRate: Number,
  taxPercent: Number,
  barcode: String,
  stock: Number
}, { timestamps: true });

const PartySchema = new mongoose.Schema({
  name: String,
  mobile: String,
  email: String,
  address: String,
  gstNo: String,
  openingBalance: Number,
  type: String
}, { timestamps: true });

const InvoiceItemSub = new mongoose.Schema({
  itemId: String,
  name: String,
  qty: Number,
  rate: Number,
  taxPercent: Number,
  amount: Number
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
  invoiceNo: String,
  date: String,
  partyId: String,
  partyName: String,
  items: [InvoiceItemSub],
  subtotal: Number,
  taxAmount: Number,
  roundOff: Number,
  grandTotal: Number,
  type: String,
  paymentMode: String,
  paymentDetails: String,
  dueDate: String
}, { timestamps: true });

// Use the same model names as the app so collections match (items, parties, invoices)
const Item = mongoose.model('Item', ItemSchema);
const Party = mongoose.model('Party', PartySchema);
const Invoice = mongoose.model('Invoice', InvoiceSchema);

const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected.');

    // Only insert if collections are empty to avoid duplicates
    const itemCount = await Item.countDocuments();
    const partyCount = await Party.countDocuments();
    const invoiceCount = await Invoice.countDocuments();

    if (itemCount === 0) {
      console.log('Inserting sample items...');
      await Item.insertMany([
        { name: 'Cement Bag (50kg)', hsn: '2523', unit: 'BAG', purchaseRate: 350, saleRate: 400, taxPercent: 18, stock: 100 },
        { name: 'Bricks (Red)', hsn: '6901', unit: 'PCS', purchaseRate: 8, saleRate: 12, taxPercent: 5, stock: 5000 }
      ]);
      console.log('Items seeded.');
    } else {
      console.log('Items collection already has data, skipping items seed.');
    }

    if (partyCount === 0) {
      console.log('Inserting sample parties...');
      const parties = await Party.insertMany([
        { name: 'Ramesh Traders', mobile: '9876543210', email: 'ramesh@example.com', address: 'Pune', gstNo: '', openingBalance: 2500, type: 'Customer' },
        { name: 'Suresh Supplies', mobile: '9123456780', email: 'suresh@example.com', address: 'Mumbai', gstNo: '', openingBalance: 5000, type: 'Supplier' }
      ]);
      console.log('Parties seeded.');

      // create a sample invoice for the first party
      if (invoiceCount === 0) {
        console.log('Creating a sample invoice...');
        const items = await Item.find().limit(1);
        const inv = {
          invoiceNo: 'INV-1001',
          date: new Date().toISOString().split('T')[0],
          partyId: parties[0]._id.toString(),
          partyName: parties[0].name,
          items: [{ itemId: items[0]._id.toString(), name: items[0].name, qty: 10, rate: items[0].saleRate, taxPercent: items[0].taxPercent, amount: 10 * items[0].saleRate }],
          subtotal: 10 * items[0].saleRate,
          taxAmount: (10 * items[0].saleRate) * (items[0].taxPercent / 100),
          roundOff: 0,
          grandTotal: (10 * items[0].saleRate) + ((10 * items[0].saleRate) * (items[0].taxPercent / 100)),
          type: 'SALES',
          paymentMode: 'cash'
        };
        await Invoice.create(inv);
        console.log('Sample invoice created.');
      } else {
        console.log('Invoices collection already has data, skipping invoice seed.');
      }
    } else {
      console.log('Parties collection already has data, skipping parties seed.');
    }

    // Seed a user for login
    const User = mongoose.modelNames().includes('User') ? mongoose.model('User') : mongoose.model('User', new mongoose.Schema({ username: String, password: String, name: String, role: String }));
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Inserting default admin user...');
      const hashed = await bcrypt.hash('admin', 10);
      await User.create({ username: 'admin', password: hashed, name: 'Super Admin', role: 'admin' });
      console.log('Admin user created (admin / admin) — stored with hashed password');
    } else {
      console.log('Users collection already has data, skipping user seed.');
    }

    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
    process.exit(0);
  }
}

seed();
