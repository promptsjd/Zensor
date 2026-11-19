# Zensor

A calm, tactile Zen tabletop rice-sorting game built with **Matter.js** physics, **HTML5 Canvas 2D**, **React**, and **Web Audio API**.

Sort mixed white and black grains from a 3D conical mound into their translucent glass bowls on a warm wooden counter. Removing a grain wakes its surrounding neighbors so the pile gently tumbles and settles under gravity.

## Features

- **Tactile Physics Mound**: Layered 2.5D depth-sliced Matter.js rigid bodies with tapered seed geometry and localized wake behavior when grains are picked.
- **6 Progressive Mounds**: Starts at 280 grains (140 white, 140 black) and scales by +10% per mound up to 420 grains on Mound 6, with progress saved automatically in `localStorage`.
- **Procedural Visuals & Audio**: Offscreen-cached shoji wall and perspective wood counter, translucent glass bowls with specular reflections, and zero-asset synthesized Web Audio chimes.
- **Accessible Feedback**: Soft red pulse rings, gentle screen tremor (respecting `prefers-reduced-motion`), and Shift+Click support for trackpads or single-button mice.

## Controls

| Action | Input |
| --- | --- |
| Sort **White** grain into Left Bowl | `Left-Click` |
| Sort **Black** grain into Right Bowl | `Right-Click` or `Shift + Left-Click` |
| Close Reset dialog | `Escape` |

## Tech Stack

- **React 19** + **TypeScript** (strict mode)
- **Matter.js** (`0.20.0`) for 2D rigid-body simulation
- **HTML5 Canvas 2D** for offscreen backdrop caching, depth-sorted grains, and glass shaders
- **Web Audio API** for procedural chimes and gentle error tones
- **Vite** + **Tailwind CSS v4**

## Getting Started

**Prerequisites:** Node.js 18+

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev

# 3. Type-check and build for production
npm run lint
npm run build
```

No API keys or environment variables are required.

## Project Structure

```text
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.tsx                 # HUD, modals, and canvas stage
    ├── index.css               # Theme tokens and layout styling
    ├── main.tsx                # React entry point
    └── game/
        ├── ZensorEngine.ts     # Main game loop, physics step, and input controller
        ├── audio.ts            # Procedural Web Audio synthesizer
        ├── constants.ts        # World geometry, bowl metrics, and dune profiles
        ├── physics.ts          # Tapered grain geometry, bowl colliders, and hit-testing
        ├── renderer.ts         # Canvas 2D backdrop, glass bowls, and grain shading
        ├── storage.ts          # Safe localStorage level persistence
        └── types.ts            # TypeScript interfaces
```

## License

[MIT](./LICENSE)
