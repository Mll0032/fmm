# 🧙‍♂️ Fizzrix's Massive Modulatorium

> A modern web application for Dungeon Masters to organize, manage, and run tabletop RPG campaigns with ease.

![React](https://img.shields.io/badge/React-19.x-blue?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?style=flat-square&logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

## 📖 About

Fizzrix's Massive Modulatorium (FMM) is designed specifically for Dungeon Masters and tabletop RPG enthusiasts who need better tools for campaign management. Born from the frustration of juggling spreadsheets, documents, and notes during game sessions, FMM provides an intuitive, visual interface for organizing and running campaigns.

### ✨ Key Features

- **📚 Module Organization** - Create and manage campaign modules with episodes, monsters, and magic items
- **🎮 Dynamic Session Dashboard** - Real-time campaign management with drag-and-drop interface
- **👥 Player Management** - Track player information and contact preferences
- **🔒 Session Locking** - Prevent accidental changes during active gameplay
- **🖼️ Rich Content Support** - Upload and display images for maps, characters, and items
- **💾 Cloud Storage** - All data synced and backed up via Supabase
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account (for database and storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mll0032/fmm.git
   cd fmm
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase database**
   - Create a new Supabase project
   - Run the database migrations (SQL files in the project)
   - Set up storage buckets for images

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## 🎯 Usage

### Creating Your First Module

1. Navigate to the **Modules** page
2. Click "New Module" and enter basic information
3. Add episodes, monsters, and magic items using the Module Editor
4. Upload images to enhance your content

### Managing Sessions

1. Go to the **Dashboard** page
2. Select your module and create a new session
3. Add content cards by dragging from the available sections
4. Use the lock feature during gameplay to prevent accidental changes

### Player Management

1. In any session, use the **Players** section
2. Add player information including contact preferences
3. Set preferences for email or text communication (future whisper system)

## 🛠️ Technology Stack

- **Frontend Framework**: React 19 with hooks and functional components
- **Build Tool**: Vite for fast development and optimized builds
- **Database**: Supabase (PostgreSQL) with real-time capabilities
- **Storage**: Supabase Storage for image uploads
- **Routing**: React Router for client-side navigation
- **Drag & Drop**: @dnd-kit for intuitive dashboard management
- **Styling**: CSS-in-JS with CSS custom properties for theming

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── DashboardCard/   # Individual dashboard cards
│   ├── DraggableGrid/   # Drag-and-drop grid system
│   ├── Modal/           # Modal dialog component
│   ├── PlayersSection/  # Player management component
│   └── ...
├── pages/               # Main application pages
│   ├── About.jsx        # About page with project info
│   ├── Dashboards.jsx   # Main session dashboard
│   ├── ModuleEditor.jsx # Module creation and editing
│   ├── Modules.jsx      # Module listing page
│   └── ...
├── context/             # React context for state management
├── hooks/               # Custom React hooks
├── state/               # State management and data stores
├── lib/                 # External service configurations
└── utils/               # Utility functions
```

## 🗺️ Roadmap

### Upcoming Features

- **📱 Whisper System** - Send targeted messages to specific players
- **📧 Content Sharing** - Email or text campaign content directly to modifiers
- **📊 Campaign Analytics** - Track player engagement and progression
- **🌐 Library System** - Share homebrew content with the community

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style and patterns
- Write descriptive commit messages
- Test your changes thoroughly
- Update documentation as needed

## 🐛 Bug Reports & Feature Requests

If you encounter any issues or have ideas for new features:

1. Check existing [Issues](https://github.com/Mll0032/fmm/issues) first
2. Create a new issue with:
   - Clear description of the problem/feature
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Screenshots if applicable

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Matthew Lawson**
- GitHub: [@Mll0032](https://github.com/Mll0032)
- Email: mllawson18@gmail.com
- LinkedIn: [Matthew Lawson](https://www.linkedin.com/in/matthew-lawson-dev/)

## 🙏 Acknowledgments

- Built for the D&D community with ❤️
- Inspired by the need for better DM tools
- Thanks to the open-source community for amazing libraries and tools

## 📊 Project Status

**Current Version**: 1.0.0  
**Status**: Active Development  
**Last Updated**: September 2025

---

*"Built by a DM, for DMs. May your campaigns be epic and your TPKs be memorable."*