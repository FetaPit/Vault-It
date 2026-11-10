module.exports = {
  theme: {
    extend: {
      colors: {
        "void": "#080808",
        "panel": "#080D14",
        "slate": "#1C2420",
        "line": "#102221",
        "lintel": "#E8E8E8",
        "mortar": "#9AA0A6",
        "signal": "#2D8882",
        "lock": "#5A6068",
        "teal": "#44C0B9",
        "deep-teal": "#007F7B",
        "gold": "#E8C56A",
        "brass": "#C9A84C",
        "cleared": "#3ECF8E",
        "green-2": "#3FB585",
        "overdraft": "#E05C5C",
        "horizon": "#64B5F6",
        "violet": "#9B7EC8",
        "ember": "#E0894A",
        "coral": "#E5535F",
        "salmon": "#EE7D7D",
        "amber": "#F59E0B",
        "yellow": "#F5DC4A"
},
      fontFamily: {
        display: ['Syne', 'Arial', 'sans-serif'],
        body: ['"DM Sans"', 'Arial', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace']
      },
      borderRadius: { brick: '4px', tile: '14px', card: '18px' },
      transitionDuration: { fast: '240ms', base: '600ms', build: '1800ms' },
      transitionTimingFunction: { vault: 'cubic-bezier(.2,.8,.2,1)' }
    }
  }
};
