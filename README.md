# Budget It First

Full-stack web and desktop budgeting app where users set a monthly income and category budgets, plan purchases with estimated costs, and track actual spending. Designed the REST API and EF Core data model, with planned costs kept separate from an expense ledger. Built monthly report snapshots, a budget planner, server-side data ownership checks, and React Query state management.

- **Budget by category**
Set your monthly income, then split it across categories. Suggestions follow the 50/30/20 rule.

- **Plan your shopping**
Add items with an estimated cost, and see how your list fits each category's budget.

- **Warnings before you overspend**
Get a heads-up when an item or a payment would push a category over budget.

- **See where it went**
Charts and monthly reports show what you spent, what's left, and where you went over.

- **Budget alerts**
Get a notification when a category reaches 80% and then 100% of its budget.


## Live

- **Web app:** <https://www.budgetitfirst.com/>
- **API:** <https://api.budgetitfirst.com/>
- **Notifications API:** <https://notifications.budgetitfirst.com/healthz>

> The backend services run on Render's free tier and spin down after inactivity — the first request after idle time can take 30–50 seconds. Budget alerts are never lost while the service sleeps: they wait in the queue and appear once it wakes up.

## Stack

**Frontend:** React, TypeScript, Vite, MUI, Redux Toolkit, React Query, Firebase Auth, Electron
**Backend:** ASP.NET Core, Entity Framework Core, Azure SQL Database, Firebase Admin SDK
**Notification service:** Node.js, TypeScript, Express, MongoDB (Mongoose), RabbitMQ (amqplib), Zod, Pino, Vitest
**Infrastructure:** Docker, Docker Compose, Kubernetes (kind), GitHub Actions, Render, Vercel, CloudAMQP, MongoDB Atlas

## How budget alerts work

```
React app ──saves expense──▶ ASP.NET Core API ──▶ Azure SQL
                                   │
                                   │ publishes ExpenseChanged
                                   ▼
                          RabbitMQ (CloudAMQP)
                                   │
                                   ▼
                   Notification service (Node) ──▶ MongoDB Atlas
                                   ▲
React app (bell) ──GET /notifications──┘
```

- **Event-driven:** the API doesn't call the notification service. It publishes an event and moves on, so the two services can fail and deploy separately.
- **Never blocks saving:** if the broker is slow or down, the expense is still saved and only the alert is skipped (2-second publish timeout).
- **Each alert once:** RabbitMQ delivers at least once, and a unique index in MongoDB turns duplicates into no-ops.
- **Bad messages don't loop forever:** a quorum queue with a delivery limit moves failed messages to a dead-letter queue for inspection.
- **Same login:** the service checks the same Firebase tokens as the API, and users only see their own alerts.
- **Off switch:** `Events__Provider` turns publishing on (`rabbitmq`) or off (`none`, the default). Removing it is the rollback.

## Run it locally

Needs Docker, .NET 10 and Node.js.

```bash
# RabbitMQ, MongoDB and the notification service
cp .env.example .env          # put your Firebase UID in DEV_USER_ID
docker compose up --build

# The API, with events turned on
cd backend/TodoApi
Events__Provider=rabbitmq Events__RabbitMq__Uri=amqp://budget:change-me@localhost:5672 dotnet run

# The frontend
cd frontend
npm install
npm run dev
```

`frontend/.env` needs `VITE_API_URL=http://localhost:5192` and `VITE_NOTIFICATIONS_API_URL=http://localhost:8081`. Without the second one, the bell is hidden.

- RabbitMQ management UI: <http://localhost:15672>
- Tests: `npm test` in `services/notification-service`, `dotnet test` in `backend`
- Kubernetes: `scripts/kind-up.sh` deploys the same stack to a local kind cluster
