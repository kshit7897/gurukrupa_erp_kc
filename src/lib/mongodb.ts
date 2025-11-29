import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// @ts-ignore
let cached = globalThis.mongoose;

if (!cached) {
  // @ts-ignore
  cached = globalThis.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Set it in your environment before calling dbConnect.');
  }
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
