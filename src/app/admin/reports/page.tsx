'use client';
import React, { useState } from 'react';
import { Button, Table, Card, Select, Input } from '../../../components/ui/Common';
import { Download } from 'lucide-react';

const Tabs = ({ active, setActive, tabs }: any) => (
  <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto mb-6 overflow-x-auto">
    {tabs.map((tab: string) => (
      <button key={tab} onClick={() => setActive(tab)} className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all ${active === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{tab}</button>
    ))}
  </div>
);

export default function Reports() {
  const [activeTab, setActiveTab] = useState('Stock');

  const sampleStock = [
    { name: 'Cement Bag (50kg)', unitLabel: '100 BAG', purchaseRate: 350, totalValue: '₹ 35,000' },
    { name: 'Bricks (Red)', unitLabel: '5000 PCS', purchaseRate: 8, totalValue: '₹ 40,000' }
  ];

  const sampleOutstanding = [
    { name: 'Ramesh Traders', mobile: '9876543210', type: 'receive', amount: 2500, opening: 2500, billed: 0, paid: 0 },
    { name: 'Suresh Supplies', mobile: '9123456780', type: 'pay', amount: 5000, opening: 5000, billed: 0, paid: 0 }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h1 className="text-2xl font-bold text-slate-800">Business Reports</h1>
        <Button variant="outline" icon={Download}>Export PDF</Button>
      </div>

      <Tabs active={activeTab} setActive={setActiveTab} tabs={[ 'Stock', 'Outstanding', 'Ledger' ]} />

      {/* Stock Tab */}
      {activeTab === 'Stock' && (
        <>
          <div className="md:hidden space-y-4">
            {sampleStock.map((s, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800">{s.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">Purchase Rate<br/><span className="font-semibold text-slate-700">₹ {s.purchaseRate}</span></p>
                  </div>
                  <div className="text-right">
                    <div className="inline-block px-2 py-1 bg-slate-100 rounded text-xs font-semibold text-blue-600">{s.unitLabel}</div>
                    <div className="mt-3 font-bold text-slate-800">{s.totalValue}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <Card title="Stock Summary">
              <Table headers={[ 'Item Name', 'Purchase Rate', 'Total Value' ]}>
                {sampleStock.map((s, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3">{s.name}</td>
                    <td className="px-4 py-3">₹ {s.purchaseRate}</td>
                    <td className="px-4 py-3 font-bold">{s.totalValue}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          </div>
        </>
      )}

      {/* Outstanding Tab */}
      {activeTab === 'Outstanding' && (
        <>
          <div className="md:hidden space-y-4">
            {sampleOutstanding.map((p, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800">{p.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">{p.mobile}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${p.type === 'receive' ? 'text-green-600' : 'text-rose-600'}`}>₹ {p.amount}</div>
                    <div className="text-xs text-slate-400 mt-1">{p.type === 'receive' ? 'TO RECEIVE' : 'TO PAY'}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                  <div className="bg-slate-50 p-2 rounded">Opening<br/><span className="font-semibold text-slate-700">₹ {p.opening}</span></div>
                  <div className="bg-slate-50 p-2 rounded">Billed<br/><span className="font-semibold text-slate-700">₹ {p.billed}</span></div>
                  <div className="bg-slate-50 p-2 rounded">Paid/Recvd<br/><span className="font-semibold text-slate-700">₹ {p.paid}</span></div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <Card title="Outstanding Payments">
              <Table headers={[ 'Party', 'Mobile', 'Status', 'Amount' ]}>
                {sampleOutstanding.map((p, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3">{p.mobile}</td>
                    <td className="px-4 py-3 text-sm">{p.type === 'receive' ? 'To Receive' : 'To Pay'}</td>
                    <td className="px-4 py-3 font-bold">₹ {p.amount}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          </div>
        </>
      )}

      {/* Ledger Tab */}
      {activeTab === 'Ledger' && (
        <div className="space-y-4">
          <div className="md:grid md:grid-cols-3 md:gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-100">
              <label className="text-xs text-slate-500 mb-2 block">Select Party</label>
              <Select options={[{ label: 'Select Party...', value: '' }]} />
              <label className="text-xs text-slate-500 mb-2 block mt-3">From Date</label>
              <Input type="date" />
              <label className="text-xs text-slate-500 mb-2 block mt-3">To Date</label>
              <Input type="date" />
              <Button className="mt-3">Get Ledger</Button>
            </div>
            <div className="md:col-span-2">
              <Card title="Detailed Ledger">
                <div className="text-center text-slate-400 py-8">Select a party and date range to view ledger</div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
