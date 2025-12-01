import Item from './models/Item';
import StockMovement from './models/StockMovement';

export async function increaseStock(itemId: string, qty: number, opts: { type?: string; refId?: string; note?: string } = {}) {
  if (!itemId) throw new Error('itemId required');
  if (qty <= 0) throw new Error('qty must be > 0');

  const updated = await Item.findByIdAndUpdate(itemId, { $inc: { stock: qty } }, { new: true });
  if (!updated) throw new Error('Item not found');
  const prev = (updated.stock || 0) - qty;
  await StockMovement.create({ itemId, qty: qty, type: (opts.type || 'PURCHASE'), refId: opts.refId, note: opts.note, prevStock: prev, newStock: updated.stock });
  return updated;
}

export async function decreaseStock(itemId: string, qty: number, opts: { type?: string; refId?: string; note?: string } = {}) {
  if (!itemId) throw new Error('itemId required');
  if (qty <= 0) throw new Error('qty must be > 0');

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
  const ops: {id:string, qty:number, name?:string}[] = invoice.items.map((it:any) => ({ id: it.itemId || it.itemId, qty: Number(it.qty || it.qty) }));

  const applied: { id: string; qty: number }[] = [];
  try {
    if (invoice.type === 'SALES') {
      for (const it of ops) {
        await decreaseStock(it.id, it.qty, { type: 'SALE', refId: invoice.id || invoice._id });
        applied.push(it);
      }
    } else if (invoice.type === 'PURCHASE') {
      for (const it of ops) {
        await increaseStock(it.id, it.qty, { type: 'PURCHASE', refId: invoice.id || invoice._id });
        applied.push(it);
      }
    }
  } catch (err) {
    // rollback applied ops
    for (const a of applied.reverse()) {
      try {
        if (invoice.type === 'SALES') {
          // revert previous decrease by increasing back
          await increaseStock(a.id, a.qty, { type: 'ADJUSTMENT', refId: invoice.id || invoice._id, note: 'rollback' });
        } else if (invoice.type === 'PURCHASE') {
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

export default { increaseStock, decreaseStock, updateStockForInvoice };
