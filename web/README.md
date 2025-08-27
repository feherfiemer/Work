# R-Service Tracker

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/feherfiemer/Work)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-enabled-purple.svg)](manifest.json)
[![Status](https://img.shields.io/badge/status-active-brightgreen.svg)](index.html)

A streamlined work tracking and payment management system designed for efficient daily work logging and payment tracking.

## ✨ Features

### 📋 Work Management
- **Daily Work Tracking**: Simple one-click work completion tracking
- **Status Dashboard**: Real-time view of today's work status
- **Work History**: Complete record of all work sessions
- **Calendar View**: Visual monthly overview with work status indicators

### 💰 Payment System
- **Payment Tracking**: Monitor earnings and pending payments
- **Flexible Payment Options**: Multiple payment amounts with quick selection
- **Balance Management**: Track current balance and payment history
- **Progress Indicators**: Visual progress toward payment milestones

### 📊 Analytics & Insights
- **Earnings Overview**: Comprehensive view of earnings and work progress
- **Work Statistics**: Track total days worked and earnings
- **Progress Metrics**: Detailed insights into work patterns
- **Data Export**: PDF report generation for record keeping

### 🎨 User Experience
- **Multiple Themes**: Choose from Blue, Orange, Green, Red, or Black & White
- **Dark/Light Mode**: Toggle between light and dark themes
- **Responsive Design**: Optimized for desktop and mobile devices
- **PWA Support**: Install as a standalone app on any device

## 🚀 Getting Started

### Quick Setup
1. Open `index.html` in your web browser
2. Configure your daily rate in settings
3. Start tracking work by clicking "Mark as Done"
4. Manage payments when ready to collect earnings

### Settings Configuration
- **Daily Rate**: Set your earnings per work day
- **Payment Duration**: Configure days before payment collection
- **Theme Preferences**: Choose your preferred color scheme
- **App Customization**: Adjust increment values and maximum payments

## 💻 Technical Details

### Architecture
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Storage**: Local browser storage (IndexedDB)
- **PWA**: Service worker for offline functionality
- **Charts**: Chart.js for analytics visualization

### Browser Support
- Chrome/Chromium 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Privacy & Security
- **Local Storage Only**: All data stays on your device
- **No Tracking**: No external analytics or data collection
- **Offline Support**: Works without internet connection
- **Data Control**: Full control over your work and payment data

## 📱 Installation

### As a Web App
1. Visit the application URL
2. Look for "Install App" option in your browser
3. Follow browser-specific installation prompts

### Manual Setup
1. Download or clone the repository
2. Serve files through a local web server
3. Access through `http://localhost:PORT`

## 🛠️ Development

### File Structure
```
web/
├── index.html          # Main application file
├── manifest.json       # PWA manifest
├── sw.js              # Service worker
├── css/
│   └── style.css      # Application styles
├── js/
│   ├── app.js         # Main application logic
│   ├── database.js    # Data management
│   ├── utils.js       # Utility functions
│   ├── calendar.js    # Calendar functionality
│   ├── charts.js      # Analytics charts
│   ├── constants.js   # Configuration constants
│   └── notifications.js # Toast notifications
└── assets/            # Icons and images
```

### Key Components
- **App Controller**: Main application state management
- **Database Layer**: IndexedDB for persistent storage
- **UI Components**: Modular interface elements
- **Notification System**: Toast-based user feedback
- **Theme System**: Dynamic color scheme management

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues, feature requests, or questions, please open an issue in the repository.

---

**R-Service Tracker** - Efficient work tracking made simple.