# My Anime Gallery

![Banner](public/images/banner.jpg)

[中文](README.md) | English

## 1. Project Overview

My Anime Gallery is a comprehensive anime collection management desktop application developed with modern technologies, featuring exquisite 3D page-flipping effects and rich anime resource management capabilities. The application supports EPUB reading, image cropping and editing, intelligent search, and AI-assisted features, helping users efficiently manage and enjoy their anime collections.

## 2. Core Features

### 2.1 Anime Collection Management
- Complete anime entry creation, editing, and deletion functionality
- Support for multi-field information management (title, alias, description, tags, etc.)
- Local SQLite database storage for secure data management
- Data import/export functionality for easy data migration and backup

### 2.2 Media Browsing and Reading
- 3D page-flipping book effect for immersive browsing experience
- Built-in EPUB reader for manga/novel reading
- Image cropping and cover editing capabilities
- Support for importing multiple image formats

### 2.3 Intelligent Search and Classification
- Powerful search functionality supporting multi-dimensional searches by title, tags, etc.
- Seamless switching between entry list and detail pages
- Support for custom tag management

### 2.4 AI-Assisted Features
- Automatic generation of anime description copy
- Smart recommendations for similar anime works
- AI conversational interaction for anime-related information queries
- Configurable AI API key management

### 2.5 User Experience Optimization
- Dark/light theme switching
- Responsive design adapting to different screen sizes
- Intuitive graphical user interface
- Multi-language support (Chinese, English, Japanese)

## 3. Technical Architecture

### 3.1 Frontend Technology Stack
- **Framework**: Vue 3 + Composition API
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Internationalization**: Vue I18n
- **3D Effects**: PageFlip.js
- **EPUB Reading**: EPUB.js

### 3.2 Backend Technology Stack
- **Runtime**: Node.js
- **Desktop Framework**: Electron 25
- **Database**: SQLite + TypeORM
- **AI Services**: Integration with third-party AI APIs

### 3.3 Project Structure
```
├── database/          # Database-related files
│   └── entity/        # Data entity definitions
├── docs/              # Documentation resources
├── public/            # Static resources
├── src/               # Source code
│   ├── assets/        # Styles and font resources
│   ├── components/    # Vue components
│   ├── locales/       # Multi-language configurations
│   ├── services/      # Service layer
│   ├── App.vue        # Root component
│   └── main.js        # Entry file
├── electron.main.js   # Electron main process
├── package.json       # Project configuration
└── vite.config.js     # Vite configuration
```

## 4. Installation Guide

### 4.1 Development Environment Requirements
- Node.js >= 16.x
- npm >= 8.x
- Git

### 4.2 Development Mode Installation

```bash
# Clone the repository
git clone https://github.com/SpacervalLam/My-Anime-Gallery.git

# Navigate to the project directory
cd My-Anime-Gallery

# Install dependencies
npm install

# Start development mode
npm run serve
```

### 4.3 Production Build

```bash
# Build the application
npm run build

# Generate installer
npm run dist
```

After successful build, the installer will be generated in the `dist` directory.

## 5. Usage Instructions

### 5.1 Basic Operations

1. **Application Launch**: After running the installer or starting in development mode, the application will display the cover page
2. **Menu Access**: Click the menu button in the upper right corner or hover over the top of the screen to access the menu bar
3. **Page Navigation**: Use the navigation buttons on both sides of the page to flip pages
4. **Entry Management**:
   - Click the "Add" button on the entry list page to create a new entry
   - Click an existing entry to view its details
   - Click the "Edit" button on the detail page to modify entry information

### 5.2 Advanced Features

1. **Data Import/Export**:
   - Select "Export Data" from the menu bar to export current collections
   - Select "Import Data" to import collections from external files
   - Support selective export of entries and media resources

2. **AI Function Configuration**:
   - Select "AI Config" from the menu bar to open the AI settings panel
   - Enter a valid AI API key
   - Adjust AI function parameters as needed

3. **Theme Switching**:
   - Switch between dark/light themes in the settings panel
   - Support for automatic system theme following

## 6. Contribution Guidelines

### 6.1 Development Process

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 6.2 Code Standards

- Follow Vue 3 best practices
- Use ESLint for code checking
- Maintain consistent code style
- Write test cases for new features

### 6.3 Commit Message Conventions

- Use semantic commit messages
- Commit message format: `type(scope): description`
  - type: feat, fix, docs, style, refactor, test, chore
  - scope: optional, specifies the modification scope
  - description: clearly describes the modification content

## 7. License

This project is licensed under the MIT License. For details, please see the [LICENSE](LICENSE) file.

## 8. Contact Information

- Project URL: [https://github.com/SpacervalLam/My-Anime-Gallery](https://github.com/SpacervalLam/My-Anime-Gallery)
- Issue Reporting: [GitHub Issues](https://github.com/SpacervalLam/My-Anime-Gallery/issues)

## 9. Changelog

For detailed update records, please refer to the [CHANGELOG.md](CHANGELOG.md) file.

---

© 2025 SpacervalLam. All rights reserved.
