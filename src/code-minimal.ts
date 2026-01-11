// Minimal plugin test
figma.showUI(__html__, { width: 400, height: 500 });

figma.ui.onmessage = (msg: { type: string }) => {
  if (msg.type === 'test') {
    figma.notify('Plugin is working!');
  }
};
