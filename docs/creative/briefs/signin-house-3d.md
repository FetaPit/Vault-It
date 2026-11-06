# Brief: sign-in House Builder hero (replaces the still)

Owner (Pete, 6 Nov 2026), after seeing the still preview: "Make the house large zoomed into the background with rotation animations. Allow the cursor to interact with the model subtly expanding and exploding the house upon hover over."

Written in Pedro's format for Pete T. Pedro: confirm or amend, then pass to Pete T.

## Numbered brief
1. **Large background house.** "Make the house large zoomed into the background." The house fills the sign-in background, cropped by the viewport, not a small badge on the card. The card stays centred and unchanged in size and position. Done: at 1440 and 390 the house is clearly the hero behind the card.
2. **Rotation.** "With rotation animations." Slow continuous turn (about 40 to 60 s a revolution). Done: no visible stutter, form never moves.
3. **Pointer interaction.** "Allow the cursor to interact with the model subtly expanding and exploding the house upon hover over." Bricks drift outward from the cursor's position and ease back when it leaves. Subtle: a few percent of house width, 300 to 600 ms ease, nothing flies off screen. Done: moving the mouse feels responsive, stopping settles it.
4. **Touch has no hover.** Same feeling on phones: slow drift, plus a gentle burst on tap that eases back. No gyroscope prompts.
5. **Name.** Build owner: Pete T (head designer agent, `.claude/agents/pete-t.md`).

## Rules to check (Pedro: one batched question to Pete if any clash)
- Reduced motion: show the still, no rotation, no explode. The still WebP already built on `v092/signin-house` is the poster and fallback.
- No WebGL or low-end device: the still.
- Text and form stay legible: dim or blur the scene behind the card, AA contrast, no layout shift, FCA footer unchanged.
- No claims on the image: no "Keys are yours 99.9% of deposit", no brick tag, no headline.
- Performance: reuse `src/hb3d/house_gl.js` (raw WebGL, instanced). Load after the card is usable, no new host, no main-thread task over 100 ms, pause when the tab is hidden, pause during the code and PIN steps if it costs frames. Keep the sign-in light for the first load.
- Night and Daylight both work. Type floor 10.5 px, no em dashes, no sideways scroll.

## Review
Pedro reviews with shots at 390 and 1100 px, Night and Daylight, then rollout-qc. Pete approves on a phone preview. Not merged or pushed to release without his yes.
