const express = require('express');
const collector = require('./collector');
const db = require('./db');
const alertSystem = require('./alerts');

const router = express.Router();

// Get current system metrics
router.get('/metrics/current', async (req, res) => {
  try {
    const metrics = await collector.getCurrentMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching current metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve current metrics'
    });
  }
});

// Get historical metrics data
router.get('/metrics/history', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours || '24', 10);
    
    // Validate hours parameter
    if (isNaN(hours) || hours <= 0 || hours > 168) { // max. 7 days
      return res.status(400).json({
        success: false,
        error: 'Hours parameter must be between 1 and 168'
      });
    }
    
    const data = await db.getMetricsHistory(hours);
    
    // Format data for Charts.js
    const timestamps = data.map(entry => new Date(entry.timestamp).toLocaleTimeString());
    const cpuData = data.map(entry => entry.cpu_usage);
    const memoryData = data.map(entry => entry.memory_usage);
    const diskData = data.map(entry => entry.disk_usage);
    
    res.json({
      success: true,
      raw: data,
      formatted: {
        labels: timestamps,
        datasets: [
          {
            label: 'CPU Usage (%)',
            data: cpuData,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: false
          },
          {
            label: 'Memory Usage (%)',
            data: memoryData,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            fill: false
          },
          {
            label: 'Disk Usage (%)',
            data: diskData,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: false
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching metric history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metric history'
    });
  }
});

// Get current threshold settings
router.get('/thresholds', (req, res) => {
  try {
    const thresholds = alertSystem.loadThresholds();
    res.json({
      success: true,
      data: thresholds
    });
  } catch (error) {
    console.error('Error loading thresholds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load threshold settings'
    });
  }
});

// Get alert status information
router.get('/alerts/status', (req, res) => {
  try {
    res.json({
      success: true,
      data: alertSystem.alertStatus
    });
  } catch (error) {
    console.error('Error fetching alert status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alert status'
    });
  }
});

router.get('/metrics', async (req, res) => {
  try {
    const metrics = await collector.getCurrentMetrics();
    res.json({
      success: true,
      data: {
        labels: [new Date(metrics.timestamp).toLocaleTimeString()],
        datasets: [
          { label: 'CPU Usage (%)', data: [metrics.cpu], borderColor: 'rgba(255, 99, 132, 1)', backgroundColor: 'rgba(255, 99, 132, 0.2)', fill: false },
          { label: 'Memory Usage (%)', data: [metrics.memory], borderColor: 'rgba(54, 162, 235, 1)', backgroundColor: 'rgba(54, 162, 235, 0.2)', fill: false },
          { label: 'Disk Usage (%)', data: [metrics.disk], borderColor: 'rgba(75, 192, 192, 1)', backgroundColor: 'rgba(75, 192, 192, 0.2)', fill: false }
        ]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching current metrics (alias):', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve current metrics'
    });
  }
});

module.exports = router;