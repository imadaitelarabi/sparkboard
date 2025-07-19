# SparkChats 2.0 - Database Management Makefile
# Provides commands to manage Supabase database migrations

.PHONY: help migrate migrate-local rollback clean new-migration db-status db-reset db-local gen-types switch-to-local switch-to-prod env-status env-switch migrate-prod

# Default target
help:
	@echo "SparkChats 2.0 - Database Management Commands"
	@echo ""
	@echo "Available commands:"
	@echo "  migrate          - Interactive migration (prompts for environment choice)"
	@echo "  migrate-local    - Apply migrations to local environment only"
	@echo "  migrate-prod     - Apply migrations to production (use: make migrate-prod PROJECT_REF=your_ref)"
	@echo "  rollback         - Rollback the last applied migration"
	@echo "  clean            - Clean all data from the database (DESTRUCTIVE)"
	@echo "  new-migration    - Create a new migration file (use: make new-migration NAME=your_name)"
	@echo "  db-status        - Show current migration status"
	@echo "  db-reset         - Reset database to clean state and apply all migrations"
	@echo "  db-local         - Start local Supabase instance"
	@echo "  gen-types        - Generate TypeScript types from database schema"
	@echo ""
	@echo "Environment Switching:"
	@echo "  switch-to-local  - Switch to local development environment"
	@echo "  switch-to-prod   - Switch to production environment (use: make switch-to-prod PROJECT_REF=your_ref)"
	@echo "  env-status       - Show current environment status"
	@echo "  env-switch       - Interactive environment switcher (prompts for choice)"
	@echo ""
	@echo "Examples:"
	@echo "  make migrate"
	@echo "  make new-migration NAME=add_user_preferences"
	@echo "  make switch-to-local"
	@echo "  make switch-to-prod PROJECT_REF=abcdefghijklmnop"
	@echo "  make env-switch"
	@echo ""
	@echo "⚠️  WARNINGS:"
	@echo "  - Always backup production database before running migrations"
	@echo "  - rollback and clean commands can cause data loss"
	@echo "  - Test migrations in development first"
	@echo "  - Update your .env file when switching environments"

# Interactive migration - prompts for environment choice
migrate:
	@echo "🚀 Database Migration"
	@echo "===================="
	@echo ""
	@if ! command -v supabase >/dev/null 2>&1; then \
		echo "❌ Supabase CLI not found. Install it with: npm install -g supabase"; \
		exit 1; \
	fi
	@echo "Choose migration target:"
	@echo "  1) Local Development"
	@echo "  2) Production"
	@echo ""
	@read -p "Enter choice (1 or 2): " choice; \
	if [ "$$choice" = "1" ]; then \
		make migrate-local; \
	elif [ "$$choice" = "2" ]; then \
		read -p "Enter your production PROJECT_REF: " ref; \
		make migrate-prod PROJECT_REF=$$ref; \
	else \
		echo "❌ Invalid choice. Use 1 or 2."; \
	fi

# Apply migrations to local environment only
migrate-local:
	@echo "🚀 Applying migrations to LOCAL environment..."
	@if ! command -v supabase >/dev/null 2>&1; then \
		echo "❌ Supabase CLI not found. Install it with: npm install -g supabase"; \
		exit 1; \
	fi
	@echo "📋 Current migration status:"
	@supabase migration list
	@echo ""
	@echo "🔄 Applying migrations to local database..."
	@supabase migration up
	@echo "✅ Local migrations applied successfully!"

# Rollback the last migration
rollback:
	@echo "⚠️  Rolling back last migration..."
	@echo "⚠️  WARNING: This operation can cause data loss!"
	@read -p "Are you sure you want to rollback? (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo "🔄 Rolling back..."; \
		supabase migration repair --status reverted; \
		echo "✅ Rollback completed"; \
	else \
		echo "❌ Rollback cancelled"; \
	fi

# Clean all data from database
clean:
	@echo "🧹 Cleaning database..."
	@echo "⚠️  WARNING: This will delete ALL data in your database!"
	@echo "⚠️  This operation is IRREVERSIBLE!"
	@read -p "Type 'DELETE_ALL_DATA' to confirm: " confirm; \
	if [ "$$confirm" = "DELETE_ALL_DATA" ]; then \
		echo "🔄 Resetting database..."; \
		supabase db reset; \
		echo "✅ Database cleaned and reset"; \
	else \
		echo "❌ Clean operation cancelled"; \
	fi

