# Shop Keeper Hub

Add a protected /admin area.

Roles: owner and staff, stored in the separate user_roles table (never on the profile) and checked with a security definer function. Owner can do everything, including settings and managing staff. Staff can manage products, Party Packs and orders only.

Modules:

- Dashboard: orders today, revenue, low-stock items

- Products: add, edit, delete, multiple image upload to storage, category, fit, fabric, price, compare-at price, badges, stock per size, publish toggle

- Categories and navbar order

- Party Packs builder: pick 3 products and set the bundle price

- Festive banner editor: upload an image, click on it to place numbered pins, link each pin to a product

- Hero text and announcement bar text

- Orders: list, filter by status, view customer and address, update status (pending, confirmed, shipped, delivered, cancelled)

- Settings: shop name, address, phone, opening hours, WhatsApp, Instagram, free-shipping amount, shipping fee, return days

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/225f4c30-ee1c-426f-adcf-c1984535c3e0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
