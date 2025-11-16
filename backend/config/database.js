const { createClient } = require('@supabase/supabase-js');

const globalForPrisma = globalThis;

// ✅ Safely import PrismaClient (may not be generated yet)
let PrismaClient = null;
try {
  PrismaClient = require('@prisma/client').PrismaClient;
} catch (error) {
  console.error('❌ Failed to import PrismaClient:', error.message);
  console.log('⚠️ Prisma client not generated. Run "npm run db:generate" or "prisma generate"');
}

// ✅ Get database URL with safety checks
const getDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    console.warn('⚠️ DATABASE_URL environment variable is not set');
    return null;
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}statement_cache_size=0&prepared_statement_cache_queries=0&idle_in_transaction_session_timeout=30000&lock_timeout=30000`;
};

// ✅ Initialize Prisma client (optimized for Supabase/Railway)
const databaseUrl = getDatabaseUrl();
let prisma = null;

try {
  if (PrismaClient && databaseUrl) {
    prisma = globalForPrisma.prisma ||
      new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
        datasources: {
          db: { url: databaseUrl },
        },
        errorFormat: 'minimal',
      });
  }
} catch (error) {
  console.error('❌ Failed to initialize Prisma client:', error.message);
  console.log('⚠️ Server will start without database connection');
  prisma = null;
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ✅ Connection helpers
async function connectDatabase() {
  if (!prisma) {
    console.log('⚠️ Database not configured - skipping connection');
    return false;
  }

  let retries = 3;
  while (retries > 0) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connected successfully');
      return true;
    } catch (error) {
      console.error(`❌ Connection failed (${4 - retries}/3):`, error.message);
      retries--;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  console.error('❌ All database connection attempts failed');
  return false;
}

async function resetConnection() {
  try {
    console.log('🔄 Resetting Prisma connection...');
    await prisma.$disconnect();
    await new Promise((r) => setTimeout(r, 2000));
    await prisma.$connect();
    console.log('✅ Connection reset successful');
  } catch (error) {
    console.error('❌ Connection reset failed:', error.message);
  }
}

async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('👋 Database disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting database:', error.message);
  }
}

// ✅ Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase configuration missing — storage features disabled.');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

module.exports = {
  prisma,
  supabase,
  connectDatabase,
  disconnectDatabase,
  resetConnection,
};
