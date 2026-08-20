import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const recentOrders = await client.execute(
  "SELECT id, orderNumber, customerEmail, createdAt FROM PreOrder ORDER BY createdAt DESC LIMIT 3",
);
console.log("Recent orders:");
console.table(recentOrders.rows);

const recentLogs = await client.execute(
  "SELECT id, \"to\", template, status, provider, errorMessage, createdAt, sentAt FROM EmailLog ORDER BY createdAt DESC LIMIT 10",
);
console.log("Recent EmailLog rows:");
console.table(recentLogs.rows);

client.close();
