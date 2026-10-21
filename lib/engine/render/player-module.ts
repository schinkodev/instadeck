/** Obsah generovaných modulů se skripty pro prohlížeč (npm run gen). */
export function playerModule(source: string): string {
  return `// Generováno z player.js příkazem npm run gen. Needitovat.\nexport const PLAYER_JS = ${JSON.stringify(source)};\n`;
}

export function measureModule(source: string): string {
  return `// Generováno z measure.js příkazem npm run gen. Needitovat.\nexport const MEASURE_JS = ${JSON.stringify(source)};\n`;
}
