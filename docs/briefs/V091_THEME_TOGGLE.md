# R27: animated Night / Daylight switch (Pedro's spec)

Owner, 4 Nov 2026: "The tablet and Mobile Daylight and Night icons are not obvious. See screenshot for Inspo then send brief short to Pedro CD to create this animated version branded with Vault it colours". Clarified: "Image shows both states below each other. so it will just have one toggle switch".

Inspiration: a pill switch with a sun on a blue sky with clouds, and a moon on a starry sky (`docs/briefs/v091r2/16-theme-toggle-inspo.png`). One switch, one knob, two scenes. Built in chunk A (chrome). Current code: `#vi-theme-btn`, `viToggleTheme()`, `viSyncTheme` (about lines 164-168, 11015-11061, 12324, 29943).

## 1. Shape and sizes
The visible track is a pill. The hit area stays the `<button id="vi-theme-btn">`, so `viToggleTheme()` and the grid placement keep working.

| Width | Track | Knob | Button (hit area) |
|---|---|---|---|
| 390 px | 48 x 26 | 20 | 48 x 44 |
| 768 px | 56 x 30 | 24 | 56 x 44 |
| 1100 px and up | 64 x 32 | 26 | 64 x 44 |

- At 390 px it sits where the circle is now, between net worth and "?". No sideways scroll at 390 or 360.
- The desktop text pill and `.vi-th-lbl` go. `title` gives the hover tip: "Switch to Night" or "Switch to Daylight".

## 2. Night scene (knob on the right)
- **Sky:** `--panel` (#080D14) with a 1 px `--line2` edge.
- **Moon knob:** a `--text` disc with two `--muted` craters and a soft `--teal` glow.
- **Halo rings:** three concentric arcs in `--teal` at 10, 18 and 28%.
- **Stars:** four-point sparkles in `--teal`, one in `--gold`.

## 3. Daylight scene (knob on the left)
- **Colours:** fixed literals scoped to the switch, because `--gold` turns brown in Daylight.
- **Sky:** a vertical gradient from the brand teal to Daylight `--bg` (#C9C7BE).
- **Sun knob:** a gold coin, #E8C56A fill, a 1.5 px `--brass` (#C9A84C) rim and an inner ring at 60% radius. No V on the coin, because it is illegible under 32 px.
- **Clouds:** three scalloped bands in `--panel`, `--bg` and white.
- **Brand brick:** the lowest band's top edge is a running-bond course of small rounded bricks.
- **Sun halo:** rings in gold at 12 and 22%.

## 4. Motion
- **Knob:** `transform: translateX`, 450 ms, `cubic-bezier(.34,1.25,.5,1)`.
- **Scenes:** cross-fade 350 ms `ease-in-out`. Clouds drop out and stars rise in over 500 ms, staggered 40 ms. Rings scale from .8 to 1.
- **First paint:** nothing animates. `viSyncTheme` sets the state first, then `.vi-th-anim` is added after load.
- **`prefers-reduced-motion: reduce`:** no transitions or animations, so the swap is instant.

## 5. Accessibility
- **Markup:** `role="switch"`, `aria-checked="true"` in Night, a fixed `aria-label="Night mode"`. Drop `aria-pressed`. `viSyncTheme` stops rewriting the label.
- **Keyboard and focus:** Space and Enter come from the native button. Focus ring: `outline: 2px solid var(--teal); outline-offset: 2px`.
- **Contrast:** knob at least 3:1 against its sky in both scenes; track edge at least 3:1 against the header.

## 6. Rules
No new hosts or images: inline SVG and CSS only. No em dashes. The FCA line is untouched.

## Tests
- `role=switch` and `aria-checked` match `data-theme` at 390, 768 and 1100, and after reload.
- Hit area at least 44 x 44.
- No horizontal scroll at 360 and 390.
- The stored `vi-theme` still wins, and a first visit follows the device.
- With reduced motion, the computed transition is 0s.
- Space and Enter toggle.
- The focus ring is visible.
- Knob contrast at least 3:1 in both themes.
- Element shots at 390 and 1100 in Night and Daylight, plus one mid-slide frame.
