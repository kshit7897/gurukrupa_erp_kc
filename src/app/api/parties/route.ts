import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Party from '../../../lib/models/Party';
import LedgerEntry from '../../../lib/models/LedgerEntry';
import { getCompanyContextFromRequest } from '../../../lib/companyContext';

export async function GET(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const role = searchParams.get('role'); // Filter by role
  const type = searchParams.get('type'); // Filter by type (backward compatible)
  const systemAccounts = searchParams.get('systemAccounts'); // Include system accounts

  // Get company context
  const { companyId } = getCompanyContextFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: 'No company selected' }, { status: 400 });
  }

  try {
    if (id) {
      const party = await Party.findOne({ _id: id, companyId });
      if (!party) {
        return NextResponse.json({ error: 'Party not found' }, { status: 404 });
      }
      return NextResponse.json({ ...(party as any).toObject(), id: (party as any)._id.toString() });
    }

    // Build query with company scope
    const query: any = {
      companyId
    };
    
    // Filter by role if provided
    if (role) {
      query.roles = role;
    }
    
    // Filter by type for backward compatibility
    if (type) {
      query.type = type;
    }
    
    // Exclude system accounts by default unless explicitly requested
    if (systemAccounts !== 'true') {
      query.isSystemAccount = { $ne: true };
    }

    const parties = await Party.find(query).sort({ createdAt: -1 });
    const formatted = parties.map(doc => ({ ...(doc as any).toObject(), id: (doc as any)._id.toString() }));
    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Party API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    // Get company context
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Add company scope
    body.companyId = companyId;
    
    // Ensure roles array is set
    if (!body.roles || body.roles.length === 0) {
      // Default roles based on type for backward compatibility
      body.roles = body.type ? [body.type] : ['Customer'];
    }
    
    // Set primary type if not provided
    if (!body.type && body.roles && body.roles.length > 0) {
      body.type = body.roles[0];
    }
    
    // Check if this is a system account
    const systemRoles = ['Cash', 'Bank', 'UPI'];
    if (body.roles.some((r: string) => systemRoles.includes(r))) {
      body.isSystemAccount = true;
    }
    
    // Set default opening balance type
    if (!body.openingBalanceType) {
      // Default based on primary type
      const payableTypes = ['Supplier', 'Owner', 'Partner'];
      body.openingBalanceType = payableTypes.includes(body.type) ? 'CR' : 'DR';
    }
    
    const party = (await Party.create(body)) as any;
    
    // Create opening balance ledger entry if opening balance is non-zero
    if (body.openingBalance && Number(body.openingBalance) !== 0) {
      const today = new Date().toISOString().split('T')[0];
      const balanceType = body.openingBalanceType || 'DR';
      
      await LedgerEntry.create({
        companyId, // Add company scope to ledger entry
        partyId: party._id.toString(),
        partyName: party.name,
        date: today,
        entryType: 'OPENING_BALANCE',
        refType: 'PARTY',
        refId: party._id.toString(),
        refNo: `OB-${party._id.toString().slice(-6).toUpperCase()}`,
        debit: balanceType === 'DR' ? Number(body.openingBalance) : 0,
        credit: balanceType === 'CR' ? Number(body.openingBalance) : 0,
        narration: `Opening balance for ${party.name}`,
        metadata: {
          balanceType: balanceType
        }
      });
      
      // Mark that ledger entry was created
      await Party.findByIdAndUpdate(party._id, { openingBalanceLedgerCreated: true });
    }
    
    return NextResponse.json({ ...(party as any).toObject(), id: (party as any)._id.toString() });
  } catch (error) {
    console.error('Failed to create party:', error);
    return NextResponse.json({ error: 'Failed to create party' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    
    // Get company context
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }
    
    const body = await request.json();
    const { id, ...updateData } = body;
    
    // Get existing party to check for opening balance changes (with company scope)
    const existingParty = await Party.findOne({ 
      _id: id, 
      companyId
    });
    if (!existingParty) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }
    
    // Update roles if provided
    if (updateData.roles && updateData.roles.length > 0) {
      // Set primary type to first role if type not explicitly set
      if (!updateData.type) {
        updateData.type = updateData.roles[0];
      }
      
      // Check if this is a system account
      const systemRoles = ['Cash', 'Bank', 'UPI'];
      updateData.isSystemAccount = updateData.roles.some((r: string) => systemRoles.includes(r));
    }
    
    // Ensure companyId is set (migrate legacy data)
    if (!existingParty.companyId) {
      updateData.companyId = companyId;
    }
    
    const party = await Party.findByIdAndUpdate(id, updateData, { new: true });
    
    // Handle opening balance ledger entry updates
    const newBalance = Number(updateData.openingBalance || 0);
    const oldBalance = Number(existingParty.openingBalance || 0);
    const newBalanceType = updateData.openingBalanceType || existingParty.openingBalanceType || 'DR';
    
    if (newBalance !== oldBalance || updateData.openingBalanceType !== existingParty.openingBalanceType) {
      // Remove old opening balance entry if exists
      await LedgerEntry.deleteMany({
        partyId: id,
        entryType: 'OPENING_BALANCE',
        refType: 'PARTY'
      });
      
      // Create new opening balance entry if balance is non-zero
      if (newBalance !== 0) {
        const today = new Date().toISOString().split('T')[0];
        
        await LedgerEntry.create({
          companyId, // Add company scope
          partyId: id,
          partyName: party.name,
          date: today,
          entryType: 'OPENING_BALANCE',
          refType: 'PARTY',
          refId: id,
          refNo: `OB-${id.slice(-6).toUpperCase()}`,
          debit: newBalanceType === 'DR' ? newBalance : 0,
          credit: newBalanceType === 'CR' ? newBalance : 0,
          narration: `Opening balance for ${party.name}`,
          metadata: {
            balanceType: newBalanceType
          }
        });
        
        await Party.findByIdAndUpdate(id, { openingBalanceLedgerCreated: true });
      }
    }
    
    return NextResponse.json({ ...(party as any).toObject(), id: (party as any)._id.toString() });
  } catch (error) {
    console.error('Failed to update party:', error);
    return NextResponse.json({ error: 'Failed to update party' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    
    // Get company context
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) {
      return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    
    // Verify party belongs to this company
    const party = await Party.findOne({ 
      _id: id, 
      companyId
    });
    if (!party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }
    
    // Check if party has any transactions (with company scope)
    const ledgerEntries = await LedgerEntry.countDocuments({ 
      partyId: id,
      entryType: { $ne: 'OPENING_BALANCE' },
      companyId
    });
    
    if (ledgerEntries > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete party with existing transactions. Please reverse or delete all related transactions first.' 
      }, { status: 400 });
    }
    
    // Delete opening balance ledger entries
    await LedgerEntry.deleteMany({ partyId: id, refType: 'PARTY' });
    
    // Delete the party
    await Party.findByIdAndDelete(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete party:', error);
    return NextResponse.json({ error: 'Failed to delete party' }, { status: 500 });
  }
}