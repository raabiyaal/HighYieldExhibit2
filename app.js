const svg = document.getElementById("chart");
const data = window.EXHIBIT2_DATA;

const width = 1357;
const height = 816;
const margin = { top: 28, right: 92, bottom: 124, left: 116 };
const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;
const plotLeft = margin.left;
const plotTop = margin.top;
const plotRight = plotLeft + plotWidth;
const plotBottom = plotTop + plotHeight;

const xMin = data.series[0].assetReturn;
const xMax = data.series[data.series.length - 1].assetReturn;
const yMin = 0;
const yMax = 1.6;
const mezzCap = data.meta.mezzanineCap;
const frequencyMax = Math.max(...data.series.map((d) => d.frequency));
const redBandTopValue = 0.92;

const xScale = (value) => plotLeft + ((value - xMin) / (xMax - xMin)) * plotWidth;
const yScale = (value) => plotBottom - ((value - yMin) / (yMax - yMin)) * plotHeight;
const frequencyScale = (value) => plotBottom - (value / frequencyMax) * (plotHeight * 0.95);

const make = (name, attrs = {}, parent = svg) => {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  parent.appendChild(node);
  return node;
};

const pathFromBands = (topPoints, bottomPoints) => {
  const top = topPoints.map(([x, y]) => `${x},${y}`).join(" L ");
  const bottom = [...bottomPoints].reverse().map(([x, y]) => `${x},${y}`).join(" L ");
  return `M ${top} L ${bottom} Z`;
};

const linePath = (points) => `M ${points.map(([x, y]) => `${x},${y}`).join(" L ")}`;
const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;
const formatCurrency = (value) => `$${value.toFixed(3)}`;

const series = data.series.map((d) => {
  const mortgageTop = d.firstMortgage;
  const mezzTop = d.firstMortgage + d.mezzanineActual;
  const investorsTop = mezzTop + d.investors;
  const totalTop = investorsTop + d.operator;

  return {
    ...d,
    x: xScale(d.assetReturn),
    mortgageTopY: yScale(mortgageTop),
    mezzTopY: yScale(mezzTop),
    investorsTopY: yScale(investorsTop),
    totalTopY: yScale(totalTop),
    frequencyY: frequencyScale(d.frequency),
    baselineY: yScale(0),
    mortgageValue: mortgageTop,
    mezzValue: mezzTop,
    investorsValue: investorsTop,
    totalValue: totalTop,
  };
});

const defs = make("defs");
const hatch = make("pattern", {
  id: "loss-hatch",
  width: "6",
  height: "6",
  patternUnits: "userSpaceOnUse",
}, defs);
make("rect", { width: "6", height: "6", fill: "#ffffff" }, hatch);
make("path", {
  d: "M 3 0 L 3 6",
  stroke: "#ff3b30",
  "stroke-width": "1.5",
}, hatch);

const clip = make("clipPath", { id: "plot-clip" }, defs);
make("rect", {
  x: plotLeft,
  y: plotTop,
  width: plotWidth,
  height: plotHeight,
}, clip);

make("rect", {
  x: plotLeft,
  y: plotTop,
  width: plotWidth,
  height: plotHeight,
  fill: "#ffffff",,
});

const gridValues = Array.from({ length: 9 }, (_, index) => index * 0.2);
gridValues.forEach((value) => {
  const y = yScale(value);
  make("line", {
    x1: plotLeft,
    y1: y,
    x2: plotRight,
    y2: y,
    stroke: value === 0 ? "#777777" : "#a8a8a8",
    "stroke-width": value === 0 ? 1.4 : 1,
  });
});

const areaGroup = make("g", { "clip-path": "url(#plot-clip)" });

make("path", {
  d: pathFromBands(
    series.map((d) => [d.x, d.mortgageTopY]),
    series.map((d) => [d.x, d.baselineY]),
  ),
  fill: "#d7ecc8",
}, areaGroup);

make("path", {
  d: pathFromBands(
    series.map((d) => [d.x, d.mezzTopY]),
    series.map((d) => [d.x, d.mortgageTopY]),
  ),
  fill: "#6cbf43",
}, areaGroup);

make("path", {
  d: pathFromBands(
    series.map((d) => [d.x, d.investorsTopY]),
    series.map((d) => [d.x, d.mezzTopY]),
  ),
  fill: "#52bcc4",
}, areaGroup);

make("path", {
  d: pathFromBands(
    series.map((d) => [d.x, d.totalTopY]),
    series.map((d) => [d.x, d.investorsTopY]),
  ),
  fill: "#21994d",
}, areaGroup);

const redSeries = series.filter((d) => d.totalValue < redBandTopValue);
if (redSeries.length > 1) {
  const topPoints = redSeries.map((d) => [d.x, yScale(redBandTopValue)]);
  const bottomPoints = redSeries.map((d) => [d.x, d.totalTopY]);
  make("path", {
    d: pathFromBands(topPoints, bottomPoints),
    fill: "url(#loss-hatch)",
  }, areaGroup);
}

