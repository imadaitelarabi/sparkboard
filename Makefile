# SparkBoard - Main Project Makefile
# Provides commands to manage all project services

.PHONY: help start-all stop-all restart-all status dev-setup cleanup check-tools

# Default target
help:
	@echo "SparkBoard - Main Project Management Commands"
	@echo ""
	@echo "🚀 Service Management:"
	@echo "  start-all        - Start all project services (Supabase + Frontend)"
	@echo "  stop-all         - Stop all project services"
	@echo "  restart-all      - Restart all project services"
	@echo "  status           - Show status of all services"
	@echo ""
	@echo "🛠️  Development Setup:"
	@echo "  dev-setup        - Complete development environment setup"
	@echo "  check-tools      - Verify all required tools are installed"
	@echo ""
	@echo "🧹 Cleanup:"
	@echo "  cleanup          - Stop services and clean up processes"
	@echo ""
	@echo "📊 Examples:"
	@echo "  make start-all   # Start database and frontend"
	@echo "  make stop-all    # Stop all services"
	@echo "  make status      # Check what's running"
	@echo ""
	@echo "💡 Individual Service Commands:"
	@echo "  Database: cd supabase && make db-local / make db-local-stop"
	@echo "  Frontend: cd web && npm run dev"

# Start all project services
start-all:
	@echo "🚀 Starting SparkBoard Development Environment"
	@echo "=============================================="
	@echo ""
	@echo "1️⃣ Starting Supabase local instance..."
	@cd supabase && make db-local
	@echo ""
	@echo "2️⃣ Starting Next.js frontend..."
	@echo "📝 Frontend will be available at: http://localhost:3000"
	@echo "📝 Supabase Studio: http://localhost:54323"
	@echo "📝 Supabase API: http://localhost:54321"
	@echo ""
	@echo "🔄 Starting frontend in background..."
	@cd web && npm run dev > ../dev.log 2>&1 &
	@echo "✅ Frontend started in background (logs: dev.log)"
	@echo ""
	@echo "🎉 All services are now running!"
	@echo "📊 Use 'make status' to check service status"
	@echo "🛑 Use 'make stop-all' to stop all services"

# Stop all project services
stop-all:
	@echo "🛑 Stopping SparkBoard Development Environment"
	@echo "============================================="
	@echo ""
	@echo "1️⃣ Stopping Next.js frontend..."
	@-pkill -f "next dev" 2>/dev/null || true
	@-pkill -f "next-server" 2>/dev/null || true
	@echo "✅ Frontend stopped"
	@echo ""
	@echo "2️⃣ Stopping Supabase local instance..."
	@cd supabase && make db-local-stop || true
	@echo ""
	@echo "3️⃣ Cleaning up any remaining processes..."
	@-pkill -f "node.*next" 2>/dev/null || true
	@-pkill -f "node.*webpack" 2>/dev/null || true
	@-pkill -f "turbopack" 2>/dev/null || true
	@echo "✅ Cleanup completed"
	@echo ""
	@echo "🎉 All services have been stopped!"

# Restart all services
restart-all:
	@echo "🔄 Restarting SparkBoard Development Environment"
	@echo "=============================================="
	@make stop-all
	@sleep 2
	@make start-all

# Show status of all services
status:
	@echo "📊 SparkBoard Services Status"
	@echo "============================="
	@echo ""
	@echo "🗄️  Database Services (Supabase):"
	@echo "-----------------------------------"
	@if command -v supabase >/dev/null 2>&1; then \
		cd supabase && supabase status 2>/dev/null || echo "❌ Supabase not running"; \
	else \
		echo "❌ Supabase CLI not found"; \
	fi
	@echo ""
	@echo "🌐 Frontend Services (Next.js):"
	@echo "-------------------------------"
	@if pgrep -f "next dev" >/dev/null 2>&1; then \
		echo "✅ Next.js development server is running"; \
		echo "📝 Frontend URL: http://localhost:3000"; \
	else \
		echo "❌ Next.js development server is not running"; \
	fi
	@echo ""
	@echo "🔍 Process Details:"
	@echo "------------------"
	@echo "Next.js processes:"
	@pgrep -fl "next" 2>/dev/null || echo "  No Next.js processes found"
	@echo ""
	@echo "Supabase processes:"
	@pgrep -fl "supabase\|postgres\|gotrue\|realtime\|storage\|edge-runtime" 2>/dev/null | head -5 || echo "  No Supabase processes found"
	@echo ""
	@echo "📁 Log files:"
	@echo "  Frontend logs: ./dev.log"
	@if [ -f "dev.log" ]; then \
		echo "  📊 Last frontend log (5 lines):"; \
		tail -5 dev.log 2>/dev/null | sed 's/^/    /'; \
	fi

