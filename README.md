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


## Live

- **Web app:** <https://www.budgetitfirst.com/>
- **API:** <https://api.budgetitfirst.com/>

> The backend runs on Render's free tier and spins down after inactivity — the first request after idle time can take 30–50 seconds.

## Stack

**Frontend:** React, TypeScript, Vite, MUI, Redux Toolkit, React Query, Firebase Auth, Electron
**Backend:** ASP.NET Core, Entity Framework Core, Azure SQL Database, Firebase Admin SDK

