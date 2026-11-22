const fs = require('fs');
const path = require('path');

const targetFiles = [
  path.resolve(__dirname, '../node_modules/three-stdlib/controls/OrbitControls.js'),
  path.resolve(__dirname, '../node_modules/.vite/deps/@react-three_drei.js')
];

for (const filePath of targetFiles) {
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Guard getSecondPointerPosition
  if (content.includes('function getSecondPointerPosition(event)')) {
    const oldFn = /function getSecondPointerPosition\(event\) \{[\s\S]*?return pointerPositions\[pointer\.pointerId\];\s*\}/;
    const safeFn = `function getSecondPointerPosition(event) {
      const pointer = (pointers.length > 1 && event.pointerId === pointers[0].pointerId) ? pointers[1] : pointers[0];
      return (pointer && pointerPositions[pointer.pointerId]) || { x: event.pageX, y: event.pageY };
    }`;
    if (oldFn.test(content)) {
      content = content.replace(oldFn, safeFn);
      changed = true;
    }
  }

  // 2. Guard onPointerUp transition
  if (content.includes('removePointer(event);') && !content.includes('STATE.TOUCH_ROTATE;')) {
    const oldUp = `removePointer(event);
      if (pointers.length === 0) {
        (_a = scope.domElement) == null ? void 0 : _a.releasePointerCapture(event.pointerId);
        (_b = scope.domElement) == null ? void 0 : _b.ownerDocument.removeEventListener("pointermove", onPointerMove);
        (_c = scope.domElement) == null ? void 0 : _c.ownerDocument.removeEventListener("pointerup", onPointerUp);
        scope.dispatchEvent(endEvent);
        state = STATE.NONE;
      }`;
    const newUp = `removePointer(event);
      if (pointers.length === 0) {
        (_a = scope.domElement) == null ? void 0 : _a.releasePointerCapture(event.pointerId);
        (_b = scope.domElement) == null ? void 0 : _b.ownerDocument.removeEventListener("pointermove", onPointerMove);
        (_c = scope.domElement) == null ? void 0 : _c.ownerDocument.removeEventListener("pointerup", onPointerUp);
        scope.dispatchEvent(endEvent);
        state = STATE.NONE;
      } else if (pointers.length === 1 && (state === STATE.TOUCH_DOLLY_PAN || state === STATE.TOUCH_DOLLY_ROTATE)) {
        state = STATE.TOUCH_ROTATE;
        handleTouchStartRotate();
      }`;
    if (content.includes(oldUp)) {
      content = content.replace(oldUp, newUp);
      changed = true;
    }
  }

  // 3. Guard handleTouchMoveDolly
  if (content.includes('const position = getSecondPointerPosition(event);') && !content.includes('if (!position) return;')) {
    content = content.replaceAll(
      'const position = getSecondPointerPosition(event);\n      const dx = event.pageX - position.x;',
      'const position = getSecondPointerPosition(event);\n      if (!position || typeof position.x !== "number") return;\n      const dx = event.pageX - position.x;'
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[patch-three-stdlib] Successfully patched: ${path.basename(filePath)}`);
  }
}
