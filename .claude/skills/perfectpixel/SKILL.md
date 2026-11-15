---
name: perfectpixel
description: Turn an AI-generated "pixel style" image (ChatGPT, Gemini, Midjourney, Stable Diffusion) into true pixel art on an exact grid - auto-detects the grid size, removes blur and misaligned pixels, optional palette reduction and white-background removal. Use when someone has a blurry or misaligned AI pixel-art image, wants AI art turned into a usable sprite, or says perfectPixel / pixel snap / 픽셀 정리 / 격자 맞추기.
license: MIT (perfect-pixel by theamusing)
---

# perfectPixel

Library: `perfect-pixel` (pip, MIT, https://github.com/theamusing/perfectPixel). Install if missing:
`pip install --break-system-packages "perfect-pixel[opencv]" pillow`.

## Use

```bash
python3 .claude/skills/perfectpixel/pp.py in.png out.png --preview 8 --key-white --colors 12
```

- `out.png` is the true-size sprite (one pixel per cell); `out_x8.png` is an upscaled preview to look at.
- `--key-white` clears a near-white background connected to the edges (ask the image model for a pure white background).
- `--colors K` limits the palette (match the game's palette size).
- Always open the preview and judge it: the input works best at 512-1024 px with chunky pixels, a dark outline,
  flat colours and no gradients. If the detected grid is wrong (sprite far too big/small), regenerate the source
  with chunkier pixels rather than forcing it.

In Python: `from perfect_pixel import get_perfect_pixel; w, h, out = get_perfect_pixel(rgb_array)`.
