# xconfess

An anonymous confession platform where users can share their thoughts, react to confessions, and engage in private messaging. Built with Next.js (frontend) and NestJS (backend), offering high security, real-time interactions, and an intuitive UI.

First Join our community on Telegram immediately : https://t.me/xconfess_Community

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (for the backend)

### Setup

1. Clone the repository:
    ```bash
    git clone https://github.com/YOUR_USERNAME/xconfess.git
    cd xconfess
    ```

2. Install backend dependencies (NestJS):
    ```bash
    cd xconfess-backend
    npm install
    ```

3. Install frontend dependencies (Next.js):
    ```bash
    cd xconfess-frontend
    npm install
    ```

4. Set up environment variables:
    - Copy `.env.example` to `.env` and add your MySQL database and JWT secret.
    - Example:
        ```env
        DATABASE_URL=postgresql://username:password@localhost:5432/xconfess
        JWT_SECRET=your-secret-key
        ```

5. Start the backend:
    ```bash
    cd xconfess-backend
    npm run start:dev
    ```

6. Start the frontend:
    ```bash
    cd xconfess-frontend
    npm run dev
    ```

The app will be running on [http://localhost:3000](http://localhost:3000) and the backend API on [http://localhost:5000](http://localhost:5000).

## Usage

Once the project is running, you can access the frontend at [http://localhost:3000](http://localhost:3000). You can:

- Make anonymous confessions
- React to other users' confessions
- Send direct messages to other users

## Contributing

We welcome contributions! Here’s how you can help:

1. **Fork the repository** to your GitHub account.
2. **Clone the fork** to your local machine:
    ```bash
    git clone https://github.com/YOUR_USERNAME/xconfess.git
    cd xconfess
    ```
3. **Create a new branch** for your feature or bug fix:
    ```bash
    git checkout -b feature/my-feature
    ```
4. **Make your changes** and commit them:
    ```bash
    git commit -m "Add new feature"
    ```
5. **Push your branch** and create a pull request.

### Issues
Check out the [Issues](https://github.com/Godsmiracle001/Xconfess/issues) section for current tasks and bugs.
