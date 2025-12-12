import Item from './models/Item';
import StockMovement from './models/StockMovement';

type StockOpts = { type?: string; refId?: string; note?: string };

function normalizeLine(line: any) {
  // Accept multiple shapes to avoid silent no-ops when fields come differently from UI/DB
  const id = line?.itemId || line?.item_id || line?.id || line?._id;
  const qtyRaw = line?.qty ?? line?.quantity ?? line?.qtyOrdered ?? line?.qty_ordered;
  const qty = Number(qtyRaw);
  if (!id) throw new Error('itemId required');
  if (!Number.isFinite(qty) || qty <= 0) throw new Error(`qty must be > 0 for item ${id}`);
  return { id: String(id), qty };
}

function normalizeType(type: any) {
  const t = String(type || '').trim().toUpperCase();
  if (t === 'SALE') return 'SALES';
  if (t === 'PUR') return 'PURCHASE';
  return t as 'SALES' | 'PURCHASE' | '';
}

export async function increaseStock(itemId: string, qty: number, opts: StockOpts = {}) {
  if (!itemId) throw new Error('itemId required');
  if (!Number.isFinite(qty) || qty <= 0) throw new Error('qty must be > 0');

  const updated = await Item.findByIdAndUpdate(itemId, { $inc: { stock: qty } }, { new: true });
  if (!updated) throw new Error('Item not found');
  const prev = (updated.stock || 0) - qty;
  await StockMovement.create({ itemId, qty: qty, type: (opts.type || 'PURCHASE'), refId: opts.refId, note: opts.note, prevStock: prev, newStock: updated.stock });
  return updated;
}

export async function decreaseStock(itemId: string, qty: number, opts: StockOpts = {}) {
  if (!itemId) throw new Error('itemId required');
  if (!Number.isFinite(qty) || qty <= 0) throw new Error('qty must be > 0');

  // Try conditional update to prevent negative stock
  const updated = await Item.findOneAndUpdate({ _id: itemId, stock: { $gte: qty } }, { $inc: { stock: -qty } }, { new: true });
  if (!updated) throw new Error('Insufficient stock or item not found');
  const prev = (updated.stock || 0) + qty;
  await StockMovement.create({ itemId, qty: -qty, type: (opts.type || 'SALE'), refId: opts.refId, note: opts.note, prevStock: prev, newStock: updated.stock });
  return updated;
}

export async function updateStockForInvoice(invoice: any) {
  // invoice.items expected: [{ itemId, qty }]
  if (!invoice || !Array.isArray(invoice.items)) return;
  const invType = normalizeType(invoice.type);
  if (invType !== 'SALES' && invType !== 'PURCHASE') {
    throw new Error('Invoice type missing or invalid for stock update');
  }

  const ops = invoice.items.map((it: any) => normalizeLine(it));

  const applied: { id: string; qty: number }[] = [];
  try {
    if (invType === 'SALES') {
      for (const it of ops) {
        await decreaseStock(it.id, it.qty, { type: 'SALE', refId: invoice.id || invoice._id });
        applied.push(it);
      }
    } else {
      for (const it of ops) {
        await increaseStock(it.id, it.qty, { type: 'PURCHASE', refId: invoice.id || invoice._id });
        applied.push(it);
      }
    }
  } catch (err) {
    // rollback applied ops
    for (const a of applied.reverse()) {
      try {
        if (invType === 'SALES') {
          // revert previous decrease by increasing back
          await increaseStock(a.id, a.qty, { type: 'ADJUSTMENT', refId: invoice.id || invoice._id, note: 'rollback' });
        } else {
          // revert previous increase by decreasing
          await decreaseStock(a.id, a.qty, { type: 'ADJUSTMENT', refId: invoice.id || invoice._id, note: 'rollback' });
        }
      } catch (e) {
        // swallow - best effort rollback
        console.error('Rollback failed for stock op', a, e);
      }
    }
    throw err;
  }
}

export async function revertStockForInvoice(invoice: any) {
  // invoice.items expected: [{ itemId, qty }]
  // Return an array of warning/error messages instead of throwing, so callers can decide how to proceed.
  const warnings: string[] = [];
  if (!invoice || !Array.isArray(invoice.items)) return warnings;
  const invType = normalizeType(invoice.type);
  if (invType !== 'SALES' && invType !== 'PURCHASE') {
    warnings.push('Invoice type missing or invalid; cannot revert stock');
    return warnings;
  }

  const ops = invoice.items.map((it: any) => normalizeLine(it));

  // For SALES we need to increase stock back; for PURCHASE we need to decrease stock (remove purchased qty)
  if (invType === 'SALES') {
    for (const it of ops) {
      try {
        await increaseStock(it.id, it.qty, { type: 'ADJUSTMENT', refId: invoice.id || invoice._id, note: 'revert invoice (sale)' });
      } catch (e: any) {
        const errMsg = (e && e.message) ? e.message.toString() : String(e);
        if (errMsg.includes('Item not found')) {
          // Item was deleted from master. Create a StockMovement record so reports reflect the revert,
          // but don't treat this as a blocking warning.
          try {
            await StockMovement.create({ itemId: it.id, qty: it.qty, type: 'ADJUSTMENT', refId: invoice.id || invoice._id, note: 'item missing - recorded revert movement (sale)', prevStock: null, newStock: null });
          } catch (smErr) {
            const serr = (smErr && (smErr as any).message) ? (smErr as any).message : String(smErr);
            const msg = `Failed to record movement for missing SALE item ${it.id}: ${serr}`;
            console.error(msg);
            warnings.push(msg);
          }
        } else {
          const msg = `Failed to revert SALE item ${it.id}: ${errMsg}`;
          console.error(msg);
          warnings.push(msg);
        }
      }
    }
  } else {
    for (const it of ops) {
      try {
        // this may throw if current stock is insufficient to remove the purchase quantity
        await decreaseStock(it.id, it.qty, { type: 'ADJUSTMENT', refId: invoice.id || invoice._id, note: 'revert invoice (purchase)' });
      } catch (e: any) {
        const errMsg = (e && e.message) ? e.message.toString() : String(e);
        if (errMsg.includes('Item not found')) {
          try {
            await StockMovement.create({ itemId: it.id, qty: -it.qty, type: 'ADJUSTMENT', refId: invoice.id || invoice._id, note: 'item missing - recorded revert movement (purchase)', prevStock: null, newStock: null });
          } catch (smErr) {
            const serr = (smErr && (smErr as any).message) ? (smErr as any).message : String(smErr);
            const msg = `Failed to record movement for missing PURCHASE item ${it.id}: ${serr}`;
            console.error(msg);
            warnings.push(msg);
          }
        } else {
          const msg = `Failed to revert PURCHASE item ${it.id}: ${errMsg}`;
          console.error(msg);
          warnings.push(msg);
        }
      }
    }
  }

  return warnings;
}

export default { increaseStock, decreaseStock, updateStockForInvoice, revertStockForInvoice };
