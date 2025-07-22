# SparkBoard

The first developer-friendly whiteboard built for daily projects. SparkBoard combines visual brainstorming with powerful project management, letting you seamlessly convert ideas into actionable tasks with real-time collaboration.

![SparkBoard](web/public/logo.png)

## ✨ Features

- **Infinite Canvas**: Pan and zoom on an unlimited whiteboard space
- **Real-time Collaboration**: Multiple users with live cursors and instant updates
- **Element Creation**: Sticky notes, shapes, text, connectors, and freehand drawing
- **Task Management**: Convert whiteboard elements directly into Kanban tasks
- **Project Organization**: Multiple projects with dedicated whiteboards and task boards
- **Live Sharing**: Share boards with team members and external collaborators

## 🚀 Quick Start

### Try the Live Demo

Visit [SparkBoard Cloud](https://board.hellospark.tech) to try the application without any setup.

### Local Development Setup

#### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Docker** (for local Supabase)
- **Supabase CLI** (`npm install -g supabase`)

#### Step-by-step Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/imadaitelarabi/sparkboard.git
   cd sparkboard
   ```

2. **Start Supabase locally**
   ```bash
   cd supabase
   make db-local
   ```
   This will start Supabase at `http://127.0.0.1:54321` with Studio at `http://127.0.0.1:54323`.

3. **Apply database migrations**
   ```bash
   make migrate-local
   ```

4. **Generate TypeScript types**
   ```bash
   make gen-types
   ```

5. **Install frontend dependencies**
   ```bash
   cd ../web
   npm install
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Visit `http://localhost:3000` to see SparkBoard running locally.

#### Environment Variables

Create a `.env.local` file in the `/web` directory with the following variables:

```bash
# Essential for local development
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional but recommended for full functionality
RESEND_API_KEY=your-resend-api-key-here
RESEND_FROM_EMAIL="SparkBoard <noreply@yourdomain.com>"
NEXT_PUBLIC_ENABLE_OAUTH=false
```

**For Production:**
- Get your Supabase URL and keys from [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API
- Sign up for [Resend](https://resend.com) for email functionality
- Configure OAuth providers if needed (Google, GitHub)

#### Available Commands

**Frontend** (from `/web` directory):
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Lint code

**Database** (from `/supabase` directory):
- `make db-local` - Start local Supabase
- `make migrate-local` - Apply migrations locally
- `make new-migration NAME=migration_name` - Create new migration
- `make gen-types` - Generate TypeScript types
- `make db-status` - Check migration status

## 🏗️ Architecture

- **Frontend**: Next.js 15 with React 19, TypeScript, and Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **Canvas**: Konva.js for high-performance 2D canvas rendering
- **State Management**: Zustand for client state
- **Deployment**: Vercel for frontend, Supabase Cloud for backend

## 🗺️ Roadmap

### MVP (Current)
- [x] Create task from an element
- [x] View task just take you to your element in the whiteboard  
- [x] Projects
- [] Cmd + k Universal search
- [] Emojies element
- [] Focus mode
- [] Lock Elements
- [] Edit single elements inside a group of elements

### Post MVP (Next)
- [ ] Documents/Doc reference as an element in a whiteboard
- [ ] Actions (v1.0) supports claude code action

### Future
- [ ] Would love to hear your ideas

Want to contribute to any of these features? Check out our [Contributing Guide](CONTRIBUTING.md)!

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code of conduct
- Development workflow
- Pull request process
- Issue reporting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Canvas**: Konva.js for whiteboard rendering
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **State Management**: Zustand
- **Deployment**: Vercel + Supabase Cloud
