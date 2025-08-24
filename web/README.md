# R-Service Tracker

A premium, modern, and responsive job tracking application designed to help you track your daily work and manage earnings efficiently.

![R-Service Tracker](assets/favicon.svg)

## 🌟 Features

### Core Functionality
- **Daily Work Tracking**: Mark your work as done with a single click (₹25 per day)
- **One-Click Per Day**: Prevents multiple submissions on the same day
- **Automatic Payment Calculation**: Accumulates wages and enables payment after 4 consecutive work days (₹100)
- **Payment Management**: Record payments with automatic balance tracking
- **Work History**: Complete history of all work days with dates and wages

### User Interface
- **Premium Design**: Modern, aesthetic UI with Inter font
- **Multiple Themes**: Orange & Blue themes with light/dark mode variants
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Smooth Animations**: Premium loading screen and UI animations
- **Blur Effects**: Modern glassmorphism design elements
- **18px Border Radius**: Consistent rounded corners throughout

### Advanced Features
- **Balance Sheet**: Detailed view organized by weeks and months
- **Analytics & Charts**: Advanced charts showing earnings trends and work patterns
- **Calendar Integration**: Visual calendar showing work history and payment status
- **Daily Streak Tracking**: Monitor consecutive work days
- **PDF Export**: Export balance sheets and reports to PDF
- **Browser Notifications**: Get notified about paydays and milestones
- **Sound Effects**: Audio feedback for done and payment actions
- **Data Persistence**: Uses IndexedDB for offline data storage

### Data Management
- **IndexedDB Storage**: Reliable offline data storage
- **Data Export/Import**: Backup and restore your data
- **Clear Data Option**: Reset all data with confirmation
- **Automatic Backup**: Data persists across browser sessions

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Local storage access

### Installation

1. **Clone or Download** the project files
2. **Extract** to your desired directory
3. **Open** `index.html` in your web browser

### First Time Setup

1. **Grant Notification Permission**: Allow notifications for payday alerts
2. **Choose Theme**: Select your preferred theme from the settings menu
3. **Start Tracking**: Click "Mark as Done" when you complete work

## 📖 How to Use

### Daily Work Tracking

1. **Mark Work as Done**:
   - Click the "Mark as Done" button on the dashboard
   - You earn ₹25 for each completed day
   - Button is disabled after clicking to prevent duplicate entries

2. **Payment Process**:
   - After 4 days of work, you'll receive a payday notification
   - The "Mark as Paid" button will appear
   - Click to record your ₹100 payment
   - Balance and history are automatically updated

### Navigation

#### Dashboard
- **Today's Status**: Shows current date and work status
- **Earnings**: Current balance, days worked, and total earned
- **Progress**: Visual progress bar to next payday
- **Quick Actions**: Access to main features

#### Side Menu (Top Right)
- **Theme Options**: Switch between orange/blue and light/dark themes
- **History**: View work history and analytics
- **Data Management**: Export PDF or clear all data
- **About**: App information and version details

### Features Overview

#### Balance Sheet
- Detailed table of all work days
- Filter by month and year
- Shows date, day of week, status, wage, and payment status
- Sortable and searchable

#### Analytics
- **Earnings Chart**: Monthly earnings trend line
- **Work Days Chart**: Bar chart showing work days vs earnings vs payments
- **Statistics**: Comprehensive stats including streak and growth

#### Calendar
- Visual monthly calendar
- Color-coded work days (green = worked, blue = paid)
- Click any date for detailed information
- Navigate between months with arrow buttons

#### Export Options
- **PDF Export**: Generate detailed reports
- **Data Backup**: Export all data as JSON
- **Shareable Links**: Generate links with basic stats

## 🎨 Themes

### Available Themes
1. **Orange Light**: Orange primary with light background
2. **Orange Dark**: Orange primary with dark background  
3. **Blue Light**: Blue primary with light background
4. **Blue Dark**: Blue primary with dark background

### Theme Features
- Automatic chart color adaptation
- Consistent UI element theming
- Saved preference across sessions
- Smooth transitions between themes

## 🔧 Technical Details

### Technologies Used
- **HTML5**: Semantic markup and modern features
- **CSS3**: Advanced styling with CSS variables and animations
- **JavaScript ES6+**: Modern JavaScript with classes and async/await
- **IndexedDB**: Client-side database for data persistence
- **Chart.js**: Interactive charts and data visualization
- **jsPDF**: PDF generation and export
- **Font Awesome**: Icon library
- **Google Fonts**: Inter font family

### Browser Support
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

### Performance Features
- **Lazy Loading**: Components load as needed
- **Efficient Rendering**: Optimized DOM updates
- **Minimal Bundle**: No unnecessary dependencies
- **Responsive Images**: Optimized for all screen sizes

## 📱 Responsive Design

