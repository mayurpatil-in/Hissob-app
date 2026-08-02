const fs = require('fs');
let code = fs.readFileSync('src/utils/printReceipt.ts', 'utf8');

// 1. getReceiptHtmlContent signature
code = code.replace(
  /export async function getReceiptHtmlContent\(receipt: PrintReceiptData, fallbackOrgName = 'Hissob ERP', forShare = false\): Promise<string> {[\s\S]*?let orgData: any = null;[\s\S]*?try {[\s\S]*?orgData = await getMyOrganization\(\);[\s\S]*?\} catch \(err\) {/g,
  `export async function getReceiptHtmlContent(receipt: PrintReceiptData, fallbackOrgName = 'Hissob ERP', forShare = false, orgDataOverride?: any): Promise<string> {
  let orgData: any = orgDataOverride;
  if (!orgData) {
    try {
      orgData = await getMyOrganization();
    } catch (err) {`
);

code = code.replace(
  /export async function downloadReceiptImage\(receipt: PrintReceiptData, fallbackOrgName = 'Hisob ERP'\): Promise<void> {/g,
  `export async function downloadReceiptImage(receipt: PrintReceiptData, fallbackOrgName = 'Hisob ERP', orgData?: any): Promise<void> {`
);
code = code.replace(
  /const html = await getReceiptHtmlContent\(receipt, fallbackOrgName, true\);/g,
  `const html = await getReceiptHtmlContent(receipt, fallbackOrgName, true, orgData);`
);

code = code.replace(
  /export async function preGenerateReceiptBlob\(receipt: PrintReceiptData, fallbackOrgName = 'Hisob ERP'\): Promise<void> {/g,
  `export async function preGenerateReceiptBlob(receipt: PrintReceiptData, fallbackOrgName = 'Hisob ERP', orgData?: any): Promise<void> {`
);

code = code.replace(
  /export async function shareReceiptViaWhatsApp\(receipt: PrintReceiptData, fallbackOrgName = 'Hissob ERP'\): Promise<void> {/g,
  `export async function shareReceiptViaWhatsApp(receipt: PrintReceiptData, fallbackOrgName = 'Hissob ERP', orgData?: any): Promise<void> {`
);

code = code.replace(
  /export async function printReceiptWindow\(receipt: PrintReceiptData, fallbackOrgName = 'Hissob ERP'\): Promise<void> {/g,
  `export async function printReceiptWindow(receipt: PrintReceiptData, fallbackOrgName = 'Hissob ERP', orgData?: any): Promise<void> {`
);
code = code.replace(
  /const html = await getReceiptHtmlContent\(receipt, fallbackOrgName, false\);/g,
  `const html = await getReceiptHtmlContent(receipt, fallbackOrgName, false, orgData);`
);


if (!code.includes('export function isReceiptBlobCached')) {
  code += `\nexport function isReceiptBlobCached(receiptId: string): boolean {
  return _receiptBlobCache.has(receiptId);
}\n`;
}

fs.writeFileSync('src/utils/printReceipt.ts', code);
console.log('Signatures patched');
