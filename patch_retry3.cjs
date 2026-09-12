const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

const isRetryRegex = /const isRetryable = error\?\.status === 429 \|\| error\?\.status === 503 \|\| error\?\.message\?\.includes\("503"\) \|\| error\?\.message\?\.includes\("429"\) \|\| error\?\.message\?\.includes\("high demand"\) \|\| error\?\.message\?\.includes\("Spikes in demand"\) \|\| error\?\.message\?\.includes\("UNAVAILABLE"\) \|\| error\?\.message\?\.includes\("RESOURCE_EXHAUSTED"\) \|\| error\?\.message\?\.includes\("Quota exceeded"\);/;

server = server.replace(isRetryRegex, 'const isRetryable = error?.status === 404 || error?.message?.includes("NOT_FOUND") || error?.message?.includes("no longer available") || error?.status === 429 || error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("429") || error?.message?.includes("high demand") || error?.message?.includes("Spikes in demand") || error?.message?.includes("UNAVAILABLE") || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("Quota exceeded");');

fs.writeFileSync('server.ts', server);
