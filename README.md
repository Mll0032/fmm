# 🧙‍♂️ Fizzrix's Massive Modulatorium

> A modern web application for Game Masters to organize, manage, and run tabletop RPG campaigns with ease.

![React](https://img.shields.io/badge/React-19.x-blue?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?style=flat-square&logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=flat-square&logo=vercel)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

## 📖 About

Fizzrix's Massive Modulatorium (FMM) is designed for Game Masters and tabletop RPG enthusiasts across all systems who need better tools for campaign management. Born from the frustration of juggling spreadsheets, documents, and notes during game sessions, FMM provides an intuitive, visual interface for organizing and running campaigns.

### ✨ Key Features

- **📚 Module Organization** - Create and manage campaign modules with episodes, monsters, and magic items
- **🎮 Dynamic Session Dashboard** - Drag-and-drop dashboard for real-time campaign management during live play
- **🔒 Session Locking** - Prevent accidental changes during active gameplay
- **🖼️ Visual Content** - Upload and display images for maps, monsters, magic items, and more
- **🤖 AI Assistant** - Built-in AI writing tools powered by your choice of Anthropic Claude, OpenAI, Groq, Gemini, or OpenRouter
- **🎵 Soundboard** - Play ambient sound bites and background music during sessions, with royalty-free track search via Freesound
- **🌐 Community Library** - Publish your modules for others to discover, or import community-created modules into your collection
- **🎨 Theming** - Light, dark, and system-default themes with high contrast and reduced motion accessibility options
- **🔐 Secure Auth** - Sign in with Google or Discord — your data is private and only visible to you
- **💾 Cloud Storage** - All data synced and backed up via Supabase

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm
- Supabase account (for database, auth, and storage)
- Vercel account (for deployment and API proxy)

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
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Enable Auth providers: Google and/or Discord under Authentication → Providers
   - Create the following tables with RLS enabled:
     - `modules`, `sessions`, `soundboards`, `library`, `user_settings`
   - Create storage buckets: `module-images`, `module-audio`
   - Set storage bucket policies to authenticated users only

5. **Start the development server**
   ```bash
   npm run dev
   ```
   > **Note:** For local testing of the AI proxy, use `vercel dev` instead of `npm run dev`. The `/api/ai` endpoint requires the Vercel CLI.

6. **Open your browser**
   Navigate to `https://localhost:5173`

### Building for Production

Deploy to Vercel by connecting your GitHub repository. Add the environment variables in the Vercel dashboard under Project Settings → Environment Variables:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

After deploying, update your Supabase Auth settings:
- **Site URL**: your Vercel deployment URL
- **Additional Redirect URLs**: your Vercel URL with `/**` wildcard

## 🎯 Usage

### Creating Your First Module

1. Sign in with Google or Discord
2. Navigate to the **Modules** page
3. Enter a module name, select a category (One-Shot or Campaign), and click **Add**
4. Click the module to open the editor and add episodes, monsters, magic items, and images

### Running a Session

1. Go to the **Dashboard** page
2. Select a module and create or resume a session
3. Drag and arrange content cards on the grid
4. Use the lock feature during gameplay to prevent accidental changes
5. Use the **AI Assistant** panel for on-the-fly content generation
6. Use the **Soundboard** to set the atmosphere with music and effects

### Sharing with the Community

1. On the **Modules** page, click **+ Library** on any module
2. Select the game system and click **Share**
3. Visit the **Library** page to browse and import modules shared by others

### AI Assistant Setup

1. Go to **Settings**
2. Select your preferred AI provider (Anthropic, OpenAI, Groq, Gemini, or OpenRouter)
3. Enter your API key — free options are available via Groq and Gemini

## 🛠️ Technology Stack

- **Frontend**: React 19 with hooks and functional components
- **Build Tool**: Vite for fast development and optimized builds
- **Deployment**: Vercel (frontend + serverless API proxy)
- **Database & Auth**: Supabase (PostgreSQL, OAuth, Storage)
- **Routing**: React Router for client-side navigation
- **Drag & Drop**: @dnd-kit for intuitive dashboard management
- **Styling**: CSS-in-JS with CSS custom properties for theming
- **AI Providers**: Anthropic, OpenAI, Groq, Gemini, OpenRouter

## 📁 Project Structure

```
src/
├── api/                     # Vercel serverless functions (AI proxy)
├── components/              # Reusable UI components
│   ├── DashboardCard/       # Individual dashboard cards
│   ├── DraggableGrid/       # Drag-and-drop grid system
│   ├── Modal/               # Modal dialog component
│   ├── Soundboard/          # Audio playback and Freesound integration
│   ├── SessionAssistant/    # AI assistant panel
│   └── ...
├── pages/                   # Main application pages
│   ├── About.jsx            # About page
│   ├── Dashboards.jsx       # Main session dashboard
│   ├── Library.jsx          # Community module library
│   ├── ModuleEditor.jsx     # Module creation and editing
│   ├── Modules.jsx          # Module listing page
│   └── Settings.jsx         # User settings
├── context/                 # React context (Auth, Data)
├── hooks/                   # Custom React hooks
├── state/                   # State management and data stores
├── lib/                     # External service configurations
└── styles/                  # Global styles and theme
```

## 🗺️ Roadmap

### Upcoming Features

- **👥 Player Management** - Track player information, contact preferences, and character details
- **📱 Whisper System** - Send targeted messages to specific players without others seeing
- **📧 Content Sharing** - Email or text campaign content directly to players

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

- Built for the TTRPG community with ❤️
- Inspired by the need for better GM tools across all systems
- Thanks to the open-source community for amazing libraries and tools

## 📊 Project Status

**Current Version**: 1.1.0  
**Status**: Active Development  
**Last Updated**: May 2026

---

*"Built by a GM, for GMs. May your campaigns be epic and your sessions run smooth."*
