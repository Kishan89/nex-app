const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const globalForPrisma = globalThis;

// Force pooler connection for IPv4 compatibility
const getDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    console.warn('⚠️ DATABASE_URL environment variable is not set');
    return null; // Return null instead of throwing error
  }
  
  console.log('🔍 Original DATABASE_URL host:', baseUrl.split('@')[1]?.split('/')[0]);
  
  // Force pooler connection for IPv4 compatibility (Railway uses IPv4)
  const separator = baseUrl.includes('?') ? '&' : '?';
  // Always use pooler for IPv4 compatibility
  const poolerUrl = baseUrl.replace('.supabase.co', '.pooler.supabase.com');
  console.log('🔄 Using pooler connection for IPv4 compatibility');
  return `${poolerUrl}${separator}connection_limit=3&pool_timeout=30&connect_timeout=15&statement_cache_size=0&prepared_statement_cache_queries=0&pgbouncer=true&idle_in_transaction_session_timeout=15000`;
};

// Alternative connection URL with pooler for fallback
const getPoolerDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) return null;
  
  const separator = baseUrl.includes('?') ? '&' : '?';
  // Use pooler connection as fallback - handle both cases
  let poolerUrl;
  if (baseUrl.includes('.pooler.supabase.com')) {
    // Already has pooler, use as is
    poolerUrl = baseUrl;
  } else if (baseUrl.includes('.supabase.co')) {
    // Convert direct to pooler
    poolerUrl = baseUrl.replace('.supabase.co', '.pooler.supabase.com');
  } else {
    // Unknown format, return null
    return null;
  }
  
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
  
  const originalUrl = process.env.DATABASE_URL;
  console.log('🔍 Attempting database connection...');
  console.log('🔍 Database host:', originalUrl?.split('@')[1]?.split('/')[0]);
  
  // Strategy 1: Try pooler connection first (IPv4 compatibility)
  console.log('🔄 Trying pooler connection for IPv4 compatibility...');
  let retries = 3;
  
  while (retries > 0) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connected successfully (pooler connection - IPv4 compatible)');
      return true;
    } catch (error) {
      console.error(`❌ Pooler connection failed (${4 - retries}/3):`, error.message);
      
      retries--;
      
      if (retries > 0) {
        console.log(`🔄 Retrying pooler connection... (${retries} attempts left)`);
        await prisma.$disconnect();
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      }
    }
  }
  
  // Strategy 2: Try alternative connection strategy
  console.log('🔄 Original connection failed, trying alternative strategy...');
  
  // If original was pooler, try direct; if original was direct, try pooler
  let alternativeUrl;
  if (originalUrl?.includes('.pooler.supabase.com')) {
    // Original was pooler, try direct
    alternativeUrl = originalUrl.replace('.pooler.supabase.com', '.supabase.co');
    console.log('🔄 Switching from pooler to direct connection...');
  } else if (originalUrl?.includes('.supabase.co')) {
    // Original was direct, try pooler
    alternativeUrl = originalUrl.replace('.supabase.co', '.pooler.supabase.com');
    console.log('🔄 Switching from direct to pooler connection...');
  }
  
  if (alternativeUrl) {
    try {
      const alternativePrisma = new PrismaClient({
        log: ['error'],
        datasources: {
          db: {
            url: alternativeUrl,
          },
        },
        errorFormat: 'minimal',
      });
      
      await alternativePrisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connected successfully (alternative strategy)');
      
      // Replace the global prisma instance
      await prisma.$disconnect();
      globalForPrisma.prisma = alternativePrisma;
      
      return true;
    } catch (altError) {
      console.error('❌ Alternative connection also failed:', altError.message);
    }
  }
  
  console.log('❌ All database connection attempts failed');
  console.log('⚠️ This appears to be a Supabase service issue');
  console.log('⚠️ Server continues running - database will retry automatically');
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
