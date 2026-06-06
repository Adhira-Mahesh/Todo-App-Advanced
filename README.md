# Todo List App

A Next.js todo list application with Prisma and PostgreSQL, built with the Next.js App Router.

## Features

- Add, edit, and delete todos
- Authentication flow
- Server actions with Prisma
- PostgreSQL database
- Reusable React components
- CSS Modules styling

## Tech Stack

- Next.js
- React
- TypeScript
- Prisma
- PostgreSQL
- CSS Modules

## Getting Started

1. Install dependencies

   npm install

2. Create a `.env` file

   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

3. Run Prisma migrations

   npx prisma migrate dev

4. Start the development server

   npm run dev

5. Open the app

   http://localhost:3000

## Project Structure

- `src/app/` – Next.js app router pages and layout
- `src/components/` – UI components and form controls
- `src/actions/` – server actions and business logic
- `src/utils/prisma.ts` – Prisma client helper
- `prisma/` – schema and migrations

## Useful Scripts

- `npm run dev` – start development server
- `npm run build` – production build
- `npm run start` – start built app
- `npm run lint` – run lint checks
