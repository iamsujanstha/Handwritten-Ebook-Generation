const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Replace the end of 182
let s1 = `                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                       topics: { type: Type.ARRAY, items: { type: Type.STRING } },
                       summary: { type: Type.STRING },
                       keyEntities: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                  }
               }
            });`;

code = code.replace(s1, s1.replace('});', '}, req.headers["x-gemini-api-key"] as string);'));

// Replace the end of 228
let s2 = `                           properties: {
                               topic: { type: Type.STRING },
                               description: { type: Type.STRING },
                               sourceIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                               sourceNames: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                          }
                      }
                   }
               }
           }
        });`;
code = code.replace(s2, s2.replace('});', '}, req.headers["x-gemini-api-key"] as string);'));

let s3 = `                  sections: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING,
                      description: "Brief overview of what this section will cover"
                    }
                  }
                }
              }
            }
          }
        }
      }
    });`;
code = code.replace(s3, s3.replace('});', '}, req.headers["x-gemini-api-key"] as string);'));

let s4 = `        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
               content: { type: Type.STRING, description: "The rendered chapter content in structured Markdown/HTML as requested" }
            }
          }
        }
    });`;
code = code.replace(s4, s4.replace('});', '}, req.headers["x-gemini-api-key"] as string);'));

fs.writeFileSync('server.ts', code);