# Complete development environment setup
dev-setup:
	@echo "🛠️  SparkBoard Development Setup"
	@echo "================================"
	@echo ""
	@echo "This will set up your complete development environment."
	@echo "⚠️  This may take a few minutes..."
	@echo ""
	@read -p "Continue? (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo ""; \
		echo "1️⃣ Checking required tools..."; \
		make check-tools; \
		echo ""; \
		echo "2️⃣ Setting up database environment..."; \
		cd supabase && make dev-setup; \
		echo ""; \
		echo "3️⃣ Installing frontend dependencies..."; \
		cd web && npm install; \
		echo ""; \
		echo "4️⃣ Starting all services..."; \
		make start-all; \
		echo ""; \
		echo "🎉 Development environment setup complete!"; \
		echo ""; \
		echo "📝 Next steps:"; \
		echo "  • Open http://localhost:3000 for the application"; \
		echo "  • Open http://localhost:54323 for Supabase Studio"; \
		echo "  • Check service status with: make status"; \
		echo "  • Stop services with: make stop-all"; \
	else \
		echo "❌ Setup cancelled"; \
	fi

# Check if all required tools are installed
check-tools:
	@echo "🔍 Checking Required Development Tools"
	@echo "====================================="
	@echo ""
	@echo "Core Tools:"
	@if command -v node >/dev/null 2>&1; then \
		echo "✅ Node.js: $(shell node --version)"; \
	else \
		echo "❌ Node.js not found - Install from https://nodejs.org/"; \
	fi
	@if command -v npm >/dev/null 2>&1; then \
		echo "✅ npm: $(shell npm --version)"; \
	else \
		echo "❌ npm not found - Usually comes with Node.js"; \
	fi
	@if command -v make >/dev/null 2>&1; then \
		echo "✅ make: $(shell make --version | head -1)"; \
	else \
		echo "❌ make not found - Install build tools for your OS"; \
	fi
	@echo ""
	@echo "Database Tools:"
	@if command -v supabase >/dev/null 2>&1; then \
		echo "✅ Supabase CLI: $(shell supabase --version)"; \
	else \
		echo "❌ Supabase CLI not found - Install with: npm install -g supabase"; \
	fi
	@if command -v docker >/dev/null 2>&1; then \
		echo "✅ Docker: $(shell docker --version)"; \
	else \
		echo "❌ Docker not found - Required for local Supabase"; \
		echo "   Install from https://docker.com/get-started"; \
	fi
	@echo ""
	@echo "Project Files:"
	@if [ -f "web/package.json" ]; then \
		echo "✅ Frontend package.json found"; \
	else \
		echo "❌ Frontend package.json not found"; \
	fi
	@if [ -f "supabase/config.toml" ]; then \
		echo "✅ Supabase config found"; \
	else \
		echo "❌ Supabase config not found"; \
	fi
	@if [ -d "web/node_modules" ]; then \
		echo "✅ Frontend dependencies installed"; \
	else \
		echo "⚠️  Frontend dependencies not installed - Run: cd web && npm install"; \
	fi

# Clean up processes and temporary files
cleanup:
	@echo "🧹 Cleaning Up SparkBoard Environment"
	@echo "===================================="
	@echo ""
	@echo "🛑 Stopping all services..."
	@make stop-all
	@echo ""
	@echo "🗑️  Removing temporary files..."
	@-rm -f dev.log 2>/dev/null || true
	@-rm -f web/.next/cache/webpack/* 2>/dev/null || true
	@echo "✅ Temporary files cleaned"
	@echo ""
	@echo "🔍 Checking for remaining processes..."
	@REMAINING=$$(pgrep -f "next\|supabase\|postgres.*sparkboard" 2>/dev/null | wc -l); \
	if [ $$REMAINING -gt 0 ]; then \
		echo "⚠️  Found $$REMAINING remaining processes"; \
		echo "If needed, manually kill with: pkill -f 'next\|supabase'"; \
	else \
		echo "✅ No remaining processes found"; \
	fi
	@echo ""
	@echo "🎉 Cleanup completed!"

# Quick development shortcuts
dev: start-all
frontend-only:
	@echo "🌐 Starting frontend only..."
	@cd web && npm run dev

db-only:
	@echo "🗄️  Starting database only..."
	@cd supabase && make db-local

# Show service logs
logs:
	@echo "📄 SparkBoard Service Logs"
	@echo "========================="
	@echo ""
	@echo "Frontend logs (last 20 lines):"
	@echo "------------------------------"
	@if [ -f "dev.log" ]; then \
		tail -20 dev.log; \
	else \
		echo "No frontend logs found (dev.log)"; \
	fi
	@echo ""
	@echo "💡 Tips:"
	@echo "  • Follow frontend logs: tail -f dev.log"
	@echo "  • Supabase logs: cd supabase && supabase status"

# Follow logs in real-time
logs-follow:
	@echo "📄 Following SparkBoard logs (Ctrl+C to exit)..."
	@echo "================================================"
	@if [ -f "dev.log" ]; then \
		tail -f dev.log; \
	else \
		echo "No frontend logs found. Start services first with: make start-all"; \
	fi