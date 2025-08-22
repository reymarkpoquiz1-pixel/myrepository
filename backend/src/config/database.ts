import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const dbConfig = {
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'dagupan_lts',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100
  },
  migrations: {
    directory: './src/database/migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './src/database/seeds'
  },
  debug: process.env.NODE_ENV === 'development'
};

// Create Knex instance
export const db = knex(dbConfig);

// Database initialization function
export async function initializeDatabase(): Promise<void> {
  try {
    // Test database connection
    await db.raw('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Run migrations if they exist
    try {
      await db.migrate.latest();
      console.log('✅ Database migrations completed');
    } catch (migrationError) {
      console.log('ℹ️ No migrations to run or migration error:', migrationError);
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Database cleanup function
export async function closeDatabase(): Promise<void> {
  try {
    await db.destroy();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}

// Export database instance for use in other modules
export default db;