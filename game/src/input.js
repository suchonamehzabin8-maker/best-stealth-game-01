// input.js — keyboard and mouse, translated into game intent.
//
// WASD / arrows move, Shift sneaks, M mutes, R restarts, Enter starts.
// Click (or Space) tosses a pebble toward the mouse. The canvas position is
// converted to game coordinates so a click lands where the player points.

export function createInput(canvas) {
  const input = {
    left: false,
    right: false,
    up: false,
    down: false,
    sneak: false,
    clickX: null,
    clickY: null,
    clicked: false,
    pressedKeys: new Set(),
  };

  const keyMap = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ShiftLeft: 'sneak', ShiftRight: 'sneak',
  };

  window.addEventListener('keydown', (e) => {
    const name = keyMap[e.code];
    if (name) {
      input[name] = true;
      e.preventDefault();
    }
    if (e.code === 'Space') e.preventDefault();
    input.pressedKeys.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    const name = keyMap[e.code];
    if (name) input[name] = false;
    input.pressedKeys.delete(e.code);
  });
  window.addEventListener('blur', () => {
    input.left = input.right = input.up = input.down = input.sneak = false;
    input.pressedKeys.clear();
  });

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.clickX = (e.clientX - rect.left) * scaleX;
    input.clickY = (e.clientY - rect.top) * scaleY;
    input.clicked = true;
  });

  return input;
}

// Was this key pressed since the last frame? (edge-triggered actions)
export function wasPressed(input, code) {
  return input.pressedKeys.has(code);
}

export function consumePress(input, code) {
  input.pressedKeys.delete(code);
}
