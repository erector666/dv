# Development Guide

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example`
4. Run the development server: `npm start`

## Development Workflow

1. Create feature branches from `main`
2. Implement features or fix bugs
3. Write tests for your changes
4. Submit a pull request for review

## Code Style

- Follow the ESLint configuration
- Use TypeScript for type safety
- Follow component naming conventions:
  - PascalCase for components
  - camelCase for functions and variables
  - UPPER_SNAKE_CASE for constants

## Component Development

- Create components in the `src/components` directory
- Export components from `index.ts` files
- Use Tailwind CSS for styling
- Implement responsive design for all components

## State Management

- Use React Context for global state
- Use React Query for server state
- Use local state for component-specific state

## Testing

- Write unit tests for components and utilities
- Write integration tests for complex features
- Run tests with `npm test`

## Deployment

- Build the production version with `npm run build`
- Deploy to Firebase Hosting
