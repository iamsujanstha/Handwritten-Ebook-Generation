const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');
let i = 0;
while ((i = code.indexOf('const response = await generateContentWithRetry({', i)) !== -1) {
  let openBraces = 0;
  let j = i + 'const response = await generateContentWithRetry('.length;
  for (; j < code.length; j++) {
    if (code[j] === '{') openBraces++;
    else if (code[j] === '}') openBraces--;
    
    if (openBraces === 0 && code[j] === '}') {
      // found end of the object
      if (code.substring(j+1, j+3) === ');') {
         code = code.substring(0, j+1) + ', req.headers["x-gemini-api-key"] as string' + code.substring(j+1);
      }
      break;
    }
  }
  i = j;
}

i = 0;
while ((i = code.indexOf('const outlineResponse = await generateContentWithRetry({', i)) !== -1) {
  let openBraces = 0;
  let j = i + 'const outlineResponse = await generateContentWithRetry('.length;
  for (; j < code.length; j++) {
    if (code[j] === '{') openBraces++;
    else if (code[j] === '}') openBraces--;
    
    if (openBraces === 0 && code[j] === '}') {
      // found end of the object
      if (code.substring(j+1, j+3) === ');') {
         code = code.substring(0, j+1) + ', req.headers["x-gemini-api-key"] as string' + code.substring(j+1);
      }
      break;
    }
  }
  i = j;
}

i = 0;
while ((i = code.indexOf('const dupResponse = await generateContentWithRetry({', i)) !== -1) {
  let openBraces = 0;
  let j = i + 'const dupResponse = await generateContentWithRetry('.length;
  for (; j < code.length; j++) {
    if (code[j] === '{') openBraces++;
    else if (code[j] === '}') openBraces--;
    
    if (openBraces === 0 && code[j] === '}') {
      // found end of the object
      if (code.substring(j+1, j+3) === ');') {
         code = code.substring(0, j+1) + ', req.headers["x-gemini-api-key"] as string' + code.substring(j+1);
      }
      break;
    }
  }
  i = j;
}

fs.writeFileSync('server.ts', code);