# Create a new migration file
new-migration:
	@if [ -z "$(NAME)" ]; then \
		echo "❌ Please provide a migration name:"; \
		echo "   make new-migration NAME=your_migration_name"; \
		exit 1; \
	fi
	@echo "📝 Creating new migration: $(NAME)"
	@supabase migration new $(NAME)
	@echo "✅ Migration file created in migrations/"
	@echo "📝 Don't forget to edit the migration file before applying it!"

# Show current migration status
db-status:
	@echo "📊 Database Migration Status"
	@echo "=============================="
	@if ! command -v supabase >/dev/null 2>&1; then \
		echo "❌ Supabase CLI not found. Install it with: npm install -g supabase"; \
		exit 1; \
	fi
	@echo "📋 Migration list:"
	@supabase migration list
	@echo ""
	@echo "🔗 Project status:"
	@supabase status

# Reset database and apply all migrations
db-reset:
	@echo "🔄 Resetting database to clean state..."
	@echo "⚠️  WARNING: This will delete all data and reapply migrations!"
	@read -p "Are you sure? (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo "🔄 Resetting..."; \
		supabase db reset; \
		echo "✅ Database reset and migrations applied"; \
	else \
		echo "❌ Reset cancelled"; \
	fi

# Start local Supabase instance
db-local:
	@echo "🚀 Starting local Supabase instance..."
	@if ! command -v supabase >/dev/null 2>&1; then \
		echo "❌ Supabase CLI not found. Install it with: npm install -g supabase"; \
		exit 1; \
	fi
	@echo "🔄 Starting services..."
	@supabase start
	@echo "✅ Local Supabase is running!"
	@echo "📊 Dashboard: http://localhost:54323"
	@echo "🔗 API URL: http://localhost:54321"

# Stop local Supabase instance
db-local-stop:
	@echo "🛑 Stopping local Supabase instance..."
	@supabase stop
	@echo "✅ Local Supabase stopped"

# Generate TypeScript types
gen-types:
	@echo "📝 Generating TypeScript types from database schema..."
	@if ! command -v supabase >/dev/null 2>&1; then \
		echo "❌ Supabase CLI not found. Install it with: npm install -g supabase"; \
		exit 1; \
	fi
	@mkdir -p ../web/src/types
	@supabase gen types typescript --local > ../web/src/types/database.types.ts
	@echo "✅ Types generated at ../web/src/types/database.types.ts"

# Link to Supabase project (for initial setup)
link:
	@echo "🔗 Linking to Supabase project..."
	@if [ -z "$(PROJECT_REF)" ]; then \
		echo "❌ Please provide your project reference:"; \
		echo "   make link PROJECT_REF=your_project_ref"; \
		exit 1; \
	fi
	@supabase link --project-ref $(PROJECT_REF)
	@echo "✅ Project linked successfully!"

# Initialize Supabase in current directory
init:
	@echo "🔧 Initializing Supabase project..."
	@supabase init
	@echo "✅ Supabase project initialized!"
	@echo "📝 Next steps:"
	@echo "   1. Link to your project: make link PROJECT_REF=your_ref"
	@echo "   2. Apply migrations: make migrate"

# Development workflow commands
dev-setup:
	@echo "🛠️  Setting up development environment..."
	@echo "1️⃣ Starting local Supabase..."
	@make db-local
	@echo ""
	@echo "2️⃣ Applying migrations..."
	@make migrate
	@echo ""
	@echo "3️⃣ Generating types..."
	@make gen-types
	@echo ""
	@echo "✅ Development environment ready!"

# Check if required tools are installed
check-tools:
	@echo "🔍 Checking required tools..."
	@if command -v supabase >/dev/null 2>&1; then \
		echo "✅ Supabase CLI: $(shell supabase --version)"; \
	else \
		echo "❌ Supabase CLI not found"; \
		echo "   Install with: npm install -g supabase"; \
	fi
	@if command -v node >/dev/null 2>&1; then \
		echo "✅ Node.js: $(shell node --version)"; \
	else \
		echo "❌ Node.js not found"; \
	fi
	@if command -v npm >/dev/null 2>&1; then \
		echo "✅ npm: $(shell npm --version)"; \
	else \
		echo "❌ npm not found"; \
	fi

# Backup database (requires pg_dump)
backup:
	@echo "💾 Creating database backup..."
	@if [ -z "$(BACKUP_NAME)" ]; then \
		BACKUP_NAME="backup_$(shell date +%Y%m%d_%H%M%S)"; \
	else \
		BACKUP_NAME="$(BACKUP_NAME)"; \
	fi; \
	echo "📁 Backup name: $$BACKUP_NAME.sql"; \
	echo "⚠️  Note: You need to configure your database connection for pg_dump"; \
	echo "🔄 Use 'supabase db dump' for Supabase-specific backup"

