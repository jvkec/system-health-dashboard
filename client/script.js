let chartInstance = null;

function renderChart() {
  fetch('/api/metrics/history')
    .then(res => res.json())
    .then(data => {
      if (data && data.formatted) {
        const ctx = document.getElementById('chart').getContext('2d');
        if (chartInstance) {
          // If chart exists, just update
          chartInstance.data = data.formatted;
          chartInstance.update();
        } else {
          // Create chart for the first time
          chartInstance = new Chart(ctx, {
            type: 'line',
            data: data.formatted,
            options: {
              responsive: true,
              plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'System Metrics Over Time' }
              }
            }
          });
        }
      } else {
        console.error("Unexpected data format:", data);
      }
    })
    .catch(err => {
      console.error("Error fetching metrics history:", err);
    });
}

renderChart();
setInterval(renderChart, 10000); // Update every 10 seconds