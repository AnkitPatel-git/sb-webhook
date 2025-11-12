const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bluedart_db',
  multipleStatements: true
};

const migrationsDir = path.join(__dirname, 'migrations');

// Create migrations table
async function ensureMigrationsTable(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

// Get all migration files
function getMigrationFiles() {
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.js') && file !== 'migrate.js')
    .sort();
  return files;
}

// Get completed migrations
async function getCompletedMigrations(db) {
  const [rows] = await db.query('SELECT name FROM migrations ORDER BY run_at ASC');
  return rows.map(row => row.name);
}

// Run a single migration
async function runMigration(db, migrationFile, direction = 'up') {
  const migrationPath = path.join(migrationsDir, migrationFile);
  const migration = require(migrationPath);
  
  if (!migration[direction]) {
    throw new Error(`Migration ${migrationFile} does not have a ${direction} function`);
  }

  await migration[direction](db);
  
  if (direction === 'up') {
    await db.query('INSERT INTO migrations (name) VALUES (?)', [migrationFile]);
    console.log(`✅ Applied migration: ${migrationFile}`);
  } else {
    await db.query('DELETE FROM migrations WHERE name = ?', [migrationFile]);
    console.log(`✅ Rolled back migration: ${migrationFile}`);
  }
}

// Run migrations
async function migrate(direction = 'up') {
  let connection;
  
  try {
    // Create connection without database first (in case DB doesn't exist)
    const tempConfig = { ...dbConfig };
    delete tempConfig.database;
    connection = await mysql.createConnection(tempConfig);
    
    // Create database if it doesn't exist
    console.log(`📦 Using database: ${dbConfig.database}`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.query(`USE ${dbConfig.database}`);
    
    await ensureMigrationsTable(connection);
    
    const migrationFiles = getMigrationFiles();
    const completedMigrations = await getCompletedMigrations(connection);
    
    if (direction === 'up') {
      const pendingMigrations = migrationFiles.filter(file => !completedMigrations.includes(file));
      
      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations');
        return;
      }
      
      console.log(`Running ${pendingMigrations.length} migration(s)...`);
      for (const file of pendingMigrations) {
        await runMigration(connection, file, 'up');
      }
    } else {
      // Rollback last migration
      if (completedMigrations.length === 0) {
        console.log('✅ No migrations to rollback');
        return;
      }
      
      const lastMigration = completedMigrations[completedMigrations.length - 1];
      const migrationFile = migrationFiles.find(f => f === lastMigration);
      
      if (migrationFile) {
        console.log(`Rolling back: ${lastMigration}...`);
        await runMigration(connection, migrationFile, 'down');
      }
    }
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// List migrations
async function listMigrations() {
  let connection;
  
  try {
    const tempConfig = { ...dbConfig };
    delete tempConfig.database;
    connection = await mysql.createConnection(tempConfig);
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.query(`USE ${dbConfig.database}`);
    await ensureMigrationsTable(connection);
    
    const migrationFiles = getMigrationFiles();
    const completedMigrations = await getCompletedMigrations(connection);
    
    console.log('\n📋 Migration Status:\n');
    migrationFiles.forEach((file, index) => {
      const status = completedMigrations.includes(file) ? '✅ Applied' : '⏳ Pending';
      console.log(`${index + 1}. ${file} - ${status}`);
    });
    
    console.log(`\nTotal: ${migrationFiles.length} migrations, ${completedMigrations.length} applied, ${migrationFiles.length - completedMigrations.length} pending\n`);
  } catch (error) {
    console.error('❌ Error listing migrations:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Main execution
const command = process.argv[2] || 'up';

(async () => {
  try {
    if (command === 'up') {
      await migrate('up');
    } else if (command === 'down') {
      await migrate('down');
    } else if (command === 'list') {
      await listMigrations();
    } else {
      console.error('Unknown command:', command);
      console.log('Usage: node database/migrate.js [up|down|list]');
      process.exit(1);
    }
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
})();


