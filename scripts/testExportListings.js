// scripts/testExportListings.js
import { exportListingsReportCSV } from '../src/lib/integration/exportListingsReport.js';

console.log('🚀 Exporting listings report...');
exportListingsReportCSV()
  .then(() => console.log('✅ Export complete'))
  .catch((err) => console.error('❌ Export failed:', err));
