const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://postgres:password@localhost:5432/medical_expo'
});

async function run() {
  try {
    await client.connect();
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log("TABLES:", res.rows.map(r => r.table_name));
    
    // Also get columns for one table to prove it works
    if (res.rows.length > 0) {
      const colRes = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`, [res.rows[0].table_name]);
      console.log(`COLUMNS for ${res.rows[0].table_name}:`, colRes.rows);
    }
    
    await client.end();
  } catch (err) {
    console.error("DB Connection Failed:", err.message);
  }
}
run();
