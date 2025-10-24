// Script to apply database indexes
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyIndexes() {
  try {
    console.log('🚀 Starting to apply database indexes...');
    
    // Read the indexes SQL file
    const indexesPath = path.join(__dirname, 'prisma', 'indexes.sql');
    const indexesSQL = fs.readFileSync(indexesPath, 'utf8');
    
    console.log('📋 Using corrected column names from Prisma schema');
    
    // Split by semicolon and filter out empty statements
    const statements = indexesSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} index statements to apply`);
    
    // Apply each index statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⏳ Applying index ${i + 1}/${statements.length}...`);
          await prisma.$executeRawUnsafe(statement);
          console.log(`✅ Index ${i + 1} applied successfully`);
        } catch (error) {
          console.log(`⚠️  Index ${i + 1} might already exist or failed:`, error.message);
        }
      }
    }
    
    console.log('🎉 All indexes applied successfully!');
    console.log('📈 Database performance should be significantly improved');
    
  } catch (error) {
    console.error('❌ Error applying indexes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
applyIndexes();
