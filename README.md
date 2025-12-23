# music-mentor
A guide to the world of music

## Album Cover Images

The app currently uses a plain HTML `<img>` element in `src/components/AlbumCover.tsx` to display external album art. This avoids issues with Next.js' `next/image` host whitelist (which requires adding every external domain to `next.config.mjs`) and lets the app show covers from arbitrary external CDNs or image hosts without build-time errors.

If you prefer to use `next/image` for its optimizations, update `next.config.mjs` to include all required `remotePatterns` for the album art hosts (or add a proxy that serves images from a single domain). After updating `next.config.mjs`, you can switch `AlbumCover` back to `next/image`.

Quick steps to revert to `next/image`:

- Add the necessary domains to `remotePatterns` in `next.config.mjs`.
- Replace the `<img>` in `src/components/AlbumCover.tsx` with `import Image from 'next/image'` and use the `Image` component.
- Restart the dev server.
