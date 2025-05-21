# Backend-MS-Base

[![codecov](https://codecov.io/gh/Practica-Supervisada-UCR-2025/Backend-MS-Files/graph/badge.svg?token=Q539NDNGN2)](https://codecov.io/gh/Practica-Supervisada-UCR-2025/Backend-MS-Files)

## Project Overview
Backend-MS-Base is a foundational backend service built with Node.js and TypeScript. It provides a modular structure for managing features like user authentication, database interactions, and API routing.

## Prerequisites

### Install Node.js
1. Download the MSI installer from [Node.js Downloads](https://nodejs.org/en/download/)./

2. Verify the installation by running the following command in the terminal:
   ```
   node -v
   ```
3. Open PowerShell as an administrator and execute:
   ```
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
   ```
4. Verify npm installation:
   ```
   npm -v
   ```

### Install TypeScript and Dependencies
Run the following commands:
```
npm install -g typescript ts-node nodemon
npm install express body-parser cookie-parser compression cors
npm install -g @types/express @types/body-parser @types/cookie-parser @types/compression @types/cors
npm install --save-dev @types/supertest jest ts-jest @types/jest
```

### Install PostgreSQL
Run the following command:
```
npm install pg @types/pg dotenv
```

## Folder Structure
- `src/`: Contains the application source code.
   - `features/users/`: Includes controllers, DTOs, middleware, routes, and services for user-related functionality.
- `tests/`: Contains unit and integration tests.
- `docs/`: Documentation files, including the [ER Diagram](docs/ER_Diagram3.md).

## Usage
Currently, the application does not have defined scripts for running the server or tests. Please update the `package.json` file with appropriate commands, such as:
- Start the server: `"start": "npx ts-node src/app"`
- Run tests: `"test": "npx jest"`

## Documentation
Refer to the [ER Diagram](docs/ER_Diagram3.md) for the database schema.
