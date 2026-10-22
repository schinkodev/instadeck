/** Content of the generated modules with scripts for the browser (npm run gen). */
export function playerModule(source: string): string {
  return `// Generated from player.js by npm run gen. Do not edit.\nexport const PLAYER_JS = ${JSON.stringify(source)};\n`;
}

export function measureModule(source: string): string {
  return `// Generated from measure.js by npm run gen. Do not edit.\nexport const MEASURE_JS = ${JSON.stringify(source)};\n`;
}
