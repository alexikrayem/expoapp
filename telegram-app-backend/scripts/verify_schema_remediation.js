/**
 * Verification script — confirms all 8 migrations applied correctly.
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

const NOT_NULL_STATUS_COLUMNS_SQL = `
  SELECT table_name, column_name, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (
      (table_name = 'orders' AND column_name IN ('status', 'delivery_status'))
      OR (table_name = 'order_items' AND column_name IN ('supplier_item_status', 'delivery_item_status'))
      OR (table_name = 'deals' AND column_name = 'is_active')
      OR (table_name = 'products' AND column_name = 'is_on_sale')
    )
  ORDER BY table_name, column_name
`;

async function verifyRlsStatus(client) {
  const rls = await client.query(
    `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );
  const noRls = rls.rows.filter((row) => !row.rowsecurity);
  console.log('=== 1. RLS STATUS ===');
  if (noRls.length === 0) {
    console.log('  ✅ ALL', rls.rows.length, 'public tables have RLS enabled');
  } else {
    console.log('  ❌ Tables WITHOUT RLS:');
    noRls.forEach((row) => console.log('    -', row.tablename));
  }
  console.log('  Total:', rls.rows.filter((row) => row.rowsecurity).length, '/', rls.rows.length);
}

async function verifyPolicyCount(client) {
  const policyCount = await client.query(
    `SELECT COUNT(*) as cnt FROM pg_policies WHERE schemaname = 'public'`
  );
  console.log('\n=== 2. RLS POLICIES ===');
  console.log('  Total policies:', policyCount.rows[0].cnt);
}

async function verifyMissingFkIndexes(client) {
  const fk = await client.query(`
    SELECT conrelid::regclass AS table_name, a.attname AS fk_column
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
      )
  `);
  console.log('\n=== 3. MISSING FK INDEXES ===');
  if (fk.rows.length === 0) {
    console.log('  ✅ No missing FK indexes');
  } else {
    fk.rows.forEach((row) => console.log('  ❌', row.table_name, '.', row.fk_column));
  }
}

async function verifyTriggers(client) {
  const triggers = await client.query(`
    SELECT event_object_table, trigger_name, action_timing, event_manipulation
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name
  `);
  console.log('\n=== 4. TRIGGERS ===');
  console.log('  Total triggers:', triggers.rows.length);
  const tables = [...new Set(triggers.rows.map((row) => row.event_object_table))];
  tables.forEach((tableName) => {
    const names = [
      ...new Set(
        triggers.rows
          .filter((row) => row.event_object_table === tableName)
          .map((row) => row.trigger_name)
      ),
    ];
    console.log('  ', `${tableName}:`, names.join(', '));
  });
}

async function verifyTimestampColumns(client) {
  const ts = await client.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('featured_list_items', 'featured_lists', 'otp_verifications')
      AND column_name IN ('created_at', 'updated_at', 'expires_at')
    ORDER BY table_name, column_name
  `);
  console.log('\n=== 5. TIMESTAMPTZ FIX ===');
  const allTz = ts.rows.every((row) => row.data_type === 'timestamp with time zone');
  if (allTz) {
    console.log('  ✅ All 5 columns are now TIMESTAMPTZ');
  } else {
    ts.rows
      .filter((row) => row.data_type !== 'timestamp with time zone')
      .forEach((row) => console.log('  ❌', row.table_name, row.column_name, '→', row.data_type));
  }
}

async function verifyNotNullStatusColumns(client) {
  const nn = await client.query(NOT_NULL_STATUS_COLUMNS_SQL);
  console.log('\n=== 6. NOT NULL STATUS COLUMNS ===');
  const allNotNull = nn.rows.every((row) => row.is_nullable === 'NO');
  if (allNotNull) {
    console.log('  ✅ All 6 status columns are NOT NULL');
  } else {
    nn.rows
      .filter((row) => row.is_nullable === 'YES')
      .forEach((row) => console.log('  ❌', row.table_name, '.', row.column_name, 'is still nullable'));
  }
}

async function verifyOrderItemsCheckConstraints(client) {
  const constraints = await client.query(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'order_items'::regclass AND contype = 'c'
    ORDER BY conname
  `);
  console.log('\n=== 7. ORDER_ITEMS CHECK CONSTRAINTS ===');
  const expected = [
    'order_items_delivery_status_valid',
    'order_items_price_nonnegative',
    'order_items_quantity_positive',
    'order_items_supplier_status_valid',
  ];
  expected.forEach((name) => {
    const found = constraints.rows.find((row) => row.conname === name);
    console.log('  ', found ? '✅' : '❌', name);
  });
}

async function verifyFunctionSecuritySearchPath(client) {
  const fn = await client.query(`
    SELECT proname, proconfig
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'app_private')
    ORDER BY proname
  `);
  console.log('\n=== 8. FUNCTION SECURITY (search_path) ===');
  fn.rows.forEach((row) => {
    const hasSearchPath = row.proconfig && row.proconfig.some((item) => item.startsWith('search_path='));
    console.log('  ', hasSearchPath ? '✅' : '❌', row.proname);
  });
}

async function verify() {
  const c = await pool.connect();
  console.log('\n========================================');
  console.log('  POST-MIGRATION VERIFICATION');
  console.log('========================================\n');

  await verifyRlsStatus(c);
  await verifyPolicyCount(c);
  await verifyMissingFkIndexes(c);
  await verifyTriggers(c);
  await verifyTimestampColumns(c);
  await verifyNotNullStatusColumns(c);
  await verifyOrderItemsCheckConstraints(c);
  await verifyFunctionSecuritySearchPath(c);

  console.log('\n========================================');
  console.log('  VERIFICATION COMPLETE');
  console.log('========================================\n');

  c.release();
  await pool.end();
  process.exit(0);
}

verify().catch((err) => {
  console.error('Verification error:', err.message);
  pool.end();
  process.exit(1);
});
