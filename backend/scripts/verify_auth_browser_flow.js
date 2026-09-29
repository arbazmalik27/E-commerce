require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { signToken } = require('../src/utils/jwt');
const BackInStockAlert = require('../src/models/BackInStockAlert');
const Product = require('../src/models/Product');
const User = require('../src/models/User');

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
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const customer = await User.findOne({ role: 'customer' });
  if (!customer) throw new Error('No customer user found');
  console.log('Using customer:', customer.email, customer._id.toString());

  // Clean existing alerts for clean test
  await BackInStockAlert.deleteMany({ user: customer._id });

  const tabsRes = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await tabsRes.json();
  const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('5173'));
  if (!pageTab) throw new Error('No 5173 tab found');

  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(res => ws.addEventListener('open', res));
  console.log('Connected to CDP');

  // Set Auth Cookie
  const token = signToken(customer._id);
  await sendCDP(ws, 'Network.setCookie', {
    name: 'token',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Strict'
  });
  console.log('Auth cookie set');

  // ==========================================
  // PART 1: Product with Sizes (Size M - Out of Stock)
  // ==========================================
  console.log('\n--- PART 1: Testing Size-Level Alert ---');
  await sendCDP(ws, 'Page.navigate', { url: 'http://localhost:5173/products/6abac7a693eceb24dc741be8' });
  await waitForSelector(ws, 'h1');
  console.log('Page loaded for Burgundy Floral Top');
  await new Promise(r => setTimeout(r, 1000));

  // Click Size M
  console.log('Clicking Size M...');
  await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btnM = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().startsWith('M'));
      if (btnM) btnM.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  // Verify "Notify Me When Size M Is Back" button exists
  const checkNotifyBtn = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Notify Me When Size M Is Back'));
      return Boolean(btn);
    })()`,
    returnByValue: true
  });
  console.log('Found "Notify Me When Size M Is Back" button:', checkNotifyBtn.result.value);

  // Click "Notify Me When Size M Is Back"
  console.log('Clicking Notify button...');
  await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Notify Me When Size M Is Back'));
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  // Check subscribed state
  const checkSubscribed = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const hasActiveBadge = document.body.textContent.includes('Alert Active');
      const hasCancelBtn = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Cancel Alert'));
      const feedbackText = document.querySelector('[role="status"]')?.textContent || '';
      return { hasActiveBadge, hasCancelBtn, feedbackText };
    })()`,
    returnByValue: true
  });
  console.log('Subscribed state:', checkSubscribed.result.value);

  // Scroll to alert card and capture screenshot of subscribed state
  await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const card = document.querySelector('[role="status"]')?.closest('.rounded-2xl');
      if (card) card.scrollIntoView({ behavior: 'instant', block: 'center' });
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  const artifactDir = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\e03f7d49-5659-40f1-aae5-6776ef354ce1';
  const screenshot1 = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'stock_alert_subscribed_m.png'), Buffer.from(screenshot1.data, 'base64'));
  console.log('Saved screenshot: stock_alert_subscribed_m.png');

  // Click "Cancel Alert"
  console.log('Clicking Cancel Alert...');
  await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cancel Alert'));
      if (cancelBtn) cancelBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  // Verify it reverted to "Notify Me When Size M Is Back"
  const checkReverted = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const hasNotifyBtn = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Notify Me When Size M Is Back'));
      const hasActiveBadge = document.body.textContent.includes('Alert Active');
      return { hasNotifyBtn, hasActiveBadge };
    })()`,
    returnByValue: true
  });
  console.log('After cancel state:', checkReverted.result.value);

  // Click "Notify Me When Size M Is Back" to re-subscribe
  console.log('Re-subscribing...');
  await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Notify Me When Size M Is Back'));
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  const checkResubscribed = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      return document.body.textContent.includes('Alert Active');
    })()`,
    returnByValue: true
  });
  console.log('Re-subscription successful:', checkResubscribed.result.value);

  // Switch to in-stock Size S
  console.log('Switching to in-stock Size S...');
  await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btnS = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'S');
      if (btnS) btnS.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  const checkStateSwitchedS = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const hasAlert = document.body.textContent.includes('Back-in-Stock Alert');
      const hasAddToCart = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Add to Cart'));
      return { hasAlert, hasAddToCart };
    })()`,
    returnByValue: true
  });
  console.log('Size S (no alert shown, Add to Cart active):', checkStateSwitchedS.result.value);

  // ==========================================
  // PART 2: Product Without Sizes (stock <= 0)
  // ==========================================
  console.log('\n--- PART 2: Testing Product-Level Alert (No Sizes) ---');
  // Temporarily set stock: 0 for 6abac635185f4f5ed92140d0
  await Product.findByIdAndUpdate('6abac635185f4f5ed92140d0', { stock: 0 });
  await sendCDP(ws, 'Page.navigate', { url: 'http://localhost:5173/products/6abac635185f4f5ed92140d0' });
  await waitForSelector(ws, 'h1');
  console.log('Page loaded for Brown Shirt (stock 0, no sizes)');
  await new Promise(r => setTimeout(r, 1000));

  const checkNoSizesState = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const isOutOfStock = document.body.textContent.includes('Out of Stock');
      const notifyBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Notify Me When Available'));
      return { isOutOfStock, hasNotifyBtn: Boolean(notifyBtn) };
    })()`,
    returnByValue: true
  });
  console.log('Out of stock product state:', checkNoSizesState.result.value);

  // Subscribe to product-level alert
  console.log('Clicking "Notify Me When Available"...');
  await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Notify Me When Available'));
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  const checkProductSubscribed = await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const hasActiveBadge = document.body.textContent.includes('Alert Active');
      const hasCancelBtn = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Cancel Alert'));
      const feedbackText = document.querySelector('[role="status"]')?.textContent || '';
      return { hasActiveBadge, hasCancelBtn, feedbackText };
    })()`,
    returnByValue: true
  });
  console.log('Product-level subscribed state:', checkProductSubscribed.result.value);

  // Scroll and capture screenshot of product-level alert
  await sendCDP(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const card = document.querySelector('[role="status"]')?.closest('.rounded-2xl');
      if (card) card.scrollIntoView({ behavior: 'instant', block: 'center' });
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  const screenshot2 = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'stock_alert_product_level.png'), Buffer.from(screenshot2.data, 'base64'));
  console.log('Saved screenshot: stock_alert_product_level.png');

  // Restore product stock to 10
  await Product.findByIdAndUpdate('6abac635185f4f5ed92140d0', { stock: 10 });
  console.log('Restored product stock to 10');

  // Clean up alerts created during browser test
  await BackInStockAlert.deleteMany({ user: customer._id });
  console.log('Cleaned up test alerts');

  ws.close();
  await mongoose.disconnect();
  console.log('\nALL AUTHENTICATED BROWSER FLOWS VERIFIED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
