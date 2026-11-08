require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("./db");

async function seed() {
  const hash = await bcrypt.hash("admin123", 12);
  const [users] = await pool.query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    ["admin@example.com"]
  );

  let userId;
  if (users.length) {
    userId = users[0].id;
    await pool.query(
      "UPDATE users SET name=?, password_hash=?, status='active' WHERE id=?",
      ["System Administrator", hash, userId]
    );
  } else {
    const [result] = await pool.query(
      "INSERT INTO users (name,email,password_hash) VALUES (?,?,?)",
      ["System Administrator", "admin@example.com", hash]
    );
    userId = result.insertId;
  }

  await pool.query(
    "INSERT IGNORE INTO departments (user_id,name,description) VALUES (?,?,?)",
    [userId, "Information Technology", "Technology and software department"]
  );

  const [dept] = await pool.query(
    "SELECT id FROM departments WHERE user_id=? AND name=? LIMIT 1",
    [userId, "Information Technology"]
  );

  await pool.query(
    "INSERT IGNORE INTO positions (user_id,department_id,name,description) VALUES (?,?,?,?)",
    [userId, dept[0].id, "Developer", "Software developer"]
  );

  console.log("Seed complete.");
  console.log("Email: admin@example.com");
  console.log("Password: admin123");
  await pool.end();
}

seed().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
