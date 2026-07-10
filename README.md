# Quick Capture 📝

A fast, dead-simple note capture app. No lists, no folders — just add a note, tick it off when done, or remove it. Built with vanilla JavaScript and Firebase.

## Features

### Core Functionality
- **Quick Capture**: Add a note instantly with a single input at the top
- **Tick Off**: Click a note to mark it complete with a strike-through
- **Edit**: Add or update a comment/detail on any note after adding it
- **Delete**: Remove notes whenever you want

### Smart Features
- **Search**: Find any note by its text or comment
- **Clear Completed**: Remove all ticked-off notes in one go

### Technical Features
- **Real-time Sync**: Changes sync instantly across all your devices (phone, desktop, etc.)
- **Offline Support**: Works offline, syncs when reconnected
- **Secure Authentication**: Email/password login via Firebase Auth
- **Cloud Storage**: All data stored securely in Firebase Firestore
- **Mobile-First Design**: Optimized for mobile but works great on desktop
- **Zero Build Process**: Pure HTML/CSS/JS - no compilation needed

## Live Demo

Once deployed: `https://YOUR-USERNAME.github.io/notes/`

## Getting Started

### Prerequisites
- A GitHub account
- A Firebase account (free tier is sufficient)
- A modern web browser

### Quick Setup

1. **Clone or Fork this repository**

2. **Set up Firebase** (see [SETUP.md](SETUP.md) for detailed instructions)
   - Create a new Firebase project
   - Enable Authentication (Email/Password)
   - Create Firestore database
   - Copy your Firebase config

3. **Update Configuration**
   - Edit `firebase-config.js` with your Firebase credentials

4. **Deploy to GitHub Pages**
   - Push to your GitHub repository
   - Enable GitHub Pages in repository settings
   - Select branch: `main`, folder: `/ (root)`

5. **Access your app**
   - Visit `https://YOUR-USERNAME.github.io/notes/`

For detailed setup instructions, see [SETUP.md](SETUP.md)

## Usage

### Adding Notes
1. Type your note in the box at the top
2. Press Enter or click the "+" button

### Managing Notes
- **Complete**: Click the checkbox or note text to strike through
- **Edit**: Click the pencil icon to change the text or add a comment/detail
- **Delete**: Click the ✕ icon, or delete from within the edit screen

### Search
- Click the search icon (🔍) in the header
- Type to search note text and comments
- Click a result to jump to that note

## Upgrading From an Older Version

This app used to be organized around named lists (Shopping, Home Tasks, etc). That model has been replaced with a single flat feed of notes, since lists turned out to add more overhead than value for day-to-day capture.

The first time you sign in after this update, the app automatically copies every item from your old lists into the new flat notes feed (a one-time migration). Your original list data is **not deleted** — it's left in Firestore untouched as a backup, just no longer shown in the app.

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6 Modules)
- **Styling**: Pure CSS with CSS Variables
- **Backend**: Firebase (Authentication + Firestore)
- **Hosting**: GitHub Pages
- **PWA Ready**: Can be installed as a mobile app

## File Structure

```
notes/
├── index.html           # Main app interface
├── login.html           # Authentication page
├── app.js              # Core app logic
├── firebase-service.js  # Firebase operations
├── firebase-config.js   # Firebase credentials (YOU MUST EDIT THIS)
├── styles.css          # All styling
├── manifest.json       # PWA configuration
├── README.md           # This file
├── SETUP.md            # Detailed setup guide
└── .gitignore          # Git ignore rules
```

## Data Model

Each note is its own Firestore document under `users/{uid}/items/{itemId}`:

```
{
  id, text, comment, completed, createdAt, updatedAt
}
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security

- All user data is isolated per account
- Firestore security rules enforce data privacy
- Firebase API keys are public by design (security comes from server-side rules)
- No sensitive credentials in repository

## Export/Import

- **Export**: Settings → Export All Data (JSON format)
- **Import**: Settings → Import Data (JSON format)

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

MIT License - feel free to use and modify as needed.

---

**Need help?** See [SETUP.md](SETUP.md) for detailed setup instructions.
