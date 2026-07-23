# Framer CMS Model

The current Stride CMS is small on purpose: one sneaker family, three colorways, and enough supporting business content to make the assessment feel complete.

## Collections

| Collection | Items | Purpose |
| --- | ---: | --- |
| `Shoes` | 3 | Product detail entries for the current Stride colorways. |
| `Sizes` | 26 | Reusable size entries referenced by products. |
| `Metadata` | 9 | Category, gender, and collection labels. |
| `Business` | 45 | Legal and business copy used by supporting pages. |

## Shoes Collection

The `Shoes` collection is the core ecommerce model. Important fields include:

- Product title and slug for the CMS detail route.
- Price, tagline, description, and best-seller flag.
- Category, gender, and collection references.
- Checkout link placeholder.
- Shoe size references.
- Available color references back into the `Shoes` collection.
- Primary and secondary thumbnails.
- Up to ten product images.
- Product family.
- Color name and color value.
- Product code.
- Commerce product ID and default commerce variant ID.
- Active flag.

This gives the current assessment enough structure to support a real product detail page while still keeping the content manageable.

## Current Product Strategy

The site is not trying to look like a large sneaker catalog yet. It is structured as a premium launch for one model with three colorways. That decision keeps the navigation, homepage flow, product page, and cart interactions focused.

The `Available Colors` reference field is important because it makes colorway navigation data-driven. Instead of manually linking three separate static pages, the product page can use the CMS relationship between colorways.

## Next CMS Pass

The next version should turn this into a fuller ecommerce model:

- Separate product families from individual colorway/SKU variants.
- Add inventory and stock status at the size and colorway level.
- Add gender, category, activity, and collection landing pages.
- Add related products and editorial campaign references.
- Add optimized mobile and desktop image fields instead of relying on one heavy source asset everywhere.
- Connect commerce IDs to a checkout provider.

That work would make the store more scalable without changing the current Framer-first page direction.

