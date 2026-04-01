# 📘 TypeScript CRUD API with Node.js, Express & MySQL

A fully typed REST API built using **TypeScript**, **Node.js**, **Express**, and **MySQL (Sequelize ORM)**. This project demonstrates CRUD operations, validation, and a scalable backend structure ready for frontend integration.

---

## 🚀 Features

* ✅ TypeScript-based backend (type safety)
* ✅ RESTful CRUD API for users
* ✅ MySQL database with Sequelize ORM
* ✅ Request validation using Joi
* ✅ Error handling middleware
* ✅ JWT-ready structure (optional extension)
* ✅ API testing via Postman / curl

---

## 🧰 Tech Stack

* Node.js
* Express.js
* TypeScript
* MySQL
* Sequelize
* Joi
* JWT (jsonwebtoken)
* bcryptjs

---

## 📦 Prerequisites

Make sure you have:

* Node.js installed
* MySQL installed and running
* VS Code (recommended)
* Postman / Thunder Client / curl

---

## ⚙️ Setup Instructions

### 1. Create Project

```bash
mkdir typescript-crud-api
cd typescript-crud-api
npm init -y
```

---

### 2. Install Dependencies

#### Runtime Dependencies

```bash
npm install express mysql2 sequelize bcryptjs jsonwebtoken cors joi rootpath
```

#### Dev Dependencies

```bash
npm install --save-dev typescript ts-node nodemon \
@types/node @types/express @types/cors \
@types/bcryptjs @types/jsonwebtoken
```

---

### 3. Initialize TypeScript

```bash
npx tsc --init
```

Update your `tsconfig.json` (important settings):

```json
{
  "compilerOptions": {
    "target": "ES6",
    "module": "commonjs",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "baseUrl": "src",
    "resolveJsonModule": true
  }
}
```

---

### 4. Configure Scripts

Update your `package.json`:

```json
"scripts": {
  "start:dev": "nodemon --exec ts-node src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "test": "echo \"Run API tests using Postman or curl\""
}
```

---

### 5. Configure Database

Create `config.json` in root:

```json
{
  "database": {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "your_password",
    "database": "typescript_crud_api"
  },
  "jwtSecret": "change-this-in-production-123!"
}
```

---

### 6. Project Structure

```
src/
│
├── _helpers/
│   ├── db.ts
│   └── role.ts
│
├── _middleware/
│   ├── errorHandler.ts
│   └── validateRequest.ts
│
├── users/
│   ├── user.model.ts
│   ├── user.service.ts
│   └── users.controller.ts
│
└── server.ts
```

---

## ▶️ Running the Application

Start development server:

```bash
npm run start:dev
```

Expected output:

```
✅ Server running on http://localhost:4000
```

---

## 🧪 Testing Instructions

You can test using **Postman**, **Thunder Client**, **EchoAPI for VS Code**, or **curl**.

---

### 🔹 1. Create User

**POST /users**

```json
{
  "title": "Mr",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "password": "secret123",
  "confirmPassword": "secret123",
  "role": "User"
}
```

✅ Expected: `200 OK`

---

### 🔹 2. Get All Users

**GET /users**

✅ Expected: List of users (without passwordHash)

---

### 🔹 3. Get User by ID

**GET /users/:id**

✅ Expected: Single user
❌ If not found → `404 Not Found` / `500 Internal Server Error`

---

### 🔹 4. Update User

**PUT /users/:id**

```json
{
  "firstName": "Janet",
  "password": "newsecret456",
  "confirmPassword": "newsecret456"
}
```

✅ Expected: User updated

---

### 🔹 5. Delete User

**DELETE /users/:id**

✅ Expected: User deleted

---

### 🔹 6. Validation Errors

Send invalid request (e.g., missing required fields)

❌ Expected: `400 Bad Request`