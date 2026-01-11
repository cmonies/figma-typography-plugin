// Minimal UI test
document.body.innerHTML = `
  <div style="padding: 20px; font-family: sans-serif;">
    <h1>Typography Generator</h1>
    <p>Plugin loaded successfully!</p>
    <button id="test-btn" style="padding: 10px 20px; margin-top: 20px;">Test</button>
  </div>
`;

document.getElementById('test-btn')?.addEventListener('click', () => {
  parent.postMessage({ pluginMessage: { type: 'test' } }, '*');
});
