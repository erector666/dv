# AppVault - AI-Powered Document Management

AppVault is an AI-powered document management web application built with React, TypeScript, and Firebase. It provides features for document upload, AI recognition, translation, document viewing, and management with multilingual support and theming.

## Features

- Document upload and management
- AI-powered document recognition and classification
- Document translation
- Document viewing and organization
- Category-based document management
- Multilingual support (English, Macedonian, French)
- Light/Dark theme support
- Responsive design for mobile and desktop

## Project Structure

```
src/
├── assets/       # Images, icons, and other static assets
├── components/   # Reusable UI components
├── context/      # React context providers
├── hooks/        # Custom React hooks
├── pages/        # Page components
├── routes/       # Application routing
├── services/     # API and Firebase services
├── types/        # TypeScript type definitions
└── utils/        # Utility functions
```

## Technologies

- React with TypeScript
- Firebase (Authentication, Firestore, Storage)
- React Router for navigation
- React Query for data fetching
- Tailwind CSS for styling
- Framer Motion for animations

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/erector666/DocVault.git
   cd DocVault/appvault
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your Firebase configuration details

4. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```

## Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Email/Password method
3. Create Firestore database
4. Set up Firebase Storage
5. Add your Firebase configuration to `.env` file

## Deployment

This app can be deployed to Firebase Hosting:

```bash
npm run build
npm install -g firebase-tools
firebase login
firebase init
firebase deploy
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
