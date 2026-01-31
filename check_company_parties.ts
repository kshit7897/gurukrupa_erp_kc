import dbConnect from './src/lib/mongodb';
import Party from './src/lib/models/Party';
import mongoose from 'mongoose';

async function diagnose() {
  await dbConnect();
  
  const targetCompany = "692aa81de5a2d4e38bc00ba8";
  const parties = await Party.find({ companyId: targetCompany }).lean();
  
  console.log(`Company ${targetCompany} has ${parties.length} parties:`);
  parties.forEach(p => {
    console.log(`- ${p.name} (${p._id}), Roles: ${JSON.stringify(p.roles)}, isSystem: ${p.isSystemAccount}`);
  });

  process.exit(0);
}

diagnose().catch(console.error);
