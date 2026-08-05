#!/usr/bin/env node
// scripts/generate-mock-config.js
// Usage:
//  node scripts/generate-mock-config.js --format json --count 3 --out mock-configs.json --seed 42
//  node scripts/generate-mock-config.js --format env --count 1 --out .env

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { format: 'json', count: 1, out: null, seed: Date.now(), name: 'race-profile' };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--format' && args[i+1]) { opts.format = args[++i]; }
    else if (a === '--count' && args[i+1]) { opts.count = Number(args[++i]); }
    else if (a === '--out' && args[i+1]) { opts.out = args[++i]; }
    else if (a === '--seed' && args[i+1]) { opts.seed = Number(args[++i]); }
    else if (a === '--name' && args[i+1]) { opts.name = args[++i]; }
    else if (a === '--help' || a === '-h') { printHelpAndExit(); }
  }
  return opts;
}

function printHelpAndExit() {
  console.log('\nMock config generator for race simulation.');
  console.log('Options:');
  console.log('  --format json|env   Output format (default: json)');
  console.log('  --count N           Number of profiles to generate (default: 1)');
  console.log('  --out PATH          Write output to file (default: stdout)');
  console.log('  --seed N            Deterministic seed (default: now)');
  console.log('  --name PREFIX       Profile name prefix (default: race-profile)');
  console.log('  --help, -h          Show this help');
  process.exit(0);
}

// Seeded RNG (mulberry32)
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }

function randomBetween(rand, a, b) { return a + rand() * (b - a); }

function generateProfile(rand, idx, namePrefix) {
  const profileName = `${namePrefix}-${idx + 1}`;
  const trackNames = ['Autodrome Park', 'Coastal Circuit', 'Highlands Raceway', 'Metro Oval'];
  const weatherTypes = ['sunny', 'cloudy', 'rainy', 'stormy'];
  const surfaces = ['asphalt', 'concrete', 'mixed'];

  const numRacers = Math.max(2, Math.floor(randomBetween(rand, 4, 16)));

  const racers = [];
  for (let i = 0; i < numRacers; i++) {
    const skill = pick(rand, ['novice','intermediate','pro','veteran']);
    const topSpeed = Math.round(randomBetween(rand, 180, 350));
    const accel = +(randomBetween(rand, 2.5, 5.5)).toFixed(2);
    const reliability = +randomBetween(rand, 0.7, 0.99).toFixed(3);
    racers.push({ id: i+1, name: `${profileName}-car-${i+1}`, aiLevel: skill, topSpeedKph: topSpeed, acceleration: accel, reliability });
  }

  const laps = Math.max(5, Math.round(randomBetween(rand, 10, 60)));
  const trackLengthM = Math.round(randomBetween(rand, 1200, 7400));

  return {
    profileName,
    seed: Math.floor(rand() * 1e9),
    track: {
      name: pick(rand, trackNames),
      lengthMeters: trackLengthM,
      laps,
      surface: pick(rand, surfaces)
    },
    weather: {
      type: pick(rand, weatherTypes),
      temperatureC: Math.round(randomBetween(rand, 5, 35)),
      windKph: +randomBetween(rand, 0, 40).toFixed(1)
    },
    raceOptions: {
      startMode: pick(rand, ['rolling','standing']),
      pitStopsAllowed: rand() > 0.2,
      maxPitStops: Math.floor(randomBetween(rand, 0, 5)),
      telemetryHz: Math.round(randomBetween(rand, 1, 50))
    },
    racers,
    createdAt: new Date().toISOString()
  };
}

function flattenToEnv(obj, prefix = '') {
  const out = {};
  function walk(val, parts) {
    if (val === null || val === undefined) return;
    if (Array.isArray(val) || typeof val !== 'object') {
      const key = parts.join('_').toUpperCase();
      out[key] = typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' ? String(val) : JSON.stringify(val);
      return;
    }
    for (const k of Object.keys(val)) {
      walk(val[k], parts.concat(k.replace(/\s+/g,'_')));
    }
  }
  walk(obj, prefix ? [prefix] : []);
  return out;
}

function toEnvString(flat) {
  return Object.keys(flat).map(k => `${k}=${flat[k]}`).join('\n');
}

function main() {
  const opts = parseArgs();
  const rng = mulberry32(opts.seed >>> 0);
  const profiles = [];
  for (let i = 0; i < opts.count; i++) profiles.push(generateProfile(rng, i, opts.name));

  let outStr;
  if (opts.format === 'json') {
    outStr = opts.count === 1 ? JSON.stringify(profiles[0], null, 2) : JSON.stringify(profiles, null, 2);
  } else if (opts.format === 'env') {
    // For env, flatten profiles into BLOCKS separated by blank line
    const blocks = profiles.map((p, idx) => {
      const prefix = `${opts.name}_${idx+1}`.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      const flat = flattenToEnv(p, prefix);
      return toEnvString(flat);
    });
    outStr = blocks.join('\n\n');
  } else {
    console.error('Unknown format:', opts.format);
    process.exit(2);
  }

  if (opts.out) {
    const outPath = path.resolve(process.cwd(), opts.out);
    fs.writeFileSync(outPath, outStr, 'utf8');
    console.log('Wrote', outPath);
  } else {
    console.log(outStr);
  }
}

if (require.main === module) main();
