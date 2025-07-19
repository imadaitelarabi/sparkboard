# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SparkBoard is a collaborative whiteboard tool for project management with real-time collaboration features. The application consists of:

- **Frontend**: Next.js application with React 19, TypeScript, and Tailwind CSS
- **Backend**: Supabase for authentication, database, and real-time features
- **Architecture**: Monorepo with `web/` (frontend) and `supabase/` (database) directories

## Development Commands

### Frontend (from `/web` directory)
- **Start development server**: `npm run dev` (uses Turbopack for faster builds)
- **Build production**: `npm run build`
- **Start production server**: `npm start`
- **Lint code**: `npm run lint`

### Database/Supabase (from `/supabase` directory)
- **Start local development**: `make db-local`
- **Apply migrations**: `make migrate` (interactive) or `make migrate-local` (local only)
- **Create new migration**: `make new-migration NAME=migration_name`
- **Check migration status**: `make db-status`
- **Generate TypeScript types**: `make gen-types`
- **Environment switching**: `make env-switch` (interactive) or `make switch-to-local`
- **Development setup**: `make dev-setup` (sets up complete local environment)

## Project Structure

```
sparkboard/
├── web/                    # Next.js frontend application
│   ├── src/app/           # App router pages and layouts
│   ├── package.json       # Frontend dependencies
│   └── tsconfig.json      # TypeScript configuration
└── supabase/              # Supabase backend configuration
    ├── config.toml        # Supabase local development config
    └── Makefile           # Database management commands
```

## Core Features Implementation

The project implements a collaborative whiteboard with these key features:
- **Whiteboard**: Infinite canvas with basic drawing elements (shapes, text, connectors)
- **Project Management**: Multiple projects, each containing whiteboards and task boards
- **Task Creation**: Convert whiteboard elements into tasks linked to Kanban boards
- **Real-time Collaboration**: Multi-user cursors and live editing
- **Dashboard**: Global view with task filtering and navigation

## Development Workflow

1. Start local Supabase: `cd supabase && make db-local`
2. Apply migrations: `make migrate-local`
3. Generate types: `make gen-types`
4. Start frontend: `cd ../web && npm run dev`

## Tech Stack

- **Frontend**: Next.js 15.4.2, React 19, TypeScript 5, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Development**: ESLint, Turbopack for dev server
- **Deployment**: Configured for Vercel

## Environment Configuration

Local development uses Supabase at `http://127.0.0.1:54321` with Studio at `http://127.0.0.1:54323`. The Makefile handles environment switching and credential management.