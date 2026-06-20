# Contributing to FrontWing

Thank you for your interest in contributing to FrontWing! This guide outlines our development workflow, coding standards, and repository practices.

---

## 1. Getting Started

### Prerequisites
- **Node.js**: v18 or later
- **Python**: v3.11 or later
- **PostgreSQL**: v15 or later
- **Redis**: v7 or later

### Local Development Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/FrontWing.git
   cd FrontWing
   ```
2. **Setup AI Microservice**:
   ```bash
   cd ai_services
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. **Setup Database**:
   Create a PostgreSQL database named `frontwing` and run the migrations in `/database/migrations/` in sequence.
4. **Setup Backend API Gateway**:
   ```bash
   cd ../backend
   npm install
   ```
5. **Setup React Frontend**:
   ```bash
   cd ../frontend
   npm install
   ```

---

## 2. Coding Standards

### Python (AI Service)
- Follow **PEP 8** style guidelines.
- Use explicit type hints for function signatures.
- Write docstrings for all public modules, functions, and classes.
- Run tests before submitting changes:
  ```bash
  python tests/test_scoring.py
  ```

### TypeScript / JavaScript (Frontend & Backend)
- Maintain strict typing in TypeScript; avoid using `any`.
- Keep components small, focused, and reusable.
- Follow the React component file structures inside `frontend/src/components/`.

---

## 3. Git Workflow & Branching

We use a standard feature-branching workflow:
1. **Branch Naming**:
   - Features: `feature/short-description` (e.g., `feature/what-if-sim`)
   - Bugfixes: `bugfix/issue-description` (e.g., `bugfix/pace-score-rounding`)
   - Chores/Docs: `chore/docs-update`
2. **Pull Requests**:
   - Ensure all tests pass locally before opening a PR.
   - Link any associated issues in the PR description.
   - Request review from at least one core maintainer.
   - Do NOT push directly to `main` or `production` branches.
