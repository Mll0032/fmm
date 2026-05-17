export const GRID_SIZE = 20;
export const CARD_WIDTH = 280;
export const CARD_HEIGHT = 200;

// Each size step spans one extra column + the gap between columns
const CARD_COL_STEP = CARD_WIDTH + GRID_SIZE * 2; // 320px per column slot
export function getCardWidth(size = 1) {
  return size * CARD_COL_STEP - GRID_SIZE * 2;
}
// size 1 → 280, size 2 → 600, size 3 → 920, size 4 → 1240