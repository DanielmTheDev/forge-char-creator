// Registry of repo modules whose compendium packs are built from JSON source.
// Each module: JSON source at <dir>/src/packs/<pack>/, compiled LevelDB at <dir>/packs/<pack>/.
// `collections` overrides the document collection for a pack (default "items").
export const MODULES = [
  { name: "forge-char-creator", dir: "." },
  { name: "forge-content", dir: "forge-content" },
];

// pack name -> primary document collection (default "items" if absent).
export const COLLECTIONS = {
  "forge-npcs": "actors",
};
