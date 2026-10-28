# CareerPilot AI — Intelligent Career & Application Copilot

CareerPilot AI is an enterprise-grade career navigation platform that empowers tech professionals to optimize resumes for ATS compatibility, track application lifecycles across recruitment pipelines, and simulate role-tailored technical and behavioral interviews.

---

## 🏛️ Architecture Overview

The repository is organized into a modular full-stack monorepo:

- **Frontend (Root)**: React 19, TypeScript, Vite, Tailwind CSS with shadcn/ui design tokens, and React Router v6.
- **Backend (`/server`)**: Java 21/26, Spring Boot 3.4.3, Spring Web, Spring Data JPA, PostgreSQL, Flyway Migrations, Bean Validation, Spring Boot Actuator, and Springdoc OpenAPI (Swagger UI).
- **Database Infrastructure (`docker-compose.yml`)**: PostgreSQL 16 containerized with persistent health checks.

```
careerpilot-ai/
├── src/                          # React + Vite + TypeScript Frontend
│   ├── components/               # Reusable UI & Layout Components (shadcn tokens)
│   ├── context/                  # AuthContext with demo & session management
│   ├── lib/                      # Centralized typed ApiClient & utilities
│   ├── pages/                    # Landing, Login, Register, Dashboard, Pipeline, ATS Sandbox
│   ├── sample-data/              # Isolated UI prototype mock datasets
│   ├── services/                 # Shared typed service layer (auth, applications, resume)
│   └── types/                    # Domain TypeScript interfaces
├── server/                       # Spring Boot 3 Backend
│   ├── src/main/java/com/careerpilot/
│   │   ├── config/               # CORS & OpenAPI Swagger Configuration
│   │   ├── controller/           # REST Controllers (GET /api/v1/health)
│   │   ├── dto/                  # Type-safe Java records (HealthResponse, ApiErrorResponse)
│   │   ├── entity/               # JPA Entities (User, UserRole) with DB constraints
│   │   ├── exception/            # GlobalExceptionHandler & custom exceptions
│   │   ├── repository/           # Spring Data JPA Repositories (UserRepository)
│   │   ├── security/             # Security foundation & token constants
│   │   └── service/              # UserService & business operations
│   ├── src/main/resources/
│   │   ├── application.yml       # Production/Development configuration
│   │   └── db/migration/         # Flyway versioned migrations (V1__init_schema.sql)
│   ├── src/test/                 # Unit & Integration tests (H2 in-memory test profile)
│   ├── .env.example              # Backend environment template
│   ├── pom.xml                   # Maven dependencies and build configuration
│   └── mvnw / mvnw.cmd           # Maven Wrapper
├── docker-compose.yml            # Local PostgreSQL 16 container service
└── package.json                  # Frontend scripts & dependencies
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js**: v20+ (tested on Node v24.19.0) & npm
- **Java**: JDK 21+ (tested on Temurin OpenJDK 26)
- **Docker**: (Optional, for local PostgreSQL container)

---

### Step 1: Start PostgreSQL Database

You can run PostgreSQL locally using the provided `docker-compose.yml`:

```powershell
# In project root:
docker compose up -d
```

Or connect to an existing PostgreSQL instance (e.g., Supabase, Neon, AWS RDS, or local installation).

---

### Step 2: Configure & Run the Spring Boot Backend

1. Navigate to the `server/` directory:
   ```powershell
   cd server
   ```

2. Configure environment variables (or copy `.env.example` to `.env`):
   ```powershell
   # Default local development values:
   $env:DB_HOST="localhost"
   $env:DB_PORT="5432"
   $env:DB_NAME="careerpilot_db"
   $env:DB_USERNAME="postgres"
   $env:DB_PASSWORD="postgres"
   $env:CORS_ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
   ```

3. Run the automated test suite (uses embedded in-memory H2 database; does not require external DB):
   ```powershell
   .\mvnw.cmd test
   # On macOS / Linux:
   ./mvnw test
   ```

4. Launch the Spring Boot application:
   ```powershell
   .\mvnw.cmd spring-boot:run
   # On macOS / Linux:
   ./mvnw spring-boot:run
   ```

   The backend will start at `http://localhost:8080`.

#### Backend Endpoints & Documentation
- **Health Check**: `GET http://localhost:8080/api/v1/health`
- **Swagger UI**: `http://localhost:8080/swagger-ui.html`
- **OpenAPI Schema**: `http://localhost:8080/api-docs`
- **Actuator Health**: `http://localhost:8080/actuator/health`

---

### Step 3: Run the React Frontend

1. From the project root, install frontend dependencies:
   ```powershell
   npm install
   ```

2. Run the Vite development server:
   ```powershell
   npm run dev
   ```

3. Open your browser at `http://localhost:5173`.
   - **Public Pages**: Landing page (`/`), Sign In (`/login`), Sign Up (`/register`).
   - **Authenticated Mission Control**: `/dashboard`, `/dashboard/applications`, `/dashboard/resume`.
   - **Prototype 1-Click Demo**: Click "1-Click Demo" on the login page or hero section to instantly preview the authenticated dashboard with isolated mock data.

4. Build frontend for production:
   ```powershell
   npm run build
   ```

---

## 🔒 Security & Database Constraints
- **User Privacy**: User records and password hashes are never exposed through public endpoints.
- **Data Integrity**: Unique case-insensitive index on email, audit timestamps (`created_at`, `updated_at`), non-null role constraints.
- **CORS Protection**: Origin-restricted to configured frontend hosts.
- **Standardized Error Handling**: Unified RFC-compliant `ApiErrorResponse` payload with field-level validation errors.
