# resonate

## local setup Instructions

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd resonate
   ```

2. **Copy environment file and add credentials**

   ```bash
   cp .env.example .env
   # Edit .env and add your environment credentials
   ```

3. **Install dependencies**

   ```bash
   pnpm install
   ```

4. **Generate Prisma client**

   ```bash
   cd packages/db
   npx prisma generate
   cd ../../
   ```

5. **Build the project**

   ```bash
   pnpm run build
   ```

6. **Start development server**

   ```bash
   pnpm run dev
   ```
