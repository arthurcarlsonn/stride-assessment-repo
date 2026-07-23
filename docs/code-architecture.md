# Code Architecture

The code in this repo was exported from the live Framer project. It is organized around interaction responsibility rather than page ownership.

## Commerce

`src/framer/Components/LocalDemoCommerce.tsx`

- Exports `ProductPurchaseActions`.
- Exports `FunctionalShoppingCart`.
- Reads and writes a cart array in `localStorage`.
- Dispatches `stride-pulse-cart-sync` after writes.
- Opens the canvas cart with `stride-cart-open`.
- Handles size selection, required-size validation, optimistic add-to-cart feedback, and button micro-interactions.

`src/framer/Overrides/CanvasCart.tsx`

- Powers the Framer-designed cart drawer and line-item component.
- Keeps the cart UI visually controlled by Framer layers.
- Injects cart data into row text, images, quantity, subtotal, and total layers.
- Hides empty rows outside the canvas.
- Shows a simple empty cart state when there are no cart lines.
- Removes the navbar badge when the item count is zero.
- Adds keyboard behavior, focus management, Escape-to-close, and dialog semantics.

The cart uses:

- Storage key: `stride-pulse-cart`
- Sync event: `stride-pulse-cart-sync`
- Open event: `stride-cart-open`
- Close event: `stride-cart-close`

## Product Media

`src/framer/Mobile_Carousel.tsx`

- Mobile-first product image carousel.
- Supports drag gestures, dots, and lightbox viewing.
- Uses responsive image props from Framer.

`src/framer/Components/ImageZoom.tsx`

- Desktop product image zoom interaction.
- Exposes image, size, zoom, radius, and styling controls to Framer.
- Adds keyboard focus and group labeling for accessibility.

## Marketing Motion

`src/framer/Scroll.tsx`

- Custom layered sneaker construction section.
- Uses Framer node slots for cards so the design remains editable on the canvas.
- Uses scroll progress, refs, and reduced-motion checks to control the exploded shoe/layer sequence.

`src/framer/Carousel.tsx`

- Custom testimonial carousel.
- Supports drag, pointer interaction, touchpad/wheel movement, snapping, and button controls.
- Keeps card content node-based so Framer-designed testimonial cards can be attached.

## Colorway Overrides

`src/framer/Overrides/ShoeVariant.tsx`

- Adds accessible button behavior to colorway controls.
- Sets `aria-pressed`, labels, keyboard activation, and selected styling hooks.

