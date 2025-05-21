const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Track when alerts were last sent to prevent spam
const alertStatus = {
  cpu: { lastAlerted: null, isActive: false },
  memory: { lastAlerted: null, isActive: false },
  disk: { lastAlerted: null, isActive: false }
};

// Minimum time between alerts (ms)
const ALERT_COOLDOWN = 15 * 60 * 1000; // 15 minutes

/**
 * Holds the thresholds for cpu, memory, and disk usage
 * @returns {Object} - Thresholds for CPU, memory, and disk usage
 */
function loadThresholds() {
  try {
    const configPath = path.join(__dirname, '../config/thresholds.json');
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } else {
      return { cpu: 80, memory: 85, disk: 90 };
    }
  } catch (error) {
    console.error('Error loading thresholds:', error);
    return { cpu: 80, memory: 85, disk: 90 };
  }
}

/**
 * Email transport configuration
 * @returns {Object} - Nodemailer transport object
 */
function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // False for TLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/**
 * Sends an email alert when a system metric exceeds its threshold
 * @param {*} metricType 
 * @param {*} value 
 * @param {*} threshold 
 * @returns {Promise<boolean>} - True if alert was sent, false otherwise
 */
async function sendAlert(metricType, value, threshold) {
  console.log(`Attempting to send alert for ${metricType}: ${value}% (threshold: ${threshold}%)`);
  
  try {
    console.log('Creating transport...');
    const transport = createTransport();
    
    const mailOptions = {
      from: `"System Monitor" <${process.env.SMTP_USER}>`,
      to: process.env.ALERT_TO,
      subject: `ALERT: High ${metricType} Usage Detected`,
      html: `
        <h2>System Resource Alert</h2>
        <p>The system has detected high ${metricType} usage:</p>
        <ul>
          <li><strong>Current ${metricType} Usage:</strong> ${value}%</li>
          <li><strong>Threshold:</strong> ${threshold}%</li>
          <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p>Please check the system to ensure everything is functioning properly.</p>
      `
    };
    
    console.log(`Sending email to: ${process.env.ALERT_TO}`);
    const info = await transport.sendMail(mailOptions);
    console.log('\x1b[32m%s\x1b[0m', 'Alert email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`); // False if not using test account
    return true;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Error sending alert email:', error); // Red text
    return false;
  }
}

/**
 * Checks system metrics against thresholds
 * @param {Object} metrics - System metrics object
 * @returns {Promise<boolean>} - True if alerts were sent, false otherwise
 */
async function checkThresholds(metrics) {
  const thresholds = loadThresholds();
  const now = Date.now();
  let alertsSent = false;
  
  // Check CPU
  if (metrics.cpu > thresholds.cpu) {
    const lastAlert = alertStatus.cpu.lastAlerted;
    if (!lastAlert || (now - lastAlert > ALERT_COOLDOWN)) {
      await sendAlert('CPU', metrics.cpu, thresholds.cpu);
      alertStatus.cpu.lastAlerted = now;
      alertStatus.cpu.isActive = true;
      alertsSent = true;
    }
  } else if (alertStatus.cpu.isActive) {
    alertStatus.cpu.isActive = false;
  }
  
  // Check memory
  if (metrics.memory > thresholds.memory) {
    const lastAlert = alertStatus.memory.lastAlerted;
    if (!lastAlert || (now - lastAlert > ALERT_COOLDOWN)) {
      await sendAlert('Memory', metrics.memory, thresholds.memory);
      alertStatus.memory.lastAlerted = now;
      alertStatus.memory.isActive = true;
      alertsSent = true;
    }
  } else if (alertStatus.memory.isActive) {
    alertStatus.memory.isActive = false;
  }
  
  // Check disk
  if (metrics.disk > thresholds.disk) {
    const lastAlert = alertStatus.disk.lastAlerted;
    if (!lastAlert || (now - lastAlert > ALERT_COOLDOWN)) {
      await sendAlert('Disk', metrics.disk, thresholds.disk);
      alertStatus.disk.lastAlerted = now;
      alertStatus.disk.isActive = true;
      alertsSent = true;
    }
  } else if (alertStatus.disk.isActive) {
    alertStatus.disk.isActive = false;
  }
  
  return alertsSent;
}

module.exports = {
  checkThresholds,
  loadThresholds,
  alertStatus
};