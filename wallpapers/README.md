# Wallpapers

The 4K files the shop sells (3840 × 2560 PNG), one per product in `server/src/catalog/products.ts`, named as the product's `file`. They are never served from the web root: a paid order gets a download link (`/download/<token>`) that streams the file once.

The PNGs are not committed. Put them here, or point `WALLPAPERS_DIR` at the folder that holds them.