# Show migration files
show-migrations:
	@echo "📋 Available migration files:"
	@echo "============================="
	@ls -la migrations/ || echo "❌ No migrations found"

# Validate migrations syntax
validate:
	@echo "✅ Validating migration syntax..."
	@for file in migrations/*.sql; do \
		if [ -f "$$file" ]; then \
			echo "🔍 Checking $$file..."; \
			supabase migration repair --status applied; \
		fi; \
	done
	@echo "✅ Validation complete"

# Apply migrations to production without switching environment
migrate-prod:
	@echo "🚀 Applying migrations to PRODUCTION..."
	@if [ -z "$(PROJECT_REF)" ]; then \
		echo "❌ Please provide your production project reference:"; \
		echo "   make migrate-prod PROJECT_REF=your_project_ref"; \
		echo ""; \
		echo "💡 Find your PROJECT_REF in Supabase Dashboard:"; \
		echo "   https://supabase.com/dashboard/project/YOUR_PROJECT_REF"; \
		exit 1; \
	fi
	@echo ""
	@echo "⚠️  WARNING: You are about to apply migrations to PRODUCTION!"
	@echo "⚠️  This operation can affect live data."
	@echo ""
	@echo "Current environment status:"
	@supabase status || true
	@echo ""
	@read -p "Are you sure you want to apply migrations to production? (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo ""; \
		echo "🔄 Creating temporary link to production..."; \
		TEMP_STATUS=$$(supabase status --temp-jwt-secret=true 2>&1 || true); \
		supabase link --project-ref $(PROJECT_REF) --password-stdin <<< "$$TEMP_STATUS" > /dev/null 2>&1; \
		echo "📋 Current migration status on production:"; \
		supabase migration list; \
		echo ""; \
		echo "🔄 Applying migrations..."; \
		supabase db push; \
		echo ""; \
		echo "✅ Migrations applied to production successfully!"; \
		echo ""; \
		echo "🔄 Restoring previous environment link..."; \
		if echo "$$TEMP_STATUS" | grep -q "127.0.0.1\|localhost"; then \
			supabase link --project-ref local --password-stdin <<< "$$TEMP_STATUS" > /dev/null 2>&1; \
			echo "✅ Restored local environment link"; \
		fi; \
	else \
		echo "❌ Migration cancelled"; \
	fi

# ==========================================
# Environment Switching Commands
# ==========================================

# Switch to local development environment
switch-to-local:
	@echo "🔄 Switching to LOCAL development environment..."
	@echo ""
	@echo "1️⃣ Stopping any existing local Supabase instance..."
	@supabase stop 2>/dev/null || true
	@echo ""
	@echo "2️⃣ Starting local Supabase instance..."
	@supabase start
	@echo ""
	@echo "3️⃣ Getting local credentials..."
	@echo "📋 Local Supabase Status:"
	@supabase status
	@echo ""
	@echo "4️⃣ Generating local TypeScript types..."
	@mkdir -p ../web/src/types
	@supabase gen types typescript --local > ../web/src/types/database.types.ts
	@echo "✅ Types generated at ../web/src/types/database.types.ts"
	@echo ""
	@echo "🔧 NEXT STEP - Update your .env file:"
	@echo "====================================="; \
	echo "Update ../web/.env with these values:"; \
	echo ""; \
	echo "PUBLIC_SUPABASE_ENABLED=true"; \
	echo "PUBLIC_SUPABASE_URL=http://127.0.0.1:54321"; \
	LOCAL_ANON_KEY=$$(supabase status | grep "anon key" | awk '{print $$3}' | tr -d '\n'); \
	echo "PUBLIC_SUPABASE_ANON_KEY=$$LOCAL_ANON_KEY"; \
	echo ""; \
	echo "📝 Studio URL: http://127.0.0.1:54323"; \
	echo "📝 API URL: http://127.0.0.1:54321"; \
	echo ""
	@read -p "Press ENTER after updating your .env file..." dummy
	@echo "✅ Successfully switched to LOCAL environment!"

# Switch to production environment
switch-to-prod:
	@echo "🔄 Switching to PRODUCTION environment..."
	@echo ""
	@if [ -z "$(PROJECT_REF)" ]; then \
		echo "❌ Please provide your production project reference:"; \
		echo "   make switch-to-prod PROJECT_REF=your_project_ref"; \
		echo ""; \
		echo "💡 Find your PROJECT_REF in Supabase Dashboard:"; \
		echo "   https://supabase.com/dashboard/project/YOUR_PROJECT_REF"; \
		exit 1; \
	fi
	@echo "1️⃣ Stopping local Supabase instance..."
	@supabase stop 2>/dev/null || true
	@echo ""
	@echo "2️⃣ Linking to production project: $(PROJECT_REF)..."
	@supabase link --project-ref $(PROJECT_REF)
	@echo ""
	@echo "3️⃣ Checking production project status..."
	@supabase migration list || echo "⚠️  Migration list may be empty if this is a new project"
	@echo ""
	@echo "4️⃣ Generating production TypeScript types..."
	@mkdir -p ../web/src/types
	@supabase gen types typescript > ../web/src/types/database.types.ts
	@echo "✅ Types generated at ../web/src/types/database.types.ts"
	@echo ""
	@echo "🔧 NEXT STEP - Update your .env file:"
	@echo "====================================="; \
	echo "Update ../web/.env with these values:"; \
	echo ""; \
	echo "PUBLIC_SUPABASE_ENABLED=true"; \
	echo "PUBLIC_SUPABASE_URL=https://$(PROJECT_REF).supabase.co"; \
	echo "PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key"; \
	echo ""; \
	echo "💡 Get your production anon key from:"; \
	echo "   https://supabase.com/dashboard/project/$(PROJECT_REF)/settings/api"; \
	echo ""
	@read -p "Press ENTER after updating your .env file..." dummy
	@echo "✅ Successfully switched to PRODUCTION environment!"
	@echo ""
	@echo "⚠️  REMINDER: Test migrations locally before applying to production!"

# Show current environment status
env-status:
	@echo "📊 Current Environment Status"
	@echo "=============================="
	@echo ""
	@echo "🔍 Checking Supabase CLI status..."
	@if supabase status >/dev/null 2>&1; then \
		echo "📋 Supabase Status:"; \
		supabase status; \
		echo ""; \
		if supabase status | grep -q "127.0.0.1\|localhost"; then \
			echo "🏠 Current Environment: LOCAL DEVELOPMENT"; \
			echo "📊 Dashboard: http://127.0.0.1:54323"; \
			echo "🔗 API URL: http://127.0.0.1:54321"; \
		else \
			echo "🌐 Current Environment: PRODUCTION"; \
			PROJECT_REF=$$(supabase status 2>/dev/null | grep "Project ref" | awk '{print $$3}' || echo "unknown"); \
			echo "🔗 Project: $$PROJECT_REF"; \
			echo "📊 Dashboard: https://supabase.com/dashboard/project/$$PROJECT_REF"; \
		fi; \
	else \
		echo "❌ No active Supabase environment detected"; \
		echo ""; \
		echo "To set up an environment:"; \
		echo "  🏠 Local:      make switch-to-local"; \
		echo "  🌐 Production: make switch-to-prod PROJECT_REF=your_ref"; \
	fi
	@echo ""
	@echo "📁 Environment file status:"
	@if [ -f "../web/.env" ]; then \
		echo "✅ .env file exists at ../web/.env"; \
		if grep -q "127.0.0.1\|localhost" ../web/.env 2>/dev/null; then \
			echo "🏠 .env configured for: LOCAL"; \
		elif grep -q "supabase.co" ../web/.env 2>/dev/null; then \
			echo "🌐 .env configured for: PRODUCTION"; \
		else \
			echo "⚠️  .env configuration unclear"; \
		fi; \
	else \
		echo "❌ No .env file found at ../web/.env"; \
		echo "   Create one using: make switch-to-local OR make switch-to-prod"; \
	fi
	@echo ""
	@echo "📋 Migration Status:"
	@supabase migration list 2>/dev/null || echo "❌ No migration status available"

# Quick environment switch helper
env-switch:
	@echo "🔄 Environment Quick Switch"
	@echo "=========================="
	@echo ""
	@echo "Choose your target environment:"
	@echo "  1) Local Development"
	@echo "  2) Production"
	@echo ""
	@read -p "Enter choice (1 or 2): " choice; \
	if [ "$$choice" = "1" ]; then \
		make switch-to-local; \
	elif [ "$$choice" = "2" ]; then \
		read -p "Enter your production PROJECT_REF: " ref; \
		make switch-to-prod PROJECT_REF=$$ref; \
	else \
		echo "❌ Invalid choice. Use 1 or 2."; \
	fi