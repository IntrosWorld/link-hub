const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
  path.join(__dirname, "links.db"),
  err => {
    if (err) {
      console.error("DB connection error:", err.message);
    } else {
      console.log("Connected to SQLite database");
    }
  }
);

// Create table if it does not exist
db.run(`
  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    clicks INTEGER DEFAULT 0,
    start_hour INTEGER,
    end_hour INTEGER,
    time_priority INTEGER DEFAULT 0
  )
`);

module.exports = db;
