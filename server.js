const express = require('express');
const path = require('path');
const collector = require('./server/collector');
const db = require('./server/db');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'client')));
app.use('/api', require('./server/api'));

// Start collecting metrics data (30-second interval)
collector.startMetricsCollection(30000);

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  console.log('Received shutdown signal, closing server...');
  
  db.wipeAllMetrics();
  
  server.close(() => {
    console.log('Server closed');
    
    db.closeDatabase()
      .then(() => {
        console.log('Cleanup complete, exiting process');
        process.exit(0);
      })
      .catch(() => {
        console.error('Error during cleanup');
        process.exit(1);
      });
  });
}





