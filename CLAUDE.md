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

## Design Guidelines & UI Patterns

SparkBoard follows a **"Whimsical Modern"** design philosophy that balances professional functionality with playful, delightful interactions.

### Design Theme
- **Visual Style**: Soft gradient-heavy aesthetics with gentle curves and smooth transitions
- **Color Palette**: Purple-indigo primary (`#8b5cf6` to `#6366f1`) with blue/emerald accents
- **Typography**: Geist Sans (scaled 20% smaller for compact feel)
- **Theme Support**: Light, dark, and system themes with comprehensive CSS variables

### Component Patterns
- **Core Components**: Dashboard, Modal, ProjectLayout, WhiteboardView, KanbanView, ThemeToggle
- **Styling Approach**: CSS-first with Tailwind CSS v4 integration using `@theme inline`
- **Animations**: 300ms transitions with bounce timing function for playful interactions
- **Layout**: Grid-based responsive design with consistent spacing system

### Usage Guidelines

#### When Creating New Components
1. **Follow existing patterns**: Use `whimsical-card`, `floating-panel`, `gradient-button` utility classes
2. **Maintain color consistency**: Use CSS variables for theming (`--color-primary`, `--color-foreground`)
3. **Apply standard animations**: Use 300ms transitions with bounce effects for interactions
4. **Ensure theme compatibility**: Test components in both light and dark modes

#### Styling Conventions
- **Gradients first**: Use gradient backgrounds with solid fallbacks
- **Rounded corners**: 8px base radius with scaled variations (sm: 3px, 3xl: 19px)
- **Shadow system**: Apply `--shadow-whimsical` and `--shadow-floating` for depth
- **Interactive states**: Include hover, focus, and active states with transform/shadow changes

#### Accessibility Requirements
- **Focus management**: Proper focus rings using primary color
- **Keyboard navigation**: Support escape key handling and tab navigation
- **Semantic HTML**: Use appropriate ARIA labels and semantic elements
- **Color contrast**: Ensure sufficient contrast in both light and dark themes

#### File Organization
- **Components**: Place reusable UI components in `web/src/components/`
- **Pages**: Use App Router structure in `web/src/app/`
- **Styles**: Leverage CSS variables defined in global styles
- **Types**: Generate and update TypeScript types after database changes