# Stride Brand Experience

Stride is a Framer-first marketing and mini-commerce experience for a premium sneaker brand. The project is built around one sneaker family with three colorways, a product detail flow, a persistent cart drawer, and a landing page that mixes native Framer craft with focused React where the prototype needed more control.

This repository contains the custom React code, code overrides, CMS notes, and review documentation for the take-home assessment. The visual page structure, CMS bindings, native variants, scroll effects, reusable design components, and canvas README notes live in the Framer project.

## Project Links

- Framer editor: https://framer.com/projects/Sneaky-copy--MjP4OHyKMhUKe9Tl4fe2
- Main pages: `/`, `/shoes/:Shoes`, `/shipping`, `/returns`, `/privacy`, `/terms-conditions`
- Custom code: [`src/framer`](./src/framer)

## What Was Built

The site is organized around a simple product story: one Stride sneaker model, presented through three colorways. I reduced the navigation around that idea so the experience feels more like a focused launch and less like an unfinished multi-category store.

The landing page covers the required marketing flow:

- A high-impact hero using Framer composition, layered clouds, sneaker imagery, sky color, and scroll motion.
- A product showcase and colorway-led browsing moment.
- Brand trust sections, including cushioning and shipping moments built with Framer layers and motion.
- A custom layered scroll section for the sneaker construction story.
- A custom testimonial carousel with drag, touchpad movement, and custom controls.
- A CMS-powered product selling section that connects into the same cart behavior as the product page.
- FAQ, newsletter, footer, legal pages, and canvas-side explanation notes for reviewers.

The product page adds the mini-shop layer:

- CMS-driven product detail content.
- Product imagery on desktop with native Framer lightbox behavior.
- A dedicated mobile product carousel where Framer's native options did not give enough control.
- Size selection, add-to-cart feedback, and a cart drawer connected through code.
- Cart line rows that keep the designed Framer component as the UI while React fills in quantities, prices, image, visibility, and actions.

## Native Framer vs. React

Most of the experience is intentionally native Framer. Layout, responsive breakpoints, visual composition, component variants, CMS lists, hover states, legal content, FAQ behavior, the footer, and most scroll/appear effects are handled on the canvas.

React is used only where it added real value:

- `ProductPurchaseActions` handles size quick-select, validation, optimistic add-to-cart feedback, and cart opening.
- `CanvasCart` overrides power the designed cart drawer, cart badge, line visibility, quantities, remove buttons, totals, empty state, focus handling, and demo checkout.
- `MobileProductImageCarousel` gives the product page a swipeable mobile carousel with dots and a lightbox.
- `InfiniteVariableCarousel` replaces Framer's carousel limits for the review section, keeping drag, controls, touchpad movement, and a centered-card presentation.
- `StrideLayerScrollSection` creates the layered shoe construction scroll sequence while still allowing the card artwork to be designed as Framer nodes.
- `ImageZoom` provides an inspectable product-image zoom interaction.
- `ShoeVariant` overrides connect colorway controls with accessible button behavior.

## Cart Architecture

The cart is deliberately simple because this is an assessment prototype, not a production checkout.

Cart data is stored in `localStorage` under `stride-pulse-cart`. Product actions write to that key, then dispatch `stride-pulse-cart-sync` so every cart-related override updates immediately. The cart opens through `stride-cart-open` and closes through `stride-cart-close`.

The product purchase component and the cart overrides share the same cart shape:

```ts
type CartLine = {
  sku: string
  productId: string
  productCode: string
  title: string
  colorName: string
  size: string
  quantity: number
  price: number
  image?: {
    src?: string
    srcSet?: string
    alt?: string
  }
}
```

The visual cart is still a Framer-designed component. The overrides do not replace the drawer with a separate HTML layout. They attach behavior to the existing layers: show or hide rows, inject title/size/price/quantity, set images, wire increase/decrease/remove actions, calculate subtotal and total, and remove the navbar badge when the cart is empty.

