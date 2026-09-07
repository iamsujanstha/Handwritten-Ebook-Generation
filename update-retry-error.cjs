const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// The original catch block throws generic errors. I'll modify the final throw to include custom error structure if quota exceeded.
const oldCatch = `        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
}`;

const newCatch = `        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        // If it's the last retry or unretryable and it's a quota error, throw it so we can return a specific response to the client
        if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Quota exceeded") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
           const e = new Error(error.message);
           (e as any).status = 429;
           (e as any).isQuotaError = true;
           throw e;
        }
        throw error;
      }
    }
  }
  throw new Error("Failed after MAX_RETRIES");
}`;

code = code.replace(oldCatch, newCatch);
fs.writeFileSync('server.ts', code);
