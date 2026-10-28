# FairShare — Dynamic Split-Bill Settlement Optimizer

FairShare is a full-stack group expense management application. It helps users create groups, record shared expenses, track balances, and manage settlements between members.

The main objective is to reduce the **number of transactions required to settle debts** using a greedy max-creditor/max-debtor matching approach.

## Features

- User registration and login
- Create and manage groups
- Add and manage group members
- Record and split group expenses
- View expenses and transaction history
- Track balances between members
- Record and manage settlements
- Backend API with authentication

## Technologies Used

### Frontend
- HTML
- CSS
- Vanilla JavaScript

### Backend
- Node.js
- Express.js
- REST APIs
- JWT authentication

### Database
- MongoDB
- Mongoose

### Development and Testing
- Visual Studio Code
- Thunder Client
- Git and GitHub

## Project Structure

```text
FairShare/
├── frontend/
│   ├── balances.html
│   ├── balances.js
│   ├── core.js
│   ├── dashboard.html
│   ├── dashboard.js
│   ├── expense.html
│   ├── expense.js
│   ├── group.html
│   ├── group.js
│   ├── index.html
│   ├── landing.css
│   ├── ledger.html
│   ├── ledger.js
│   ├── login.html
│   ├── members.html
│   ├── members.js
│   ├── profile.html
│   ├── profile.js
│   ├── settlement.html
│   ├── settlement.js
│   └── style.css
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
└── README.md
```

## Pages

- `index.html` — Landing page and product overview
- `login.html` — User registration and login
- `dashboard.html` — Dashboard and group selection
- `group.html` — Group overview and statistics
- `members.html` — Manage group members
- `expense.html` — Add and split expenses
- `ledger.html` — View and manage expenses
- `balances.html` — View member balances
- `settlement.html` — Settlement plan and payment history
- `profile.html` — User profile and logout

## Backend Architecture

The backend follows a modular structure:

- **Config:** Database and application configuration
- **Models:** Define the structure of stored data
- **Routes:** Define API endpoints
- **Controllers:** Handle request processing and application logic
- **Middleware:** Handle authentication and other request checks
- **server.js:** Starts the backend server

The frontend sends HTTP requests to the Express backend. The backend processes requests, interacts with MongoDB through Mongoose, and returns responses to the frontend.

## API Endpoints

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Log in a user |

### Groups

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/groups` | Create a group |
| GET | `/api/groups` | Get groups |
| GET | `/api/groups/:id` | Get a group by ID |
| PUT | `/api/groups/:id` | Update a group |
| DELETE | `/api/groups/:id` | Delete a group |

### Expenses

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/expenses` | Create an expense |
| GET | `/api/expenses` | Get expenses |
| GET | `/api/expenses/:id` | Get an expense by ID |
| PUT | `/api/expenses/:id` | Update an expense |
| DELETE | `/api/expenses/:id` | Delete an expense |

The expenses endpoint can use a `groupId` query parameter to filter expenses by group.

### Settlements

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/settlements` | Create a settlement |
| GET | `/api/settlements` | Get settlements |
| DELETE | `/api/settlements/:id` | Delete a settlement |

Settlement requests can use `groupId` to identify the relevant group.

## How to Run the Project

### 1. Clone the repository

```bash
git clone https://github.com/sameer193/FairShare.git
cd FairShare
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Configure the required environment variables in `backend/.env`, including the MongoDB connection string and any authentication settings required by the backend.

Do not commit secrets or database credentials to GitHub.

### 3. Start the backend

Run the start command defined in `backend/package.json`. If no start script is configured, use the appropriate Node.js command for `server.js`.

### 4. Start the frontend

Open `index.html` using VS Code Live Server or another local web server.

Make sure the frontend is configured to communicate with the correct backend URL.

## API Testing

The backend APIs can be tested using Thunder Client in Visual Studio Code.

Testing includes:

- User registration and login
- Creating and retrieving groups
- Creating, updating, and deleting expenses
- Retrieving group expenses using `groupId`
- Creating and deleting settlements
- Checking authentication and API error responses

## Project Objective

FairShare aims to simplify group expense management by organizing shared expenses, calculating member balances, and helping group members settle their debts with fewer transactions.

## Future Improvements

- Improve input validation and error handling
- Add expense summaries and reports
- Improve security and access control
- Add notifications for expenses and settlements
- Improve the user interface and user experience