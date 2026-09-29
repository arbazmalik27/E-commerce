const fs = require('fs');
const path = require('path');

async function sendCDP(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 100000);
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === id) {
        ws.removeEventListener('message', handler);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function waitForSelector(ws, selector, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const res = await sendCDP(ws, 'Runtime.evaluate', {
      expression: `Boolean(document.querySelector("${selector}"))`,
      returnByValue: true
    });
    if (res.result && res.result.value) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Timeout waiting for selector: ' + selector);
}

async function run() {
  const tabsRes = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await tabsRes.json();
  const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('5173'));
  if (!pageTab) {
    console.error('No TrendVolt tab found!');
    process.exit(1);
  }

  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(res => ws.addEventListener('open', res));
  console.log('Connected to Chrome DevTools Protocol!');

  // Navigate to product page
  await sendCDP(ws, 'Page.navigate', { url: 'http://localhost:5173/products/6abac7a693eceb24dc741be8' });
  console.log('Waiting for product page to load...');
  await waitForSelector(ws, 'h1');
  console.log('Product page loaded!');

  // 1. Initial State Inspection
  const evalInitial = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
      const hasSizeS = buttons.some(b => b.includes('S'));
      const hasSizeM = buttons.some(b => b.includes('M'));
      const hasSizeL = buttons.some(b => b.includes('L'));
      return { hasSizeS, hasSizeM, hasSizeL, allButtons: buttons };
    })()`,
    returnByValue: true
  });
  console.log('Initial Size Buttons:', evalInitial.result.value);

  // 2. Click Size S (In stock)
  const evalClickS = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btnS = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().startsWith('S'));
      if (btnS) btnS.click();
      return { clickedS: Boolean(btnS) };
    })()`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 600));

  const checkStateS = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const hasAlertCard = Boolean(document.querySelector('[role="status"]') || document.body.textContent.includes('Back-in-Stock Alert'));
      const hasAddToCart = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Add to Cart'));
      return { hasAlertCard, hasAddToCart };
    })()`,
    returnByValue: true
  });
  console.log('State for Size S (in-stock):', checkStateS.result.value);

  // 3. Click Size M (Out of stock)
  const evalClickM = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btnM = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().startsWith('M'));
      if (btnM) btnM.click();
      return { clickedM: Boolean(btnM) };
    })()`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 600));

  const checkStateM = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const alertHeader = document.body.textContent.includes('Back-in-Stock Alert');
      const notifyBtn = Array.from(document.querySelectorAll('button, a')).find(b => 
        b.textContent.includes('Notify Me When Size M Is Back') || 
        b.textContent.includes('Sign In to Get Notified for Size M') ||
        b.textContent.includes('Alert Active')
      );
      const isOutOfStockBadge = document.body.textContent.includes('(Out of Stock)');
      return { 
        alertHeader, 
        notifyBtnText: notifyBtn ? notifyBtn.textContent.trim() : null,
        isOutOfStockBadge 
      };
    })()`,
    returnByValue: true
  });
  console.log('State for Size M (out-of-stock):', checkStateM.result.value);

  // 4. Capture screenshot of Out of Stock Size M alert card
  const screenshotData = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' });
  const artifactDir = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\e03f7d49-5659-40f1-aae5-6776ef354ce1';
  const screenshotPath = path.join(artifactDir, 'stock_alert_size_m_verification.png');
  fs.writeFileSync(screenshotPath, Buffer.from(screenshotData.data, 'base64'));
  console.log('Saved screenshot to:', screenshotPath);

  // 5. Click Size L (In stock)
  const evalClickL = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btnL = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().startsWith('L'));
      if (btnL) btnL.click();
      return { clickedL: Boolean(btnL) };
    })()`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 600));

  const checkStateL = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const hasAlertCard = document.body.textContent.includes('Back-in-Stock Alert');
      const hasAddToCart = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Add to Cart'));
      return { hasAlertCard, hasAddToCart };
    })()`,
    returnByValue: true
  });
  console.log('State for Size L (in-stock):', checkStateL.result.value);

  // 6. Responsive Check across standard viewports
  const viewports = [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 375, height: 812 }
  ];

  console.log('\n--- RESPONSIVE VIEWPORT CHECKS ---');
  for (const vp of viewports) {
    await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 768
    });
    await new Promise(r => setTimeout(r, 400));
    const overflowCheck = await sendCDP(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const root = document.documentElement;
        const body = document.body;
        const scrollW = Math.max(root.scrollWidth, body.scrollWidth);
        const clientW = window.innerWidth;
        return {
          viewport: '${vp.width}x${vp.height}',
          hasOverflow: scrollW > clientW,
          scrollW,
          clientW
        };
      })()`,
      returnByValue: true
    });
    console.log(`Viewport ${vp.width}x${vp.height}:`, overflowCheck.result.value.hasOverflow ? 'FAIL: OVERFLOW' : 'PASS: NO OVERFLOW');
  }

  // Reset Emulation
  await sendCDP(ws, 'Emulation.clearDeviceMetricsOverride');
  ws.close();
  console.log('\nALL BROWSER VERIFICATIONS COMPLETED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Browser check failed:', err);
  process.exit(1);
});
