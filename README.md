# ATELIER — Backend API

Express + TypeScript + Mongoose REST API for the ATELIER clothing store.

## Requirements

- Node.js 20+
- MongoDB running locally (`mongodb://localhost:27017`)

## Setup

```bash
cp .env.example .env    # then edit if needed
npm install
npm run seed            # seed categories, products and demo users
npm run dev             # http://localhost:5000
```

Demo accounts (created by the seed):

| Role     | Email               | Password  |
| -------- | ------------------- | --------- |
| Admin    | admin@atelier.com   | admin123  |
| Customer | demo@atelier.com    | demo123   |

## Scripts

| Command       | Description                        |
| ------------- | ---------------------------------- |
| `npm run dev` | Run with `tsx watch`               |
| `npm run seed`| Reset + seed demo data             |
| `npm run build` / `npm start` | Compile and run in production |

## API

Base URL: `http://localhost:5000/api`

| Method | Endpoint            | Auth  | Description                        |
| ------ | ------------------- | ----- | ---------------------------------- |
| POST   | `/auth/register`    | —     | Register, sets httpOnly cookie     |
| POST   | `/auth/login`       | —     | Login, sets httpOnly cookie        |
| POST   | `/auth/logout`      | —     | Clears cookie                      |
| GET    | `/auth/me`          | ✓     | Current user                       |
| GET    | `/products`         | —     | List with `category`, `search`, `sort`, `min`, `max`, `featured`, `page`, `limit` |
| GET    | `/products/featured`| —     | Featured products                  |
| GET    | `/products/:slug`   | —     | Product by slug                    |
| POST   | `/products`         | admin | Create product                     |
| PUT    | `/products/:id`     | admin | Update product                     |
| DELETE | `/products/:id`     | admin | Delete product                     |
| GET    | `/categories`       | —     | List categories                    |
| POST   | `/categories`       | admin | Create category                    |
| GET    | `/cart`             | ✓     | Get user's cart                    |
| POST   | `/cart/add`         | ✓     | Add item `{product, quantity, size, color}` |
| PUT    | `/cart/update`      | ✓     | `{index, quantity}`                |
| DELETE | `/cart/remove`      | ✓     | `{index}`                          |
| POST   | `/orders`           | ✓     | Create order from items + shipping address |
| GET    | `/orders`           | ✓     | List my orders                     |
| GET    | `/orders/:id`       | ✓     | Get one of my orders               |
| POST   | `/chat`             | Optional | AI intent routing for products, own orders, and own cart |
| GET    | `/admin/stats`       | admin | Dashboard counts + recent orders    |
| GET    | `/admin/orders`      | admin | All orders (`?status=`)            |
| GET    | `/admin/orders/:id`  | admin | Any order (with customer info)     |
| PUT    | `/admin/orders/:id/status` | admin | Update `status` / `paymentStatus` |
| GET    | `/admin/products`    | admin | All products (`?search=`)          |
| GET    | `/admin/products/:id`| admin | One product by id (for editing)    |
| POST   | `/admin/upload`      | admin | Multipart image upload → `{urls}`  |

Auth is via a JWT stored in an httpOnly cookie named `token`. Admin routes
require `role: "admin"`.

### AI assistant

Set `OPENROUTER_API_KEY` in `backend/.env` to enable the chat service. It uses
`OPENROUTER_MODEL` (default `openrouter/free`) to classify intent and compose
replies. Product search, order status, and cart summaries are loaded through
the existing backend services; order and cart intents use the authenticated
customer when signed in. Coupon and FAQ/support intents report unavailable
until those services or knowledge sources are configured.

### Image uploads

`POST /api/admin/upload` accepts multipart form data (field `images`, up to 5
files, 5MB each, images only). Files are stored in `backend/uploads/products/`
(served at `/uploads/products/…`, gitignored) and the API returns absolute URLs
to store in a product's `images[]`.

## Structure

The backend follows a layered **routes → controllers → services** model:
HTTP concerns live in the routes/controllers, business logic + database
access in the services, and data shapes in the models.

```
src/
├── index.ts              # entry point
├── app.ts                # express app + middleware wiring
├── config/db.ts          # mongoose connection
├── models/               # User, Category, Product, Cart, Order (schemas)
├── routes/               # thin HTTP layer — paths, guards, controller calls
├── controllers/          # request → service → response mapping
│   ├── authController.ts
│   ├── productController.ts
│   ├── categoryController.ts
│   ├── cartController.ts
│   ├── orderController.ts
│   └── adminController.ts
├── services/             # business logic + database access
│   ├── authService.ts    # register/login (hash + JWT), me
│   ├── productService.ts # listing/filtering/sorting, CRUD
│   ├── categoryService.ts
│   ├── cartService.ts    # find-or-create cart, item add/update/remove
│   ├── orderService.ts   # order creation (price snapshot, stock), admin mgmt
│   └── adminService.ts   # dashboard stats
├── middleware/
│   ├── auth.ts           # JWT verify + role guards
│   └── upload.ts         # multer config for image uploads
└── utils/
    ├── auth.ts           # JWT signing + httpOnly cookie helpers
    ├── asyncHandler.ts   # forwards rejected promises to error middleware
    ├── errors.ts         # createError(message, status)
    ├── seed.ts           # seed script
    └── slugify.ts
```

Guides:
- **Add an endpoint**: service function (logic) → controller (req/res) → route
  (path + guards). Wrap async controllers with `asyncHandler`.
- **Errors**: services throw `createError(message, status)`; the error
  middleware in `app.ts` turns them into JSON responses.
- **Auth in controllers**: read the current user from `req.user.id` after the
  `requireAuth` middleware (typed via `AuthRequest`).