### Breakpoints
- **Mobile**: ≤ 480px
- **Tablet**: 481px - 768px
- **Desktop**: 769px - 1024px
- **Large Desktop**: ≥ 1025px

### Mobile Optimizations
- Touch-friendly button sizes
- Swipe gestures for navigation
- Optimized menu layout
- Compressed data views

## 🔔 Notifications

### Types of Notifications
- **Payday Alerts**: When you've earned ₹100
- **Work Completion**: Confirmation when marking work done
- **Payment Recording**: Confirmation when recording payments
- **Milestone Achievements**: Streak and earnings milestones
- **Error Messages**: User-friendly error notifications

### Notification Settings
- Browser permission requested on first visit
- Fallback to in-app toasts if permission denied
- Customizable notification preferences

## 💾 Data Management

### Storage
- **Primary**: IndexedDB for structured data
- **Settings**: LocalStorage for preferences
- **Capacity**: Virtually unlimited storage

### Data Structure
```javascript
// Work Records
{
  date: "2024-01-15",
  wage: 25,
  status: "completed",
  timestamp: "2024-01-15T10:30:00.000Z",
  month: 1,
  year: 2024
}

// Payments
{
  amount: 100,
  workDates: ["2024-01-15", "2024-01-16", "2024-01-17", "2024-01-18"],
  paymentDate: "2024-01-18",
  timestamp: "2024-01-18T15:30:00.000Z"
}
```

### Backup & Restore
- **Export**: Download complete data as JSON
- **Import**: Restore from backup file
- **Clear**: Remove all data with confirmation

## 🎯 Payment Logic

### Earning System
- **Daily Wage**: ₹25 per completed work day
- **Payment Threshold**: Every 4 consecutive work days
- **Payment Amount**: ₹100 (4 days × ₹25)

### Payment Process
1. Complete 4 days of work
2. Receive payday notification
3. "Mark as Paid" button appears
4. Click to record payment
5. Balance resets for next cycle

### Balance Calculation
- **Current Balance**: Unpaid earnings
- **Total Earned**: All-time earnings
- **Total Paid**: All recorded payments

## 🏆 Achievements & Milestones

### Streak System
- **Daily Streak**: Consecutive work days
- **Milestone Notifications**: Weekly streak achievements
- **Streak Reset**: Breaks when missing a day

### Earnings Milestones
- ₹500, ₹1000, ₹2500, ₹5000 achievements
- Special notifications for milestones
- Progress tracking in analytics

## 🐛 Troubleshooting

### Common Issues

1. **Notifications Not Working**:
   - Check browser permission settings
   - Ensure notifications are enabled for the site
   - Try refreshing the page

2. **Data Not Saving**:
   - Check if JavaScript is enabled
   - Ensure sufficient storage space
   - Try clearing browser cache

3. **Charts Not Loading**:
   - Check internet connection for Chart.js library
   - Ensure JavaScript is enabled
   - Try refreshing the page

4. **PDF Export Failing**:
   - Check internet connection for jsPDF library
   - Ensure popup blockers are disabled
   - Try using a different browser

### Browser Compatibility
- Enable JavaScript
- Allow local storage
- Grant notification permissions
- Disable ad blockers if experiencing issues

## 🔐 Privacy & Security

### Data Privacy
- **Local Storage**: All data stored locally in your browser
- **No Server Communication**: No data sent to external servers
- **Offline Functionality**: Works completely offline
- **User Control**: Full control over your data

### Security Features
- **Data Validation**: Input validation and sanitization
- **Error Handling**: Graceful error recovery
- **Safe Export**: Secure data export functionality

## 🚀 Future Enhancements

### Planned Features
- **PWA Support**: Install as mobile app
- **Cloud Sync**: Optional cloud backup
- **Team Collaboration**: Multi-user support
- **Advanced Reports**: More detailed analytics
- **Goal Setting**: Work targets and goals
- **Time Tracking**: Detailed time logging

### Version History
- **v1.0.0**: Initial release with core features

## 🤝 Contributing

### Development Setup
1. Clone the repository
2. Open in your preferred editor
3. Use Live Server for development
4. Test across different browsers

### Guidelines
- Follow existing code style
- Test on multiple devices
- Update documentation
- Ensure accessibility compliance

## 📞 Support

### Getting Help
- Check this README for common solutions
- Review browser console for error messages
- Ensure all requirements are met

### Reporting Issues
When reporting issues, please include:
- Browser and version
- Operating system
- Steps to reproduce
- Expected vs actual behavior

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **Font Awesome** for icons
- **Google Fonts** for Inter typography
- **Chart.js** for data visualization
- **jsPDF** for PDF generation

---

**R-Service Tracker v1.0.0** - Built with ❤️ for efficient work tracking and payment management.

Visit our website: [R-Service Tracker](https://your-domain.com)