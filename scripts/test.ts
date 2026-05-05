// scripts/test.ts
// Run from project root with:
//   npx tsx scripts/test.ts 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
// Or just:
//   npx tsx scripts/test.ts                  # uses default vitalik

import { extractRoastData } from '../lib/extract';
import { generateRoast } from '../lib/roast';

async function main() {
  const address = process.argv[2] || '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

  console.log(`\n>>> Roasting wallet: ${address}\n`);
  console.log('Step 1/2: Fetching wallet data from Zerion...');

  const startData = Date.now();
  const data = await extractRoastData(address);
  console.log(`  Done in ${((Date.now() - startData) / 1000).toFixed(1)}s\n`);

  console.log('Extracted stats:');
  console.log(`  Wallet age: ${data.walletAgeDays} days`);
  console.log(`  Transactions: ${data.txCount}`);
  console.log(`  Portfolio value: $${data.totalValueUsd.toFixed(0)}`);
  console.log(`  Top app: ${data.favoriteApps[0]?.name || 'none'}`);
  console.log(`  Total gas: $${data.totalGasSpentUsd.toFixed(0)}`);
  console.log(`  Realized gain: $${data.pnlSummary.realizedGain.toFixed(0)}\n`);

  console.log('Step 2/2: Generating roast with Claude...');
  const startRoast = Date.now();
  const roast = await generateRoast(data);
  console.log(`  Done in ${((Date.now() - startRoast) / 1000).toFixed(1)}s\n`);

  console.log('='.repeat(60));
  console.log('THE ROAST');
  console.log('='.repeat(60));
  console.log(`\nVerdict: ${roast.verdict}\n`);
  console.log('Roasts:');
  roast.roasts.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
  console.log(`\nHighlight stat: ${roast.highlight_stat}\n`);
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
