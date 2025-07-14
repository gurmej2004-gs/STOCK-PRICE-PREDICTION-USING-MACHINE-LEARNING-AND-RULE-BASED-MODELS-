document.getElementById('csvFile').addEventListener('change', function (e) {
    Papa.parse(e.target.files[0], {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: function (results) {
        const data = results.data;
        displayRawData(data);
        processData(data);
      }
    });
  });
  
  function displayRawData(data) {
    let table = '<table border="1"><tr>';
    Object.keys(data[0]).forEach(key => table += `<th>${key}</th>`);
    table += '</tr>';
  
    data.slice(0, 10).forEach(row => {
      table += '<tr>';
      Object.values(row).forEach(val => table += `<td>${val}</td>`);
      table += '</tr>';
    });
  
    table += '</table>';
    document.getElementById('rawData').innerHTML = table;
  }
  
  function processData(data) {
    // Fill missing values and calculate average volume per stock name
    const grouped = {};
    data.forEach(row => {
      if (!grouped[row.Name]) grouped[row.Name] = [];
      grouped[row.Name].push(row);
    });
  
    // Heuristic, FOL, CSP, and Model predictions
    const predictions = [];
    const actual = [];
    const modelPredictions = [];
  
    // Simplified linear regression (open, high, low, volume) => close
    data.forEach((row, i) => {
      const x = [row.open, row.high, row.low, row.volume];
      const lr = (0.3 * x[0] + 0.3 * x[1] + 0.3 * x[2] + 0.00000001 * x[3]); // fake regression
      modelPredictions.push(lr);
      actual.push(row.close);
  
      // Heuristic
      const prevClose = i > 0 && data[i - 1].Name === row.Name ? data[i - 1].close : row.open;
      const avgVol = grouped[row.Name]?.reduce((a, b) => a + b.volume, 0) / grouped[row.Name].length;
      const heuristic = (row.open > prevClose && row.volume > avgVol) ? row.open * 1.01 : row.open * 0.99;
  
      // FOL
      const fol = (row.high > row.open && row.low < row.open) ? (row.high + row.low) / 2 : row.open;
  
      // CSP
      const mid = (row.high + row.low) / 2;
      const csp = Math.max(row.open * 0.95, Math.min(mid, row.open * 1.05));
  
      predictions.push({
        actual: row.close,
        model: lr,
        heuristic,
        fol,
        csp
      });
    });
  
    const mae = {
      'Linear Regression': meanAbsoluteError(predictions.map(p => p.actual), predictions.map(p => p.model)),
      'Heuristic': meanAbsoluteError(predictions.map(p => p.actual), predictions.map(p => p.heuristic)),
      'FOL Rule': meanAbsoluteError(predictions.map(p => p.actual), predictions.map(p => p.fol)),
      'CSP Rule': meanAbsoluteError(predictions.map(p => p.actual), predictions.map(p => p.csp)),
    };
  
    renderMAEChart(mae);
    renderPredictionsTable(predictions.slice(0, 20));
    renderLineChart(predictions.slice(0, 20));
  }
  
  function meanAbsoluteError(actual, predicted) {
    const total = actual.reduce((sum, val, i) => sum + Math.abs(val - predicted[i]), 0);
    return (total / actual.length).toFixed(2);
  }
  
  function renderMAEChart(mae) {
    const ctx = document.getElementById('maeChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(mae),
        datasets: [{
          label: 'Mean Absolute Error',
          data: Object.values(mae),
          backgroundColor: ['blue', 'green', 'orange', 'red']
        }]
      }
    });
  }
  
  function renderPredictionsTable(data) {
    let html = '<h3>📋 Sample Predictions</h3><table border="1"><tr><th>Actual</th><th>Linear Regression</th><th>Heuristic</th><th>FOL</th><th>CSP</th></tr>';
    data.forEach(row => {
      html += `<tr>
        <td>${row.actual.toFixed(2)}</td>
        <td>${row.model.toFixed(2)}</td>
        <td>${row.heuristic.toFixed(2)}</td>
        <td>${row.fol.toFixed(2)}</td>
        <td>${row.csp.toFixed(2)}</td>
      </tr>`;
    });
    html += '</table>';
    document.getElementById('predictions').innerHTML = html;
  }
  
  function renderLineChart(data) {
    const ctx = document.getElementById('lineChart').getContext('2d');
  
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i + 1),
        datasets: [
          {
            label: 'Actual',
            data: data.map(p => p.actual),
            borderColor: 'black',
            borderWidth: 2,
            fill: false,
          },
          {
            label: 'Linear Regression',
            data: data.map(p => p.model),
            borderColor: 'blue',
            borderWidth: 2,
            fill: false,
          },
          {
            label: 'Heuristic',
            data: data.map(p => p.heuristic),
            borderColor: 'green',
            borderWidth: 2,
            fill: false,
          },
          {
            label: 'FOL',
            data: data.map(p => p.fol),
            borderColor: 'orange',
            borderWidth: 2,
            fill: false,
          },
          {
            label: 'CSP',
            data: data.map(p => p.csp),
            borderColor: 'red',
            borderWidth: 2,
            fill: false,
          },
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: '📈 Predicted vs Actual Line Chart'
          }
        },
        scales: {
          y: {
            title: {
              display: true,
              text: 'Price'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Sample Index'
            }
          }
        }
      }
    });
  }
  
  