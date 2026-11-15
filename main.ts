import * as fs from 'node:fs';
import * as path from 'node:path';

function usablePrice(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function outputPrice(value) {
  const rounded = Math.round((value + Number.EPSILON) * 100000) / 100000;
  return Math.max(0.00001, Math.min(9999999.99999, rounded));
}

function fallbackPrice(prices) {
  if (Array.isArray(prices)) {
    for (let i = prices.length - 1; i >= 0; i -= 1) {
      if (usablePrice(prices[i])) return outputPrice(prices[i]);
    }
  }
  return 1;
}

function forecastFor(prices) {
  const last = fallbackPrice(prices);
  if (!Array.isArray(prices) || prices.length < 480 || !prices.every(usablePrice)) return last;

  const logs = prices.map(function (price) { return Math.log(price); });
  function shape(end) {
    const values = [];
    for (let j = 0; j < 24; j += 1) values.push(logs[end - 10 * j]);
    const mean = values.reduce(function (sum, value) { return sum + value; }, 0) / 24;
    return values.map(function (value) { return value - mean; });
  }

  const recent = shape(prices.length - 1);
  const candidates = [];
  const firstEnd = 239;
  const lastEnd = prices.length - 1 - 240;
  for (let end = firstEnd; end <= lastEnd; end += 1) {
    const candidate = shape(end);
    let score = 0;
    for (let j = 0; j < 24; j += 1) {
      const difference = candidate[j] - recent[j];
      score += difference * difference;
    }
    candidates.push({ end: end, score: score });
  }
  candidates.sort(function (a, b) {
    if (a.score < b.score) return -1;
    if (a.score > b.score) return 1;
    return a.end - b.end;
  });

  const moves = candidates.slice(0, 12).map(function (candidate) {
    return logs[candidate.end + 240] - logs[candidate.end];
  });
  moves.sort(function (a, b) { return a - b; });
  let median = 0;
  if (moves.length > 0) {
    const middle = Math.floor(moves.length / 2);
    median = moves.length % 2 === 1 ? moves[middle] : (moves[middle - 1] + moves[middle]) / 2;
  }
  let change = median * 0.6;
  change = Math.max(-0.01, Math.min(0.01, change));
  return outputPrice(last * Math.exp(change));
}

function run() {
  const inputDir = process.env.MAKEFUN_INPUT_DIR || '/input';
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  fs.mkdirSync(outputDir, { recursive: true });
  let names = [];
  try {
    names = fs.readdirSync(inputDir).filter(function (name) { return name.endsWith('.in'); }).sort();
  } catch (_) {
    return;
  }
  for (const name of names) {
    const caseId = name.slice(0, -3);
    let priceList;
    try {
      const data = JSON.parse(fs.readFileSync(path.join(inputDir, name), 'utf8'));
      priceList = data && Array.isArray(data.markets) && data.markets[0] && data.markets[0].prices;
    } catch (_) {
      priceList = null;
    }
    const price = forecastFor(priceList);
    const output = { forecasts: [{ case: caseId, price: price }] };
    try {
      fs.writeFileSync(path.join(outputDir, caseId + '.out'), JSON.stringify(output), 'utf8');
    } catch (_) {
      continue;
    }
  }
}

try {
  run();
} catch (_) {
  // A case level failure must not stop the remaining cases.
}
