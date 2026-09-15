// Centralized data file path resolver.
// All paths default to the bundled data/ directory and can be overridden
// via environment variables for flexible deployment.

const path = require('path');

const DATA_DIR = __dirname;

module.exports = {
  KB_MASTER: process.env.KB_MASTER_PATH || path.join(DATA_DIR, 'master_knowledge_base.json'),
  RULE_BASE: process.env.RULE_BASE_PATH || path.join(DATA_DIR, 'rule_base.json'),
  RECIPES_FILE: process.env.RECIPES_FILE_PATH || path.join(DATA_DIR, 'Standard_Recipes_Master_Dataset.json'),
  KB_SOURCE_DIR: process.env.KB_SOURCE_DIR || DATA_DIR,
};
