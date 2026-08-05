# LINE COFFEE local image guide

This directory is the runtime source for local website images. Images are grouped by page, then by section, so replacing one visual does not unintentionally change another section.

## Replacing an image

1. Open the page and section folder.
2. Replace the file while keeping the exact file name and extension.
3. Keep the same aspect ratio and at least the current resolution to avoid cropping or quality changes.
4. Restart the development server if it was already running.
5. If Next.js still shows the previous image, delete `.next/cache/images`, restart the server, then hard-refresh with `Ctrl+F5`.

## Important boundaries

- Product images uploaded from the admin dashboard are stored in Supabase Storage. They are not copied here and must continue to be managed from the dashboard.
- `shared/logos/` contains exact byte-for-byte copies of the official LINE COFFEE logo files. Do not regenerate or redraw them.
- The old `public/assets/` files remain as compatibility copies because existing database rows and historical migrations can still reference those URLs.
- The old `public/images/generated/`, unused brand variants, patterns, and Artboard files remain untouched as design-provenance assets.
- CSS gradients and colors are code, not image files, and are intentionally not represented here.

See [MIGRATION-MAP.md](./MIGRATION-MAP.md) for every old source and organized destination.
