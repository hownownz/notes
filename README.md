# Quick Capture Lists 📝

A fast, clean, and simple list manager for capturing thoughts, tasks, and ideas. Built with vanilla JavaScript and Firebase.

## Features

### Core Functionality
- **Quick Capture**: Add items instantly with a single input at the top
- **Multiple Custom Lists**: Create unlimited lists (Shopping, Home Tasks, Ideas, etc.)
- **Collapsible Lists**: Keep your view clean by collapsing lists you're not using
- **Strike-through Completion**: Click items to mark them complete with visual feedback
- **Drag & Reorder**: Rearrange items within lists by dragging

### Smart Features
- **Search Across All Lists**: Find any item quickly across all your lists
- **Move Items Between Lists**: Easily reorganize items to different lists
- **Edit Items Inline**: Update item text or move to another list
- **Bulk Actions**: Complete or delete multiple items at once
- **Clear Completed**: Remove finished items to keep lists clean

### Technical Features
- **Real-time Sync**: Changes sync instantly across all devices
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

### Creating a List
1. Click "+ New List" button
2. Enter list name (e.g., "Shopping", "Home Tasks", "Ideas")
3. Choose an emoji icon
4. Click "Save"

### Adding Items
1. Type your item in the quick-add box at the top
2. Select which list to add it to
3. Press Enter or click the "+" button

### Managing Items
- **Complete**: Click the checkbox or item text to strike through
- **Edit**: Click the pencil icon to edit text or move to another list
- **Delete**: Click the X icon to remove
- **Reorder**: Drag items up/down to reorder

### Organizing Lists
- **Collapse**: Click list header to collapse/expand
- **Edit**: Click pencil icon in list header
- **Delete**: Click trash icon in list header

### Search
- Click the search icon (🔍) in header
- Type to search across all lists
- Click a result to jump to that item

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
- **Import**: Feature coming soon

## Planned Features

- [ ] Share lists with other users
- [ ] Bulk import/export
- [ ] List templates
- [ ] Recurring items
- [ ] Item notes/details
- [ ] Color-coded lists
- [ ] List sorting options
- [ ] Keyboard shortcuts
- [ ] Dark mode toggle

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

MIT License - feel free to use and modify as needed.

## Acknowledgments

Based on the architecture of the Shopping Planner project, adapted for general list management.

---

**Need help?** See [SETUP.md](SETUP.md) for detailed setup instructions.
