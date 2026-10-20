// The cursor, the key pressed and the caption, drawn into the page so the video has them. record.ts adds it to every page.
window.recordFeature = {
  /** Sets the text of `#rec-caption` or `#rec-key`; empty hides it. */
  show(id, text) {
    const node = document.getElementById(id);
    if (node) node.textContent = text;
  },
};

addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    #rec-cursor { position: fixed; z-index: 2147483647; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%;
      background: rgb(255 80 60 / .55); border: 2px solid #fff; box-shadow: 0 0 0 1px rgb(0 0 0 / .4); pointer-events: none;
      left: -40px; top: -40px; transition: transform .1s; }
    #rec-cursor.down { transform: scale(.7); }
    #rec-key { position: fixed; z-index: 2147483647; right: 24px; bottom: 76px; padding: 6px 14px; border-radius: 8px;
      font: 600 20px system-ui, sans-serif; color: #fff; background: rgb(20 20 24 / .85); pointer-events: none; }
    #rec-key:empty, #rec-caption:empty { display: none; }
    #rec-caption { position: fixed; z-index: 2147483646; left: 50%; bottom: 20px; transform: translateX(-50%); max-width: 1100px;
      padding: 8px 18px; border-radius: 8px; font: 500 20px system-ui, sans-serif; color: #fff; background: rgb(20 20 24 / .85);
      pointer-events: none; text-align: center; }`;
  const element = (id) => Object.assign(document.createElement('div'), { id });
  const cursor = element('rec-cursor');
  document.head.append(style);
  document.body.append(cursor, element('rec-key'), element('rec-caption'));
  addEventListener('mousemove', (event) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  }, true);
  addEventListener('mousedown', () => cursor.classList.add('down'), true);
  addEventListener('mouseup', () => cursor.classList.remove('down'), true);
});
