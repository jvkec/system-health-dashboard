/**
 * Collector fetches system metrics (CPU/disk/memory stats). 
 */
const os = require('os');
const util = require('util');
const { parse } = require('path');
const fs = require('fs');
const exec = util.promisify(require('child_process').exec);
const alerts = require('./alerts');

/**
 * Calculates CPU usage percentage based on the difference between two readings across all cores. 
 * @returns {Promise<number>} - CPU usage percentage
 */
async function getCpuUsage() {
  const cpuStart = os.cpus(); // Get all cpu cores' times
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second wait 
  const cpuEnd = os.cpus();

  let totalIdle = 0;
  let totalTick = 0;

  // calculate different in cpu times
  for (let i = 0; i < cpuStart.length; i++) {
    const idleDiff = cpuEnd[i].times.idle - cpuStart[i].times.idle;
    const totalDiff = Object.values(cpuEnd[i].times).reduce((accumulator, curr_val) => accumulator + curr_val, 0) - 
                      Object.values(cpuStart[i].times).reduce((accumulator, curr_val) => accumulator + curr_val, 0);
    totalIdle += idleDiff;
    totalTick += totalDiff;
  }

  const idlePercentage = (totalIdle / totalTick) * 100;
  const usagePercentage = 100 - idlePercentage;
  return parseFloat(usagePercentage.toFixed(2));
}

/**
 * Calculates memory usage percentage
 * @returns {number} - Memory usage percentage
 */
function getMemoryUsage() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercentage = (usedMem / totalMem) * 100;
  return parseFloat(memUsagePercentage.toFixed(2));
}

/**
 * Get disk usage percentage
 * @returns {Promise<number>} - Disk usage percentage
 */
async function getDiskUsage() {
  try {
    if (process.platform !== 'win32') {
      // linux/mac
      const { stdout } = await exec("df -h / | grep -v Filesystem | awk '{print $5}'");
      return parseFloat(stdout.trim().replace('%', ''));
    } else {
      // windows
      console.log('No support for Windows yet');
      return 0;
    }
  } catch (error) {
    console.error('Error getting disk usage:', error);
    return 0;
  }
}

/**
 * Gets all system metrics
 * @returns {Promise<Object>} - System metrics
 */
async function getCurrentMetrics() {
  return {
    cpu: await getCpuUsage(),
    memory: getMemoryUsage(),
    disk: await getDiskUsage(),
    timestamp: new Date().toISOString()
  };
}

/**
 * Starts collecting metrics at a specified interval
 * @param {} interval - Interval in milliseconds
 * @returns {Promise<void>}
 */
async function startMetricsCollection(interval = 30000) { // Default: 30 seconds
  const db = require('./db');
  
  console.log(`Starting metrics collection every ${interval/1000} seconds`);
  
  const metrics = await getCurrentMetrics();
  db.storeMetrics(metrics);
  
  // check thresholds and send alerts if needed
  console.log("Checking metrics against thresholds:", metrics);
  await alerts.checkThresholds(metrics);
  
  // regular collection intervals
  setInterval(async () => {
    try {
      const metrics = await getCurrentMetrics();
      db.storeMetrics(metrics);
      
      // check alerts on every metrics collection
      console.log("Checking metrics against thresholds:", metrics);
      await alerts.checkThresholds(metrics);
    } catch (error) {
      console.error('Error in metrics collection:', error);
    }
  }, interval);
}

module.exports = {
  getCurrentMetrics,
  startMetricsCollection
};