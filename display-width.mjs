const WIDE_RANGES = `
1100-115F,231A-231B,2329-232A,23E9-23EC,23F0-23F0,23F3-23F3,25FD-25FE,2614-2615,2648-2653,267F-267F,2693-2693,26A1-26A1,26AA-26AB,26BD-26BE,26C4-26C5,26CE-26CE,26D4-26D4,26EA-26EA,26F2-26F3,26F5-26F5,26FA-26FA,26FD-26FD,2705-2705,270A-270B,2728-2728,274C-274C,274E-274E,2753-2755,2757-2757,2795-2797,27B0-27B0,27BF-27BF,2B1B-2B1C,2B50-2B50,2B55-2B55,2E80-303E,3040-A4CF,AC00-D7A3,F900-FAFF,FE10-FE19,FE30-FE6F,FF00-FF60,FFE0-FFE6,16FE0-16FE4,16FF0-16FF1,17000-187F7,18800-18CD5,18D00-18D08,1B000-1B2FB,1F004-1F004,1F0CF-1F0CF,1F18E-1F18E,1F191-1F19A,1F200-1F202,1F210-1F23B,1F240-1F248,1F250-1F251,1F300-1F64F,1F680-1F6FF,1F7E0-1F7EB,1F900-1F9FF,1FA70-1FAFF,20000-3FFFD
`.trim().split(',').map(range => range.split('-').map(value => Number.parseInt(value, 16)));

const zeroWidthPattern = /^[\p{Mark}\p{Cf}]$/u;

export function countDisplayWidth(text) {
  let width = 0;

  for (const character of text) {
    const codePoint = character.codePointAt(0);
    if (
      zeroWidthPattern.test(character) ||
      (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
      (codePoint >= 0xe0100 && codePoint <= 0xe01ef) ||
      (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff)
    ) {
      continue;
    }

    let low = 0;
    let high = WIDE_RANGES.length - 1;
    let isWide = false;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const [start, end] = WIDE_RANGES[middle];
      if (codePoint < start) {
        high = middle - 1;
      } else if (codePoint > end) {
        low = middle + 1;
      } else {
        isWide = true;
        break;
      }
    }
    width += isWide ? 2 : 1;
  }

  return width;
}