## CMS Model

The live Framer CMS has four collections:

- `Shoes`: three sneaker colorways.
- `Sizes`: reusable size entries.
- `Metadata`: category, gender, and collection tags.
- `Business`: legal and business copy used by supporting pages.

The `Shoes` collection is already structured for a larger store: product title, slug, price, tagline, description, best-seller flag, category/gender/collection references, checkout link, size references, available color references, thumbnails, up to ten product images, product family, color name, color value, product code, commerce product ID, default variant ID, and active status.

That means the current site can stay focused on three colorways now, while the CMS can later expand into multiple categories, genders, models, SKUs, and inventory states without rebuilding the whole page model.

## Accessibility and UX Details

I treated the code layer as part of the product experience, not just a demo.

- Cart drawer uses `role="dialog"`, `aria-modal`, Escape-to-close, focus return, and a simple focus trap.
- Icon-only and Framer-layer buttons receive roles, keyboard activation, and ARIA labels.
- Quantity controls are keyboard-accessible.
- Product size selection uses clear labels and live validation feedback.
- Carousel controls have ARIA labels and hide non-centered cards from assistive tech where appropriate.
- Reduced-motion preferences are respected in the layered scroll component.

## Technical Tradeoffs

The biggest tradeoff is that this is still a Framer prototype rather than a production ecommerce build. The cart is persistent and functional across pages, but checkout is a demo action. A real build would connect the existing product and variant IDs to Stripe, Shopify, or another commerce backend.

The second tradeoff is asset optimization. I did not spend the final time compressing every image or generating a full responsive asset pipeline. That is the first performance pass I would do next: compress source images, upload lighter alternates, use cleaner CMS image layers, and audit the product detail media for mobile bandwidth.

The third tradeoff is scale. The CMS is ready for more structure, but the current content model is intentionally narrow because the assessment concept is one sneaker with three colorways. For production, I would extend it into categories, gender collections, shoe families, variants, stock status, shipping regions, and real checkout URLs.

## Repository Structure

```txt
src/framer/
  Carousel.tsx                     Custom testimonial carousel
  Mobile_Carousel.tsx              Mobile product image carousel
  Scroll.tsx                       Layered sneaker scroll section
  Components/
    ImageZoom.tsx                  Product image zoom interaction
    LocalDemoCommerce.tsx          Product purchase actions and demo cart component
  Overrides/
    CanvasCart.tsx                 Cart drawer, badge, line rows, totals, checkout overrides
    ShoeVariant.tsx                Colorway variant overrides

docs/
  assessment-map.md                Requirement-by-requirement coverage
  cms-model.md                     CMS structure and ecommerce expansion notes
  framer-code-files.json           Raw export summary from Framer
  cms-summary.json                 Raw CMS schema summary from Framer
```

## How to Review

1. Open the Framer editor and start on the homepage canvas.
2. Read the small canvas README notes placed beside the key homepage and product page sections.
3. Preview the homepage and test the colorway interactions, layered scroll section, customer carousel, FAQ, and product selling area.
4. Open a product detail page and test size selection, add-to-cart feedback, drawer opening, quantity controls, remove actions, empty cart state, and navbar badge behavior.
5. Review the exported code in `src/framer` and the requirement mapping in `docs/assessment-map.md`.

## What I Would Improve Next

- Compress and replace heavy image assets, especially product and gallery media.
- Add responsive image discipline in the CMS so mobile and desktop can pull better-sized assets.
- Extract the cart state into a small shared module if this code moved out of Framer and into a normal repo build.
- Connect checkout to a real commerce provider.
- Add inventory and variant-level stock handling.
- Expand the CMS into product families, categories, gender collections, size availability, related products, and campaign content.
- Add analytics events for colorway changes, product media opens, add-to-cart, cart quantity changes, and checkout intent.
- Run one final published-site performance pass after asset compression.

