# AppVault - AI-Powered Document Management

AppVault is an AI-powered document management web application built with React, TypeScript, and Firebase. It provides features for document upload, AI recognition, translation, document viewing, and management with multilingual support and theming.

🚀 **CI/CD Pipeline**: GitHub → Firebase → Vercel

## Features

- Document upload and management
- AI-powered document recognition and classification
- Document translation
- Document viewing and organization
- Category-based document management
- **Enhanced Document Cards** with comprehensive metadata display
- Multilingual support (English, Macedonian, French)
- Light/Dark theme support
- Responsive design for mobile and desktop
- Comprehensive authentication system with password reset functionality

### Enhanced Document Cards

The application features rich, detailed document cards that provide comprehensive information at a glance:

#### Visual Enhancements
- **Document Preview Thumbnails** - Visual previews for images and PDFs with fallback icons
- **Document Type Badges** - Quick identification of file types (PDF, Word, Excel, Images)
- **Enhanced Visual Hierarchy** - Improved layout with better spacing and typography

#### Processing & Quality Information
- **Processing Status Indicators** - Real-time status with detailed step tracking
- **Quality Metrics** - Document quality scores with visual progress bars
- **Processing Time** - Performance metrics for AI processing
- **Confidence Scores** - AI processing confidence levels with color-coded indicators
- **Error Information** - Detailed error messages for failed processing

#### Analytics & Usage Statistics
- **View Count Tracking** - Number of times document has been viewed
- **Last Accessed Timestamps** - When document was last opened
- **Document Age** - Time since upload with smart formatting
- **Download/Share/Edit Counts** - Usage analytics for document interactions
- **Popularity Scoring** - Visual popularity indicators

#### Security & Privacy Features
- **Encryption Status** - Visual indicators for encrypted documents
- **Privacy Level Badges** - Public/Private/Restricted classification
- **Sharing Status** - Number of people with document access
- **Document Lock/Archive Status** - Security state indicators

#### Collaboration Features
- **Collaborator Tracking** - Number of active collaborators
- **Version History** - Visual version badges with modification dates
- **Change Tracking** - Edit history and modification timestamps
- **Sharing Indicators** - Collaboration status display

#### Quick Actions
- **Download Button** - One-click document download
- **Share Functionality** - Native sharing API integration
- **Reprocess Button** - AI re-analysis capabilities
- **Info Button** - Comprehensive document details popup
- **Delete Button** - Secure document removal with validation

#### Advanced Metadata Display
- **AI Model Information** - Which AI model processed the document
- **Language Detection** - Detected language with confidence scores
- **Entity Extraction** - Extracted names, dates, and other entities
- **Category Classification** - Document categorization with accuracy metrics
- **Word Count** - Document length statistics
- **Summary Preview** - AI-generated document summaries

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
3. Enable Password Reset functionality in the Firebase Authentication settings
4. Create Firestore database
5. Set up Firebase Storage
6. Add your Firebase configuration to `.env` file

## Authentication System

The application features a comprehensive authentication system built with Firebase Authentication:

### Features

- User registration with email and password
- User login with email and password
- Password reset via email
- User profile management
- Protected routes for authenticated users
- Remember me functionality

### Password Reset Flow

1. User navigates to the Forgot Password page
2. User enters their email address
3. System validates the email format
4. Request is sent to Firebase via `sendPasswordResetEmail`
5. User receives feedback (success or error message)
6. Firebase sends a password reset email with a secure link
7. User follows the link to create a new password

For more detailed information about the password reset functionality, see [PASSWORD_RESET.md](./docs/PASSWORD_RESET.md).

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
