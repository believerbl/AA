# Full-Stack Web Application (MERN)

A scalable, decoupled full-stack web application featuring a high-performance React frontend powered by Vite and a robust Node.js/Express backend integrated with MongoDB.

## 🏗️ System Architecture

This repository is structured as a monorepo containing two distinct micro-environments:

*   **`/aa` (Client):** The frontend user interface built with React.js, optimized with Vite for rapid Hot Module Replacement (HMR) and styled using Tailwind CSS.
*   **`/aa-backend` (API):** The backend RESTful API built on Node.js and Express.js, utilizing Mongoose for strict MongoDB object modeling and schema validation.

## 🛠️ Tech Stack

**Frontend:**
*   React.js
*   Vite
*   Tailwind CSS

**Backend:**
*   Node.js
*   Express.js
*   MongoDB (Mongoose ODM)
*   CORS & Body-Parser (Middleware)
*   Dotenv (Environment Configuration)

---

## 🚀 Getting Started

Follow these instructions to set up the project locally for development and testing.

### Prerequisites
Ensure you have the following installed on your local machine:
*   [Node.js](https://nodejs.org/) (v16.x or higher recommended)
*   [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URI)
*   Git

### 1. Clone the Repository
### 2. Backend Setup (/aa-backend):
{
cd aa-backend <br>
npm install
}

Environment Variables:
{
PORT=5000 <br>
MONGO_URI=your_mongodb_connection_string
}

Start the Server:
{
npm start <br>
npm run dev
} <br>
The API will start running on http://localhost:5000


### 3. Frontend Setup (/aa):
{
cd aa-backend <br>
npm install
}

Start the Client:
{
npm run dev
}

📁 Directory Structure:

├── aa/                     # React Frontend Environment <br>
│   ├── public/             # Static assets (favicons, etc.) <br>
│   ├── src/                # React source code (App.jsx, main.jsx, components)<br>
│   ├── index.html          # HTML entry point<br>
│   ├── vite.config.js      # Vite build configuration <br>
│   └── package.json        # Frontend dependencies <br>
│ <br>
└── aa-backend/             # Node.js/Express Backend Environment <br>
    ├── server.js           # API Entry point & Server setup <br>
    ├── package.json        # Backend dependencies (Express, Mongoose, etc.) <br>
    └── .env                # Backend environment variables (Not tracked) <br>

```bash
git clone [https://github.com/believerbl/](https://github.com/believerbl/)[YOUR-REPO-NAME].git
cd [YOUR-REPO-NAME]
