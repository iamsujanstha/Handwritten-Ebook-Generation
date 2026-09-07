const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// The blocks end differently
// 182 ends with:
//               }
//            }
//         });
// So we can replace `});` with `}, req.headers["x-gemini-api-key"] as string);` 
// But only for those specific chunks. Let's just use string replace.

code = code.replace(/                   \} \/\/ end items\n               \}\n           \}\n        \}\);\n/g, '                   } // end items\n               }\n           }\n        }, req.headers["x-gemini-api-key"] as string);\n');

code = code.replace(/                         \}\n                      \}\n                   \}\n               \}\n           \}\n        \}\);\n/g, '                         }\n                      }\n                   }\n               }\n           }\n        }, req.headers["x-gemini-api-key"] as string);\n');

code = code.replace(/                 \}\n               \}\n             \}\n           \}\n       \}\n    \}\);\n/g, '                 }\n               }\n             }\n           }\n       }\n    }, req.headers["x-gemini-api-key"] as string);\n');

code = code.replace(/              description: "List of chapters for the proposed book",\n              items: \{\n                type: Type.OBJECT,\n                properties: \{\n                  title: { type: Type.STRING },\n                  sections: \{\n                    type: Type.ARRAY,\n                    items: \{\n                      type: Type.STRING,\n                      description: "Brief overview of what this section will cover"\n                    \}\n                  \}\n                \}\n              \}\n            \}\n          \}\n        \}\n      \}\n    \}\);\n/g, '              description: "List of chapters for the proposed book",\n              items: {\n                type: Type.OBJECT,\n                properties: {\n                  title: { type: Type.STRING },\n                  sections: {\n                    type: Type.ARRAY,\n                    items: {\n                      type: Type.STRING,\n                      description: "Brief overview of what this section will cover"\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }, req.headers["x-gemini-api-key"] as string);\n');

fs.writeFileSync('server.ts', code);
