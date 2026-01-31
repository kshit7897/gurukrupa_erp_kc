import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import OtherTxn from '../../../lib/models/OtherTxn';
import LedgerEntry from '../../../lib/models/LedgerEntry';
import { getCompanyContextFromRequest } from '../../../lib/companyContext';

async function syncLedgerEntries(txn: any, companyId: string) {
  console.log(`[LEDGER_SYNC] Starting sync for ${txn._id} type: ${txn.txnType}`);
  // First, delete existing ledger entries for this transaction
  await LedgerEntry.deleteMany({ refType: 'OTHER_TXN', refId: txn._id });

  const entries: any[] = [];

  // FROM Account: Credit (Money going out/Source)
  if (txn.fromId) {
    console.log(`[LEDGER_SYNC] Adding FROM entry for ${txn.fromId} (${txn.fromName})`);
    entries.push({
      companyId,
      partyId: txn.fromId,
      partyName: txn.fromName,
      date: txn.date,
      entryType: txn.txnType || 'OTHER',
      refType: 'OTHER_TXN',
      refId: txn._id,
      refNo: txn.referenceNo,
      credit: txn.amount,
      debit: 0,
      narration: txn.note || `${txn.txnType} - To ${txn.toName || 'General'}`,
    });
  }

  // TO Account: Debit (Money coming in/Destination)
  if (txn.toId) {
    console.log(`[LEDGER_SYNC] Adding TO entry for ${txn.toId} (${txn.toName})`);
    entries.push({
      companyId,
      partyId: txn.toId,
      partyName: txn.toName,
      date: txn.date,
      entryType: txn.txnType || 'OTHER',
      refType: 'OTHER_TXN',
      refId: txn._id,
      refNo: txn.referenceNo,
      debit: txn.amount,
      credit: 0,
      narration: txn.note || `${txn.txnType} - From ${txn.fromName || 'General'}`,
    });
  }

  if (entries.length > 0) {
    try {
        const res = await LedgerEntry.insertMany(entries);
        console.log(`[LEDGER_SYNC] Successfully inserted ${res.length} entries`);
    } catch (err: any) {
        console.error(`[LEDGER_SYNC] FAILED to insert ledger entries:`, err.message);
        throw err;
    }
  } else {
    console.log(`[LEDGER_SYNC] NO entries to insert (missing fromId and toId)`);
  }
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const kind = url.searchParams.get('kind');
    const txnType = url.searchParams.get('txnType');
    
    const q: any = { companyId };
    if (kind) q.kind = kind;
    if (txnType) q.txnType = txnType;
    if (from && to) q.date = { $gte: from, $lte: to };

    const items = await OtherTxn.find(q).sort({ date: -1, createdAt: -1 }).lean();
    return NextResponse.json(items.map((t: any) => ({ ...t, id: t._id?.toString() })));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    
    const body = await request.json();
    if (!body.date || typeof body.amount !== 'number') {
      return NextResponse.json({ error: 'date and amount required' }, { status: 400 });
    }

    // Set 'kind' for backward compatibility with P&L report
    // Only set if it's income or expense to avoid enum validation errors on Contra
    if (body.txnType === 'INCOME') body.kind = 'income';
    else if (body.txnType === 'EXPENSE') body.kind = 'expense';
    else body.kind = undefined;

    const txnData = {
      companyId,
      txnType: body.txnType,
      date: body.date,
      amount: body.amount,
      fromId: body.fromId,
      fromName: body.fromName,
      toId: body.toId,
      toName: body.toName,
      referenceNo: body.referenceNo,
      note: body.note,
      category: body.category,
      kind: body.kind
    };
    console.log(`[OTHER_TXN] Creating with data:`, JSON.stringify(txnData));
    const doc = (await OtherTxn.create(txnData)) as any;
    console.log(`[OTHER_TXN] Saved Doc ID: ${doc._id}`);
    await syncLedgerEntries(doc, companyId);

    return NextResponse.json({ ...doc.toObject(), id: doc._id.toString() });
  } catch (err: any) {
    console.error('POST /api/other-txns error', err);
    return NextResponse.json({ error: err?.message || 'Failed to create' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    
    const body = await request.json();
    const { id, _id, ...data } = body;
    const targetId = id || _id;
    if (!targetId) return NextResponse.json({ error: 'id required' }, { status: 400 });
    
    const existing = await OtherTxn.findOne({ _id: targetId, companyId });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Set 'kind' for backward compatibility
    if (data.txnType === 'INCOME') data.kind = 'income';
    else if (data.txnType === 'EXPENSE') data.kind = 'expense';
    else data.kind = undefined;

    const updatedData = {
      ...data,
      txnType: data.txnType,
      fromId: data.fromId,
      fromName: data.fromName,
      toId: data.toId,
      toName: data.toName,
      companyId
    };
    const doc = await OtherTxn.findByIdAndUpdate(targetId, updatedData, { new: true });
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await syncLedgerEntries(doc, companyId);
    return NextResponse.json({ ...doc.toObject(), id: doc._id.toString() });
  } catch (err: any) {
    console.error('PUT /api/other-txns error', err);
    return NextResponse.json({ error: err?.message || 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { companyId } = getCompanyContextFromRequest(request);
    if (!companyId) return NextResponse.json({ error: 'No company selected' }, { status: 400 });
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    
    const existing = await OtherTxn.findOne({ _id: id, companyId });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    await LedgerEntry.deleteMany({ refType: 'OTHER_TXN', refId: id });
    await OtherTxn.findByIdAndDelete(id);
    
    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error('DELETE /api/other-txns error', err);
    return NextResponse.json({ error: err?.message || 'Failed to delete' }, { status: 500 });
  }
}
