const config = {
  '*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}': [
    'eslint --max-warnings=0 --no-warn-ignored',
    'prettier --write',
  ],
  '*.{json,jsonc,css,md,mdx,yaml,yml}': 'prettier --write',
};

export default config;
