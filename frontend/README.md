# PlantPal Frontend

A gamified mindfulness app where your emotional journey nurtures virtual plants. Built with React, Vite, and Tailwind CSS.

## 🌱 About PlantPal

PlantPal helps users nurture their mental health by externalizing emotions as a living, evolving virtual plant world. Journal your thoughts, track your moods, and watch your garden flourish as you grow through what you go through.

## ✨ Features

- **Daily Emotional Journaling**: Express thoughts with AI-powered sentiment analysis
- **Virtual Plant Growth**: Plants evolve based on your emotional journey
- **Mood Tracking**: Understand emotional patterns over time
- **Music Integration**: Connect Spotify/Apple Music for mood influence
- **Social Garden**: Share and water friends' plants
- **Emotional DNA**: Unique visualizations of your growth journey

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PlantPal Backend running on `http://localhost:8000`

### Backend Setup (Required First)

Make sure your Django backend is running with the following structure:
\`\`\`
backend/
├── core/                 # Django project settings
├── apps/
│   ├── accounts/         # User authentication
│   ├── journal/          # Journal entries
│   ├── plants/           # Plant management
│   ├── moods/            # Mood tracking
│   └── reminders/        # Reminder system
├── manage.py
└── db.sqlite3
\`\`\`

Start your backend server:
\`\`\`bash
cd backend
python manage.py runserver
\`\`\`

### Frontend Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <your-repo-url>
   cd plantpal-frontend
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up environment variables**
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   
   Edit `.env` and configure:
   \`\`\`env
   VITE_API_URL=http://localhost:8000/api
   \`\`\`

4. **Start the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🛠️ Tech Stack

- **Frontend Framework**: React 18 with Vite
- **Styling**: Tailwind CSS + Shadcn UI
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **State Management**: React Context API
- **Authentication**: JWT with automatic token refresh

## 📁 Project Structure

\`\`\`
src/
├── components/          # Reusable UI components
│   ├── ui/             # Shadcn UI components
│   └── ProtectedRoute.jsx
├── context/            # React Context providers
│   └── AuthContext.jsx
├── features/           # Feature-based components
│   ├── LandingPage/
│   ├── userProfile/
│   ├── journaling/
│   ├── plantGrowth/
│   ├── socialGarden/
│   └── musicIntegration/
├── lib/               # Utility functions
│   └── utils.js
├── services/          # API calls and external services
│   └── api.js
├── App.jsx           # Main app component
├── main.jsx          # App entry point
└── index.css         # Global styles
\`\`\`

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔐 Authentication

The app uses JWT-based authentication with automatic token refresh:

- Access tokens are stored in localStorage
- Refresh tokens handle automatic re-authentication
- Protected routes redirect to login when unauthenticated
- API interceptors handle token attachment and refresh

## 🌐 API Integration

The frontend connects to your Django backend via REST API:

- **Base URL**: Configured via `VITE_API_URL`
- **Authentication**: Bearer token in Authorization header
- **Error Handling**: Centralized error handling with user feedback
- **Request/Response Interceptors**: Automatic token management

### API Endpoints Used

Based on your backend structure:

- `POST /api/accounts/login/` - User login
- `POST /api/accounts/register/` - User registration
- `GET /api/accounts/profile/` - Get user profile
- `GET /api/journal/entries/` - Get journal entries
- `POST /api/journal/entries/` - Create journal entry
- `GET /api/plants/plants/` - Get user plants
- `GET /api/moods/moods/` - Get mood entries
- `GET /api/reminders/reminders/` - Get reminders

## 🚀 Deployment

### Development
\`\`\`bash
npm run dev
\`\`\`

### Production Build
\`\`\`bash
npm run build
npm run preview
\`\`\`

### Environment Variables for Production
\`\`\`env
VITE_API_URL=https://your-backend-domain.com/api
VITE_NODE_ENV=production
\`\`\`

## 🧪 Testing

Run the linter:
\`\`\`bash
npm run lint
\`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Development Notes

### Day 18 Completed Features
- ✅ Vite React project setup
- ✅ Tailwind CSS + PostCSS configuration
- ✅ Shadcn UI integration
- ✅ API service with Axios (updated for your backend structure)
- ✅ Authentication context with JWT
- ✅ Login/Register pages with beautiful styling
- ✅ Protected routes
- ✅ Dashboard with backend integration
- ✅ Landing page
- ✅ Responsive design

### Backend Integration Status
- ✅ **accounts** app - Authentication endpoints
- ✅ **journal** app - Journal entry management
- ✅ **plants** app - Plant tracking
- ✅ **moods** app - Mood logging
- ✅ **reminders** app - Reminder system

### Next Steps (Day 19-21)
- [ ] Journal entry form and list components
- [ ] Plant creation and visualization
- [ ] Mood tracking interface
- [ ] Profile management
- [ ] Social features
- [ ] Music integration

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Ensure backend is running on `http://localhost:8000`
   - Check `VITE_API_URL` in `.env` file
   - Verify CORS settings in Django backend
   - Make sure your Django URLs include the API endpoints

2. **Authentication Issues**
   - Check if your Django backend has JWT authentication configured
   - Verify the token endpoints match your backend URLs
   - Ensure CORS allows the frontend domain

3. **Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check for any missing dependencies

## 📄 License

This project is licensed under the MIT License.

## 🌟 Acknowledgments

- [Shadcn UI](https://ui.shadcn.com/) for beautiful components
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Lucide](https://lucide.dev/) for icons
- [Vite](https://vitejs.dev/) for fast development

---

**PlantPal** - Grow through what you go through 🌱
