import { Client } from 'pg';

async function testConnection(url) {
  console.log('Testing:', url);
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    console.log('Successfully connected to', url);
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

async function run() {
  const poolUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lumina';
  const directUrl = process.env.DIRECT_URL || 'postgresql://postgres:postgres@localhost:5432/lumina';
  await testConnection(poolUrl);
  await testConnection(directUrl);
}

run();
