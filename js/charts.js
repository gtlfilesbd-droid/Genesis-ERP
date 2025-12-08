import { chartsDataset } from "./data.js";

function drawLineChart(ctx, values) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.beginPath();
  const denom = Math.max(values.length - 1, 1);
  values.forEach((val, idx) => {
    const x = (idx / denom) * (width - 30) + 15;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const y =
      height - ((val - min) / (max - min || 1)) * (height - 30) - 15;
    if (idx === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
}

function drawBarChart(ctx, values) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  const barWidth = (width - 40) / values.length;
  const max = Math.max(...values);
  values.forEach((val, idx) => {
    const x = 20 + idx * barWidth;
    const barHeight = ((val / max) || 0) * (height - 40);
    ctx.fillStyle = "#0ea5e9";
    ctx.fillRect(x, height - barHeight - 20, barWidth * 0.6, barHeight);
  });
}

function drawPieChart(ctx, segments) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  const radius = Math.min(width, height) / 2 - 10;
  const centerX = width / 2;
  const centerY = height / 2;
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  let angleStart = -Math.PI / 2;
  const colors = ["#2563eb", "#22c55e", "#f97316", "#a855f7", "#fbbf24"];

  segments.forEach((segment, idx) => {
    const slice = (segment.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, angleStart, angleStart + slice);
    ctx.closePath();
    ctx.fillStyle = colors[idx % colors.length];
    ctx.fill();
    angleStart += slice;
  });
}

export function renderCharts(container = document) {
  const lineCanvas = container.querySelector("#profitTrendChart");
  const barCanvas = container.querySelector("#monthlySalesChart");
  const pieCanvas = container.querySelector("#departmentShareChart");
  const deptSales = container.querySelector("#deptSalesChart");
  const revenue = container.querySelector("#revenueChart");
  const margin = container.querySelector("#marginChart");

  if (lineCanvas) {
    drawLineChart(lineCanvas.getContext("2d"), chartsDataset.profitTrend);
  }
  if (barCanvas) {
    drawBarChart(barCanvas.getContext("2d"), chartsDataset.monthlySales);
  }
  if (pieCanvas) {
    drawPieChart(
      pieCanvas.getContext("2d"),
      chartsDataset.departmentShare
    );
  }
  if (deptSales) {
    drawBarChart(deptSales.getContext("2d"), chartsDataset.monthlySales);
  }
  if (revenue) {
    drawLineChart(revenue.getContext("2d"), chartsDataset.profitTrend);
  }
  if (margin) {
    drawLineChart(margin.getContext("2d"), chartsDataset.profitTrend.map((v) => v - 5));
  }
}

