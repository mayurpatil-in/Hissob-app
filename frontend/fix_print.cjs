const fs = require('fs');
const file = 'src/utils/printReceipt.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Add orgData param to getReceiptHtmlContent
code = code.replace(
  /export async function getReceiptHtmlContent\(receipt: PrintReceiptData, fallbackOrgName = 'Hissob ERP', forShare = false\): Promise<string> {[\s\S]*?let orgData: any = null;[\s\S]*?try {[\s\S]*?orgData = await getMyOrganization\(\);[\s\S]*?\} catch \(err\) {/g,
  `export async function getReceiptHtmlContent(receipt: PrintReceiptData, fallbackOrgName = 'Hissob ERP', forShare = false, orgDataOverride?: any): Promise<string> {
  let orgData: any = orgDataOverride;
  if (!orgData) {
    try {
      orgData = await getMyOrganization();
    } catch (err) {`
);

// 2. Fix _cachedLogoBase64
code = code.replace(
  /let logoHtml = '';[\s\S]*?if \(orgData\?.logo_url\) {[\s\S]*?try {[\s\S]*?const base64Url = await imageToBase64\(orgData\.logo_url\);/g,
  `let logoHtml = '';
  if (orgData?.logo_url) {
    try {
      if (_cachedLogoUrl !== orgData.logo_url) {
        _cachedLogoBase64 = await imageToBase64(orgData.logo_url);
        _cachedLogoUrl = orgData.logo_url;
      }
      const base64Url = _cachedLogoBase64;`
);

// 3. Fix QR base64 cache
code = code.replace(/await imageToBase64/g, 'await getCachedImageBase64');
code = code.replace(/await getCachedImageBase64\(orgData\.logo_url\)/g, 'await imageToBase64(orgData.logo_url)');

// 4. Add _fontsLoaded
code = code.replace(
  /export async function ensureDevanagariFonts\(\) {/g,
  `let _fontsLoaded = false;
export async function ensureDevanagariFonts() {
  if (_fontsLoaded) return;`
);
code = code.replace(
  /await Promise\.all\(fontPromises\);/g,
  `await Promise.all(fontPromises);\n  _fontsLoaded = true;`
);

// 5 & 6. Add micro-yield in shareReceiptViaWhatsApp & preGenerateReceiptBlob
code = code.replace(
  /const wrapper = root\.querySelector\('\.receipt-wrapper'\) as HTMLElement;[\s\S]*?if \(!wrapper\) return;[\s\S]*?const canvas = await html2canvas\(wrapper,/g,
  `const wrapper = root.querySelector('.receipt-wrapper') as HTMLElement;
    if (!wrapper) return;

    // Yield execution to browser event loop before heavy synchronous render
    await new Promise(resolve => setTimeout(resolve, 60));

    const canvas = await html2canvas(wrapper,`
);

// 7 & 8. Fix mojibake
code = code.replace(
  /const textMessage = `\u0928\u092E\u0938\u094D\u0915\u093E\u0930 \$\{receipt\.donor\?\.full_name[\s\S]*?\};\s*\n/g,
  `const textMessage = buildReceiptTextMessage(receipt, fallbackOrgName);\n`
);

fs.writeFileSync(file, code);
console.log('Fixed printReceipt.ts');
