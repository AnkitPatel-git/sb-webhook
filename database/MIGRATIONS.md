# Database Migrations

This project uses a custom migration system to manage database schema changes.

## Overview

Migrations are stored in `database/migrations/` directory. Each migration file exports `up` and `down` functions:
- `up`: Applies the migration (creates/modifies tables)
- `down`: Rolls back the migration (removes/reverts changes)

## Migration Files

Migration files are named with a number prefix and description:
- `001-initial-schema.js` - Initial database schema
- `002-add-new-column.js` - Example: Adding a new column
- etc.

## Commands

### Run Pending Migrations
```bash
npm run migrate
```

This will run all pending migrations in order.

### Rollback Last Migration
```bash
npm run migrate:down
```

This will rollback the most recently applied migration.

### List Migration Status
```bash
npm run migrate:list
```

Shows which migrations have been applied and which are pending.

## Creating a New Migration

1. Create a new file in `database/migrations/` with the next sequential number:
   ```bash
   # Example: database/migrations/002-add-index-to-shipments.js
   ```

2. Use this template:
   ```javascript
   module.exports = {
     up: async (db) => {
       // Your migration SQL here
       await db.query('ALTER TABLE shipments ADD COLUMN new_field VARCHAR(50)');
       console.log('✅ Migration completed');
     },
     
     down: async (db) => {
       // Rollback SQL here
       await db.query('ALTER TABLE shipments DROP COLUMN new_field');
       console.log('✅ Rollback completed');
     }
   };
   ```

3. Run the migration:
   ```bash
   npm run migrate
   ```

## Migration State

The migration system tracks applied migrations in a `migrations` table in your database. This table is automatically created on first run.

## Best Practices

1. **Always write rollback logic**: Every `up` migration should have a corresponding `down` migration
2. **Test migrations**: Test both up and down migrations before deploying
3. **Use transactions when possible**: Wrap migrations in transactions for safety
4. **Keep migrations small**: One logical change per migration
5. **Never modify existing migrations**: If a migration has been applied to production, create a new migration instead
6. **Use descriptive names**: Migration file names should clearly describe what they do

## Example Migration

```javascript
// database/migrations/002-add-status-to-shipments.js
module.exports = {
  up: async (db) => {
    await db.query(`
      ALTER TABLE shipments 
      ADD COLUMN status VARCHAR(20) DEFAULT 'pending' AFTER waybill_no,
      ADD INDEX idx_status (status)
    `);
    console.log('✅ Added status column to shipments table');
  },
  
  down: async (db) => {
    await db.query('ALTER TABLE shipments DROP COLUMN status');
    console.log('✅ Removed status column from shipments table');
  }
};
```

## Troubleshooting

### Migration fails mid-way
If a migration fails, fix the issue and run `npm run migrate` again. The system will only run pending migrations.

### Need to reset all migrations
If you need to start fresh (development only):
```sql
DROP TABLE IF EXISTS migrations;
-- Then run migrations again
npm run migrate
```

### Check migration status
```bash
npm run migrate:list
```

## Integration with Deployment

For production deployments:

1. Run migrations as part of your deployment process
2. Always backup your database before running migrations
3. Test migrations on a staging environment first
4. Consider running migrations during a maintenance window for large changes

Example deployment script:
```bash
# Backup database
mysqldump -u root -p bluedart_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
npm run migrate

# Verify migration status
npm run migrate:list
```


