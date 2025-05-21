const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../system_metrics.db');
const db = new sqlite3.Database(dbPath);

/**
 * initialize the db and create the metrics table if it doesnt exist
 * @returns {Promise<void>}
 */
function initializeDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      cpu_usage REAL,
      memory_usage REAL,
      disk_usage REAL
    )`);
    console.log(`Database initialized at ${dbPath}`);
  });
}

/**
 * stores system metrics in the database
 * @param {Object} metrics - system metrics object
 */
function storeMetrics(metrics) {
  const { cpu, memory, disk, timestamp } = metrics;
  db.serialize(() => {
    db.run(
    `INSERT INTO metrics (timestamp, cpu_usage, memory_usage, disk_usage) VALUES (?, ?, ?, ?)`,
    [timestamp, cpu, memory, disk],
    function(err) { 
      if (err) {
        console.error('Error storing metrics:', err);
      } else {
        console.log(`Metrics stored with ID: ${this.lastID}`);
      }
    });
  });
}

/**
 * Gets metrics history for the last X hours
 * @param {number} hours - Number of hours to look back
 * @returns {Promise<Array>} - Array of metrics objects
 */
function getMetricsHistory(hours = 24) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT timestamp, cpu_usage, memory_usage, disk_usage 
      FROM metrics 
      WHERE timestamp >= datetime('now', '-${hours} hours')
      ORDER BY timestamp ASC
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Wipes all metrics from db
 * @returns {Promise<void>}
 */
function wipeAllMetrics() {
  db.serialize(() => {
    db.run('DELETE FROM metrics', (err) => {
      if (err) {
        console.error('Error wiping all metrics:', err);
      } else {
        console.log('All metrics wiped from database');
        // Reset the AUTOINCREMENT sequence
        db.run("DELETE FROM sqlite_sequence WHERE name='metrics'", (seqErr) => {
          if (seqErr) {
            console.error('Error resetting metrics ID sequence:', seqErr);
          } else {
            console.log('Metrics ID sequence reset');
          }
        });
      }
    });
  });
}

/**
 * Closes the database connection
 * @returns {Promise<void>}
 */
function closeDatabase() {
  return new Promise((resolve, reject) => {
    console.log('Closing database connection...');
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
        reject(err);
      } else {
        console.log('Database connection closed successfully');
        resolve();
      }
    });
  });
}

initializeDatabase();

module.exports = {
  storeMetrics,
  getMetricsHistory,
  wipeAllMetrics,
  closeDatabase
};