make("path", {
  d: linePath(series.map((d) => [d.x, d.totalTopY])),
  fill: "none",
  stroke: "#111111",
  "stroke-width": "3.2",
  "stroke-linejoin": "round",
  "stroke-linecap": "round",
}, areaGroup);

make("path", {
  d: linePath(series.map((d) => [d.x, d.mortgageTopY])),
  fill: "none",
  stroke: "#111111",
  "stroke-width": "2.2",
}, areaGroup);

make("path", {
  d: linePath(series.map((d) => [d.x, d.mezzTopY])),
  fill: "none",
  stroke: "#111111",
  "stroke-width": "2.2",
}, areaGroup);

const curvePath = linePath(series.map((d) => [d.x, d.frequencyY]));
make("path", {
  d: curvePath,
  fill: "none",
  stroke: "#3450b4",
  "stroke-width": "5.5",
  "stroke-linejoin": "round",
  "stroke-linecap": "round",
}, areaGroup);

const meanX = xScale(data.meta.meanReturn);
make("line", {
  x1: meanX,
  y1: yScale(0.02),
  x2: meanX,
  y2: frequencyScale(frequencyMax),
  stroke: "#3450b4",
  "stroke-width": "2.2",
  "stroke-dasharray": "9 8",
}, areaGroup);

make("rect", {
  x: plotLeft,
  y: plotTop,
  width: plotWidth,
  height: plotHeight,
  fill: "none",
  stroke: "#666666",
  "stroke-width": "2",
});

make("line", {
  x1: plotLeft,
  y1: plotBottom,
  x2: plotRight,
  y2: plotBottom,
  stroke: "#666666",
  "stroke-width": "2",
});

make("line", {
  x1: plotLeft,
  y1: plotTop,
  x2: plotLeft,
  y2: plotBottom,
  stroke: "#666666",
  "stroke-width": "2",
});

make("line", {
  x1: plotRight,
  y1: plotTop,
  x2: plotRight,
  y2: plotBottom,
  stroke: "#666666",
  "stroke-width": "2",
});

gridValues.forEach((value) => {
  const y = yScale(value);
  make("line", {
    x1: plotLeft - 8,
    y1: y,
    x2: plotLeft,
    y2: y,
    stroke: "#666666",
    "stroke-width": "2",
  });

  make("text", {
    x: plotLeft - 18,
    y: y + 6,
    "text-anchor": "end",
    "font-size": "20",
    "font-weight": "700",
    class: "label-text",
  }).textContent = `$${value.toFixed(2)}`;
});

const xTicks = [];
for (let value = -0.2; value <= 0.3600001; value += 0.028) {
  xTicks.push(Number(value.toFixed(3)));
}

xTicks.forEach((tick) => {
  const x = xScale(tick);
  make("line", {
    x1: x,
    y1: plotBottom,
    x2: x,
    y2: plotBottom + 7,
    stroke: "#666666",
    "stroke-width": "1.8",
  });

  make("text", {
    x,
    y: plotBottom + 12,
    transform: `rotate(-90 ${x} ${plotBottom + 12})`,
    "text-anchor": "end",
    "font-size": "17",
    "font-weight": "700",
    class: "label-text",
  }).textContent = `${(tick * 100).toFixed(1)}%`;
});

for (let x = plotLeft; x <= plotRight; x += plotWidth / 112) {
  make("line", {
    x1: x,
    y1: plotBottom,
    x2: x,
    y2: plotBottom + 4,
    stroke: "#777777",
    "stroke-width": "1",
    opacity: "0.65",
  });
}

for (let y = plotTop + 84; y < plotBottom; y += 112) {
  make("line", {
    x1: plotRight,
    y1: y,
    x2: plotRight + 6,
    y2: y,
    stroke: "#666666",
    "stroke-width": "1.6",
  });
}

make("text", {
  x: width / 2,
  y: height - 18,
  "text-anchor": "middle",
  "font-size": "22",
  class: "title-text",
}).textContent = "Asset-Level Returns";

make("text", {
  x: 22,
  y: height / 2,
  transform: `rotate(-90 22 ${height / 2})`,
  "text-anchor": "middle",
  "font-size": "22",
  class: "title-text",
}).textContent = "Total Payoff for Every $1 Invested";

make("text", {
  x: width - 26,
  y: height / 2,
  transform: `rotate(90 ${width - 26} ${height / 2})`,
  "text-anchor": "middle",
  "font-size": "22",
  class: "title-text",
}).textContent = "Frequency";

const text = (content, x, y, options = {}) => {
  const node = make("text", {
    x,
    y,
    "font-size": options.fontSize ?? 20,
    "font-weight": options.weight ?? 700,
    "text-anchor": options.anchor ?? "middle",
    fill: options.fill ?? "#111111",
    class: "label-text",
    transform: options.transform ?? "",
  });
  node.textContent = content;
  return node;
};

text("First Mortgage", xScale(-0.128), yScale(0.42), { fontSize: 18 });
text("Mezzanine Debt", xScale(-0.048), yScale(0.82), { fontSize: 18 });
text("Investors", xScale(0.25), yScale(1.09), { fontSize: 18 });
text("Operator", xScale(0.326), yScale(1.285), {
  fontSize: 16,
  fill: "#ffffff",
  transform: `rotate(-10 ${xScale(0.326)} ${yScale(1.285)})`,
});

