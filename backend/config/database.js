const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const globalForPrisma = globalThis;

// Optimized Prisma configuration for Railway/Render
const getDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    console.warn('⚠️ DATABASE_URL environment variable is not set');
    return null; // Return null instead of throwing error
  }
  
  // Optimized connection settings for Railway/Render free tier
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}connection_limit=10&pool_timeout=20&connect_timeout=15&statement_cache_size=0&prepared_statement_cache_queries=0&pgbouncer=true`;
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
  // Add connection pool configuration
  __internal: {
    engine: {
      connectTimeout: 60000,
      queryTimeout: 60000,
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
  
  let retries = 3;
  
  while (retries > 0) {
    try {
      // Test connection with a simple query
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connected successfully');
      return true;
    } catch (error) {
      console.error(`❌ Database connection failed (${4 - retries}/3):`, error.message);
      
      // Handle specific connection pool errors
      if (error.code === 'P2024' || error.message?.includes('connection pool')) {
        console.log('🔄 Connection pool timeout, resetting connection...');
        await prisma.$disconnect();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
      
      // If it's a prepared statement error, try to reset the connection
      if (error.message?.includes('prepared statement') || error.code === 'P2010') {
        console.log('🔄 Prepared statement error, resetting connection...');
        await prisma.$disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      }
      
      retries--;
      if (retries === 0) {
        console.error('❌ All database connection attempts failed');
        return false;
      }
      
      console.log(`🔄 Retrying database connection... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
    }
  }
  
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
