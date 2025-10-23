const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const globalForPrisma = globalThis;

// Optimized Prisma configuration for Railway/Render with multiple connection strategies
const getDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    console.warn('⚠️ DATABASE_URL environment variable is not set');
    return null; // Return null instead of throwing error
  }
  
  console.log('🔍 Original DATABASE_URL host:', baseUrl.split('@')[1]?.split('/')[0]);
  
  // Railway-optimized connection settings with direct connection (no pooler)
  const separator = baseUrl.includes('?') ? '&' : '?';
  // Use direct connection to avoid pooler timeout issues
  const directUrl = baseUrl.replace('.pooler.supabase.com', '.supabase.co');
  return `${directUrl}${separator}connection_limit=5&pool_timeout=20&connect_timeout=10&statement_cache_size=0&prepared_statement_cache_queries=0&idle_in_transaction_session_timeout=10000&lock_timeout=10000`;
};

// Alternative connection URL with pooler for fallback
const getPoolerDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) return null;
  
  const separator = baseUrl.includes('?') ? '&' : '?';
  // Use pooler connection as fallback
  const poolerUrl = baseUrl.replace('.supabase.co', '.pooler.supabase.com');
  return `${poolerUrl}${separator}connection_limit=3&pool_timeout=15&connect_timeout=8&statement_cache_size=0&prepared_statement_cache_queries=0&pgbouncer=true`;
};

// Initialize Prisma client only if DATABASE_URL is available
const databaseUrl = getDatabaseUrl();
const prisma = databaseUrl ? (globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
  errorFormat: 'minimal',
  // Railway-optimized engine configuration
  __internal: {
    engine: {
      connectTimeout: 90000,    // 90 seconds for Railway latency
      queryTimeout: 60000,      // 60 seconds for complex queries
      requestTimeout: 60000,    // 60 seconds for request timeout
    },
  },
})) : null;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Ensure clean shutdown on process termination
process.on('beforeExit', async () => {
  if (prisma) await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  if (prisma) await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (prisma) await prisma.$disconnect();
  process.exit(0);
});

async function connectDatabase() {
  if (!prisma) {
    console.log('⚠️ Database not configured - skipping connection');
    return false;
  }
  
  // Try direct connection first
  console.log('🔄 Attempting direct connection to Supabase...');
  let retries = 2;
  
  while (retries > 0) {
    try {
      // Test connection with a simple query
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connected successfully (direct connection)');
      return true;
    } catch (error) {
      console.error(`❌ Direct connection failed (${3 - retries}/2):`, error.message);
      
      retries--;
      
      if (retries > 0) {
        console.log(`🔄 Retrying direct connection... (${retries} attempts left)`);
        await prisma.$disconnect();
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      }
    }
  }
  
  // If direct connection fails, try pooler connection
  console.log('🔄 Direct connection failed, trying pooler connection...');
  const poolerUrl = getPoolerDatabaseUrl();
  
  if (poolerUrl) {
    try {
      // Create new Prisma client with pooler URL
      const poolerPrisma = new PrismaClient({
        log: ['error'],
        datasources: {
          db: {
            url: poolerUrl,
          },
        },
        errorFormat: 'minimal',
      });
      
      await poolerPrisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connected successfully (pooler connection)');
      
      // Replace the global prisma instance
      await prisma.$disconnect();
      globalForPrisma.prisma = poolerPrisma;
      
      return true;
    } catch (poolerError) {
      console.error('❌ Pooler connection also failed:', poolerError.message);
    }
  }
  
  console.log('❌ All database connection attempts failed');
  console.log('⚠️ Database connection delayed, but server is running');
  return false;
}

// Function to handle prepared statement conflicts
async function resetConnection() {
  try {
    console.log('🔄 Resetting Prisma connection...');
    await prisma.$disconnect();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    await prisma.$connect();
    console.log('✅ Connection reset completed');
    return true;
  } catch (error) {
    console.error('❌ Connection reset failed:', error.message);
    return false;
  }
}

// Graceful shutdown
async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('👋 Database disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting database:', error.message);
    return false;
  }
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase configuration missing. Storage features will be disabled.');
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

module.exports = {
  prisma,
  supabase,
  connectDatabase,
  disconnectDatabase,
  resetConnection,
};