const hoverLayer = make("g", {
  opacity: "0",
  "pointer-events": "none",
});

const hoverGuide = make("line", {
  y1: plotTop,
  y2: plotBottom,
  stroke: "#1f1f1f",
  "stroke-width": "1.4",
  "stroke-dasharray": "6 6",
}, hoverLayer);

const totalDot = make("circle", {
  r: "6",
  fill: "#111111",
  stroke: "#fbfaf7",
  "stroke-width": "2.5",
}, hoverLayer);

const curveDot = make("circle", {
  r: "6",
  fill: "#3450b4",
  stroke: "#fbfaf7",
  "stroke-width": "2.5",
}, hoverLayer);

const tooltip = make("g", {
  class: "tooltip-group",
  "pointer-events": "none",
}, hoverLayer);

const tooltipBox = make("rect", {
  width: "232",
  height: "172",
  rx: "10",
  ry: "10",
  fill: "rgba(255,255,255,0.96)",
  stroke: "#1e1e1e",
  "stroke-width": "1.2",
}, tooltip);

const tooltipShadow = make("rect", {
  width: "232",
  height: "172",
  rx: "10",
  ry: "10",
  fill: "rgba(0,0,0,0.08)",
}, tooltip);
tooltip.insertBefore(tooltipShadow, tooltipBox);

const tooltipTitle = make("text", {
  x: "16",
  y: "24",
  "font-size": "18",
  "font-weight": "700",
  class: "label-text",
}, tooltip);

const tooltipLines = [];
for (let index = 0; index < 6; index += 1) {
  const label = make("text", {
    x: "16",
    y: `${50 + index * 19}`,
    "font-size": "14",
    class: "label-text",
  }, tooltip);

  const value = make("text", {
    x: "216",
    y: `${50 + index * 19}`,
    "font-size": "14",
    "text-anchor": "end",
    class: "label-text",
  }, tooltip);

  tooltipLines.push({ label, value });
}

const tooltipLineDefs = [
  ["Total payoff", (d) => formatCurrency(d.totalValue)],
  ["First mortgage", (d) => formatCurrency(d.firstMortgage)],
  ["Mezzanine debt", () => formatCurrency(mezzCap)],
  ["Investors", (d) => formatCurrency(d.investors)],
  ["Operator", (d) => formatCurrency(d.operator)],
  ["Frequency", (d) => d.frequency.toFixed(3)],
];

tooltipLineDefs.forEach(([label, formatter], index) => {
  tooltipLines[index].label.textContent = label;
  tooltipLines[index].value.dataset.formatterIndex = `${index}`;
  tooltipLines[index].value._formatter = formatter;
});

const overlay = make("rect", {
  x: plotLeft,
  y: plotTop,
  width: plotWidth,
  height: plotHeight,
  fill: "transparent",
  style: "cursor: crosshair;",
});

const toSvgPoint = (event) => {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
};

const getClosestDatum = (x) => {
  let closest = series[0];
  let minDistance = Math.abs(series[0].x - x);

  for (let index = 1; index < series.length; index += 1) {
    const distance = Math.abs(series[index].x - x);
    if (distance < minDistance) {
      closest = series[index];
      minDistance = distance;
    }
  }

  return closest;
};

const updateTooltip = (datum) => {
  hoverGuide.setAttribute("x1", datum.x);
  hoverGuide.setAttribute("x2", datum.x);
  totalDot.setAttribute("cx", datum.x);
  totalDot.setAttribute("cy", datum.totalTopY);
  curveDot.setAttribute("cx", datum.x);
  curveDot.setAttribute("cy", datum.frequencyY);

  tooltipTitle.textContent = `Asset return: ${formatPercent(datum.assetReturn)}`;
  tooltipLineDefs.forEach(([, formatter], index) => {
    tooltipLines[index].value.textContent = formatter(datum);
  });

  const tooltipWidth = 232;
  const tooltipHeight = 172;
  const preferredX = datum.x + 18;
  const tooltipX = preferredX + tooltipWidth > plotRight - 4
    ? datum.x - tooltipWidth - 18
    : preferredX;
  const tooltipY = Math.max(plotTop + 10, Math.min(datum.frequencyY - 86, plotBottom - tooltipHeight - 10));

  tooltip.setAttribute("transform", `translate(${tooltipX}, ${tooltipY})`);
  tooltipShadow.setAttribute("transform", "translate(5, 6)");
};

const showHover = (event) => {
  const point = toSvgPoint(event);
  const clampedX = Math.max(plotLeft, Math.min(plotRight, point.x));
  const datum = getClosestDatum(clampedX);
  updateTooltip(datum);
  hoverLayer.setAttribute("opacity", "1");
};

overlay.addEventListener("mousemove", showHover);
overlay.addEventListener("mouseenter", showHover);
overlay.addEventListener("mouseleave", () => {
  hoverLayer.setAttribute("opacity", "0");
});
