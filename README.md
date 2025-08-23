# 🚗 R-Service Tracker

A premium, modern web application for tracking daily driving service work and earnings. Built with cutting-edge web technologies and Material Design principles.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![PWA](https://img.shields.io/badge/PWA-enabled-orange.svg)

## ✨ Features

### 📊 Core Functionality
- **One-Click Work Recording**: Record your daily driving work with a single tap
- **Smart Payment Calculation**: Automatic calculation of earnings (₹25/day, ₹100 after 4 consecutive days)
- **Payment Notifications**: Get notified when you reach payment milestones
- **Daily Strike Counter**: Visual progress indicator for consecutive work days

### 📈 Analytics & Insights
- **Advanced Charts**: Interactive charts showing earnings trends, weekly performance, and monthly summaries
- **Calendar Integration**: Visual calendar view with work history
- **Comprehensive Statistics**: Total days worked, pending amounts, total received, current streak
- **Historical Data**: Organized by weeks and months for easy tracking

### 🎨 User Experience
- **Premium Material Design**: Modern, responsive UI with MDUI components
- **Dark/Light Theme**: Toggle between themes with smooth transitions
- **Progressive Web App**: Install on your device for native app-like experience
- **Offline Capability**: Works without internet connection using IndexedDB storage
- **Responsive Design**: Optimized for all screen sizes

### 📤 Export & Sharing
- **PDF Export**: Generate comprehensive reports in PDF format
- **Email Export**: Send reports via email (coming soon)
- **Data Management**: Clear history option with confirmation

### 🔧 Technical Features
- **IndexedDB Storage**: Reliable local data storage
- **Service Worker**: Offline functionality and caching
- **Chart.js Integration**: Beautiful, interactive charts
- **Premium Typography**: Inter font family for better readability

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No installation required - runs in browser

### Installation

#### Option 1: Direct Use
1. Open `index.html` in your web browser
2. Allow location access if prompted
3. Start tracking your work immediately!

#### Option 2: Deploy to Web Server
1. Upload all files to your web server
2. Ensure HTTPS is enabled for PWA features
3. Access via your domain

#### Option 3: GitHub Pages / Cloudflare Pages
1. Push the repository to GitHub
2. Enable GitHub Pages or deploy to Cloudflare Pages
3. Access via the provided URL

### PWA Installation
- **Desktop**: Click the install button in your browser's address bar
- **Mobile**: Tap "Add to Home Screen" in your browser menu

## 📱 Usage

### Recording Work
1. Open the application
2. Click the large "Mark Work Done" button
3. Confirm your work for the day
4. View updated statistics and strike counter

### Viewing Analytics
1. Open the navigation menu (hamburger icon)
2. Select "Analytics"
3. Explore various charts and trends
4. Export data if needed

### Managing History
1. Navigate to "History" section
2. View work organized by weeks and months
3. Check payment status for each day
4. Clear history if needed (with confirmation)

### Exporting Data
1. Use the PDF export feature for reports
2. Access via menu or floating action button
3. Save or share the generated PDF

## 🎯 Payment System

The application implements a unique payment tracking system:

- **Daily Wage**: ₹25 per day worked
- **Payment Threshold**: Every 4 consecutive days = ₹100 payment
- **Automatic Tracking**: Pending amounts are automatically calculated
- **Payment Notifications**: Get notified when you reach payment milestones

### Example Payment Flow
- Day 1: Work recorded → ₹25 pending
- Day 2: Work recorded → ₹50 pending  
- Day 3: Work recorded → ₹75 pending
- Day 4: Work recorded → ₹100 **PAYMENT DUE** 🎉

## 🛠️ Technology Stack

### Frontend
- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Advanced styling with CSS Grid, Flexbox, and animations
- **JavaScript (ES6+)**: Modern JavaScript with async/await, classes, and modules

### Frameworks & Libraries
- **MDUI 2.0**: Material Design UI components
- **Chart.js**: Interactive data visualization
- **jsPDF**: PDF generation
- **Inter Font**: Premium typography

### Storage & Performance
- **IndexedDB**: Client-side database for offline storage
- **Service Worker**: Caching and offline functionality
- **PWA Manifest**: Native app-like installation

### Build & Deployment
- **No Build Process**: Vanilla web technologies for simplicity
- **CDN Dependencies**: Fast loading from reliable CDNs
- **Progressive Enhancement**: Works on all modern browsers

## 📊 Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 60+ | ✅ Full |
| Firefox | 55+ | ✅ Full |
| Safari | 11+ | ✅ Full |
| Edge | 79+ | ✅ Full |
| Mobile Chrome | 60+ | ✅ Full |
| Mobile Safari | 11+ | ✅ Full |

## 🎨 Customization

### Theming
The application supports extensive theming through CSS custom properties:

```css
:root {
  --primary-color: #1976d2;
  --secondary-color: #388e3c;
  --accent-color: #ff5722;
  /* ... more variables */
}
```

### Payment Configuration
Modify payment settings in `app.js`:

```javascript
constructor() {
    this.dailyWage = 25; // Change daily wage
    this.paymentThreshold = 4; // Change consecutive days required
}
```

## 📂 File Structure

```
r-service-tracker/
├── index.html          # Main HTML file
├── app.js              # Application logic
├── styles.css          # Enhanced styling
├── manifest.json       # PWA manifest
├── sw.js              # Service Worker
├── README.md          # Documentation
└── icons/             # PWA icons (to be added)
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    └── icon-512x512.png
```

## 🔒 Privacy & Security

- **Local Storage**: All data stored locally on your device
- **No Server**: No data sent to external servers
- **Offline First**: Works without internet connection
- **Privacy Focused**: Your earning data stays private

## 🚧 Future Enhancements

- [ ] Email export functionality
- [ ] Data backup and restore
- [ ] Multiple currency support
- [ ] Advanced reporting features
- [ ] Goal setting and tracking
- [ ] Integration with calendar apps
- [ ] Voice commands for work recording
- [ ] Multi-language support

## 🐛 Troubleshooting

### Common Issues

**App not loading properly**
- Clear browser cache and reload
- Ensure JavaScript is enabled
- Check browser console for errors

**Data not saving**
- Ensure IndexedDB is supported and enabled
- Check available storage space
- Try incognito/private mode

**Charts not displaying**
- Verify Chart.js CDN is accessible
- Check network connection
- Reload the page

**PWA not installing**
- Ensure HTTPS is enabled
- Check manifest.json is accessible
- Verify service worker registration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review the GitHub issues page
3. Create a new issue with detailed information

## 🙏 Acknowledgments

- Material Design team for the design system
- MDUI developers for the excellent component library
- Chart.js team for the visualization library
- Inter font family designers
- The web development community for inspiration

---

**Built with ❤️ for service drivers everywhere**

*Happy tracking! 🚗💰*