# R-Service Tracker

A premium, modern, and responsive web application for drivers to track their daily work and monitor earnings. Built with Material Design 3 principles using MDUI framework.

## 🚀 Features

### Core Functionality
- **Daily Work Tracking**: One-click button to mark daily work completion
- **Automatic Earnings Calculation**: ₹25 per day with automatic balance tracking
- **Payment Notifications**: Alerts when reaching ₹100 (4 consecutive days)
- **One-Day Limit**: Prevents multiple clicks per day for accurate tracking

### Analytics & Reporting
- **Advanced Charts**: Visual representation of earnings over time using Chart.js
- **Period Segmentation**: Data organized by weeks and months
- **Statistics Dashboard**: Current balance, streaks, and performance metrics
- **Trend Analysis**: 30-day earnings chart with insights

### Export Capabilities
- **PDF Export**: Generate professional balance sheets using jsPDF
- **Email Export**: Share earnings data via email
- **Print Support**: Optimized printing layouts

### User Experience
- **Material Design 3**: Premium UI with MDUI components
- **Dark/Light Theme**: Toggle between themes with persistent settings
- **Responsive Design**: Works perfectly on all device sizes
- **Progressive Web App**: Installable with offline support
- **Premium Typography**: Inter font for modern aesthetics

### Data Management
- **IndexedDB Storage**: Local data persistence without server dependency
- **Offline Support**: Full functionality without internet connection
- **Data Security**: All data stored locally on user's device
- **Export/Import**: Easy data backup and recovery options

## 🛠️ Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: MDUI 3 (Material Design)
- **Database**: IndexedDB for local storage
- **Charts**: Chart.js for data visualization
- **PDF Generation**: jsPDF library
- **PWA**: Service Worker for offline functionality
- **Typography**: Google Fonts (Inter)
- **Icons**: Material Icons & Material Symbols

## 📱 Installation & Setup

### Quick Start
1. Download or clone the project
2. Extract files to your web server directory
3. Open `index.html` in a modern web browser
4. Start tracking your daily work!

### Local Development
```bash
# Clone the repository
git clone https://github.com/feherfiemer/Work.git

# Navigate to the web folder
cd Work/web

# Serve using a local server (recommended)
python -m http.server 8000
# or
npx serve .

# Open in browser
open http://localhost:8000
```

### Deployment Options

#### Cloudflare Pages
1. Push the `web` folder contents to your GitHub repository
2. Connect your GitHub repo to Cloudflare Pages
3. Set build settings:
   - Build command: (leave empty)
   - Build output directory: `/`
4. Deploy automatically

#### Other Hosting Platforms
- **Netlify**: Drag and drop the `web` folder
- **Vercel**: Import from GitHub repository
- **GitHub Pages**: Enable Pages in repository settings
- **Firebase Hosting**: Use Firebase CLI to deploy

## 🎯 Usage Guide

### Daily Tracking
1. Open the application
2. View today's date on the main card
3. Click "Mark Complete" button to record your work
4. Button becomes disabled after first click (one per day)
5. Balance automatically updates with ₹25

### Payment Notifications
- Every 4 days of work (₹100), you'll receive a notification
- Payment day alerts help you know when to collect earnings
- Track progress with "until next payment" indicator

### Viewing Analytics
1. Click "View Analytics" or use the menu
2. See 30-day earnings chart
3. View statistics: total earned, average per day, streak
4. Analyze trends and patterns in your work

### Exporting Data
1. Use "Export PDF" for professional balance sheets
2. "Export via Email" to share data
3. All exports include complete work history
4. Organized by date with totals and statistics

### Menu Features
- **Theme Toggle**: Switch between light and dark modes
- **History**: View complete work history by month
- **Analytics**: Detailed charts and statistics
- **Export Data**: PDF and email export options
- **Clear Data**: Reset all data (with confirmation)
- **About**: App information and version details

## 🎨 Customization

### Changing Daily Wage
Edit `app.js` and modify:
```javascript
this.dailyWage = 25; // Change to your desired amount
```

### Changing Payment Threshold
Edit `app.js` and modify:
```javascript
this.paymentThreshold = 100; // Change to your desired threshold
```

### Theme Customization
Edit `styles.css` CSS variables:
```css
:root {
    --primary-color: #6750A4; /* Your brand color */
    --success-color: #4CAF50;  /* Success/earnings color */
    /* ... other colors */
}
```

## 📱 Progressive Web App Features

### Installation
- Add to home screen on mobile devices
- Desktop installation available in supported browsers
- Works offline after initial load

### Offline Support
- All core functionality works without internet
- Data stored locally using IndexedDB
- Service Worker caches resources

### Performance
- Fast loading with resource caching
- Optimized for mobile and desktop
- Minimal data usage

## 🔧 Browser Support

### Recommended Browsers
- Chrome 80+ (full support)
- Firefox 75+ (full support)
- Safari 13+ (full support)
- Edge 80+ (full support)

### Required Features
- IndexedDB support
- ES6+ JavaScript support
- CSS Grid and Flexbox
- Service Worker support (for PWA features)

## 🚀 Performance Features

### Optimization
- Minimal external dependencies
- Efficient CSS with modern features
- Lazy loading where applicable
- Optimized images and assets

### Accessibility
- WCAG 2.1 compliant
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support
- Reduced motion support

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support, feature requests, or bug reports:
- Create an issue on GitHub
- Email: [your-email@domain.com]

## 🎉 Acknowledgments

- **MDUI Framework** for Material Design components
- **Chart.js** for beautiful charts
- **jsPDF** for PDF generation
- **Google Fonts** for premium typography
- **Material Icons** for consistent iconography

## 📋 Version History

### v1.0.0 (Current)
- Initial release
- Core tracking functionality
- Analytics and charts
- PDF/Email export
- PWA support
- Dark/Light theme
- Responsive design

---

**Made with ❤️ for drivers who want to track their work efficiently**