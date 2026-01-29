/**
 * Migration Script: Single-Company to Multi-Company
 * 
 * This script migrates existing single-company data to the multi-company structure.
 * It creates a default company and assigns all existing records to it.
 * 
 * Usage: node scripts/migrate-to-multicompany.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gurukrupaerp';

// Schemas (simplified for migration)
const CompanySchema = new mongoose.Schema({
  name: String,
  gstNumber: String,
  phone: String,
  email: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  gstin: String,
  cin: String,
  bank_name: String,
  bank_account_no: String,
  ifsc_code: String,
  upi_id: String,
  openingBalance: Number,
  logo: String,
  createdBy: String,
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

const UserCompanyAccessSchema = new mongoose.Schema({
  userId: String,
  companyId: String,
  role: String,
  permissions: [String],
  isDefault: Boolean,
  isActive: Boolean,
  grantedBy: String
}, { timestamps: true });

const PartySchema = new mongoose.Schema({ companyId: String }, { strict: false });
const InvoiceSchema = new mongoose.Schema({ companyId: String }, { strict: false });
const PaymentSchema = new mongoose.Schema({ companyId: String }, { strict: false });
const LedgerEntrySchema = new mongoose.Schema({ companyId: String }, { strict: false });
const ItemSchema = new mongoose.Schema({ companyId: String }, { strict: false });
const StockMovementSchema = new mongoose.Schema({ companyId: String }, { strict: false });
const OtherTxnSchema = new mongoose.Schema({ companyId: String }, { strict: false });
const CounterSchema = new mongoose.Schema({ companyId: String, key: String }, { strict: false });
const UserSchema = new mongoose.Schema({}, { strict: false });

async function migrate() {
  console.log('🚀 Starting multi-company migration...\n');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const Company = mongoose.models.Company || mongoose.model('Company', CompanySchema);
    const UserCompanyAccess = mongoose.models.UserCompanyAccess || mongoose.model('UserCompanyAccess', UserCompanyAccessSchema);
    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Party = mongoose.models.Party || mongoose.model('Party', PartySchema);
    const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
    const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
    const LedgerEntry = mongoose.models.LedgerEntry || mongoose.model('LedgerEntry', LedgerEntrySchema);
    const Item = mongoose.models.Item || mongoose.model('Item', ItemSchema);
    const StockMovement = mongoose.models.StockMovement || mongoose.model('StockMovement', StockMovementSchema);
    const OtherTxn = mongoose.models.OtherTxn || mongoose.model('OtherTxn', OtherTxnSchema);
    const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);
    
    // Step 1: Check if there's already a company
    let defaultCompany = await Company.findOne({ isDefault: true });
    
    if (!defaultCompany) {
      // Check if any company exists
      const existingCompany = await Company.findOne({});
      
      if (existingCompany) {
        // Mark existing company as default
        existingCompany.isDefault = true;
        existingCompany.isActive = true;
        await existingCompany.save();
        defaultCompany = existingCompany;
        console.log(`✅ Marked existing company "${defaultCompany.name}" as default\n`);
      } else {
        // Create a default company
        defaultCompany = await Company.create({
          name: 'Gurukrupa (Default)',
          isDefault: true,
          isActive: true
        });
        console.log('✅ Created default company "Gurukrupa (Default)"\n');
      }
    } else {
      console.log(`✅ Default company already exists: "${defaultCompany.name}"\n`);
    }
    
    const companyId = defaultCompany._id.toString();
    console.log(`📌 Default Company ID: ${companyId}\n`);
    
    // Step 2: Grant all existing users access to the default company
    const users = await User.find({});
    console.log(`👥 Found ${users.length} users\n`);
    
    for (const user of users) {
      const userId = user._id.toString();
      const existing = await UserCompanyAccess.findOne({ userId, companyId });
      
      if (!existing) {
        await UserCompanyAccess.create({
          userId,
          companyId,
          role: user.role || 'staff',
          permissions: user.permissions || [],
          isDefault: true,
          isActive: true
        });
        console.log(`  ✅ Granted access to user: ${user.username || user.name || userId}`);
      } else {
        console.log(`  ⏭️  User already has access: ${user.username || user.name || userId}`);
      }
    }
    console.log();
    
    // Step 3: Migrate all data to include companyId
    const collections = [
      { model: Party, name: 'Parties' },
      { model: Invoice, name: 'Invoices' },
      { model: Payment, name: 'Payments' },
      { model: LedgerEntry, name: 'Ledger Entries' },
      { model: Item, name: 'Items' },
      { model: StockMovement, name: 'Stock Movements' },
      { model: OtherTxn, name: 'Other Transactions' }
    ];
    
    for (const { model, name } of collections) {
      const result = await model.updateMany(
        { companyId: { $exists: false } },
        { $set: { companyId } }
      );
      console.log(`📦 ${name}: Updated ${result.modifiedCount} records`);
    }
    
    // Step 4: Update counters to include companyId
    const counters = await Counter.find({ companyId: { $exists: false } });
    for (const counter of counters) {
      // Update counter key to include company prefix
      const newKey = counter.key.includes(companyId) ? counter.key : `${counter.key}`;
      await Counter.updateOne(
        { _id: counter._id },
        { $set: { companyId } }
      );
    }
    console.log(`🔢 Counters: Updated ${counters.length} records\n`);
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   - Default Company: ${defaultCompany.name} (${companyId})`);
    console.log(`   - Users with access: ${users.length}`);
    console.log(`   - All existing data now belongs to the default company\n`);
    console.log('🎉 You can now use multi-company features!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrate();
