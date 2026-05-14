# Inventory Management System

A full-stack, concurrency-safe inventory reservation system.
This application demonstrates how to handle high-traffic e-commerce operations, specifically preventing race conditions and inventory overselling when multiple users attempt to reserve the same item simultaneously.

## Tech Stack

- **Framework:** Next.js 15 (App Router, React 19)
- **Language:** TypeScript
- **Database:** Neon (Serverless Postgres)
- **ORM:** Prisma v7
- **Styling:** Tailwind CSS

## Core Engineering: Concurrency & Race Conditions

The primary technical challenge of this application is preventing overselling during highly concurrent traffic spikes.

This is solved using Database Transactions with a `Serializable` Isolation Level.

When a `POST` request hits the `/api/reservations` endpoint:

1. Prisma initiates a `$transaction` and locks the specific inventory row.
2. It calculates `availableStock` (totalStock - reservedStock).
3. If stock is available, it atomically increments `reservedStock` and creates a `PENDING` reservation ticket valid for 15 minutes.
4. If a concurrent request attempts to read this row before the first transaction commits, the `Serializable` lock forces the database to queue the requests sequentially, mathematically guaranteeing no double-booking occurs.

## 🛠️ Local Development Setup

Follow these instructions to run the project locally and interact with the database.

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root of the project and add your Neon Database connection string:

```
DATABASE_URL="postgresql://user:password@ep-your-db-host.neon.tech/neondb?sslmode=require"
```

### 3. Initialize the Database

Generate the Prisma client (outputted to `src/generated/client` to ensure Turbopack compatibility) and push the schema to your database:

```bash
npx prisma generate
npx prisma db push
```

### 4. Seed the Database

To make testing seamless, a database seeding endpoint has been provided.

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to the seed route:

```
http://localhost:3000/api/seed
```

You should receive a JSON response confirming: `{"message": "Database seeded successfully!"}`

### 5. Run the Application

Navigate to the root URL to access the testing dashboard:

```
http://localhost:3000
```

## Testing the Application

A frontend UI has been provided to visually test the backend logic without requiring Postman or cURL.

- **Test Concurrency:** On the dashboard, locate the "Wireless Gaming Headset" (which is seeded with exactly 2 units of stock). Click the "Reserve 1" button rapidly 3 times. The first two requests will succeed, and the third will be safely rejected by the backend transaction lock.
- **Test Cart Abandonment:** Reservations are held in a `PENDING` state for 15 minutes.
- **Test Cleanup:** Click the "Run Expired Cleanup" button on the dashboard. This triggers the `/api/reservations/cleanup` route, which scans for expired pending reservations, releases the lock, and restores the available inventory dynamically.

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Fetches all products and their nested warehouse inventory levels. |
| POST | `/api/reservations` | Safely reserves stock. Requires `productId`, `warehouseId`, and `quantity`. |
| POST | `/api/reservations/cleanup` | Scans for and releases expired `PENDING` reservations. |
| GET | `/api/seed` | Wipes the database and populates it with fresh test data. |