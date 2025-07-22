# Contributing to SparkBoard

Thank you for your interest in contributing to SparkBoard! This guide will help you get started with contributing to this open-source collaborative whiteboard project.

## 🚀 Quick Start for Contributors

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/sparkboard.git
   cd sparkboard
   ```
3. **Follow the setup instructions** in the [README](README.md#local-development-setup)
4. **Create a new branch** for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 🛠️ Development Workflow

### Setting Up Your Development Environment

1. **Prerequisites**: Ensure you have Node.js (v18+), Docker, and Supabase CLI installed
2. **Local Backend**: Start Supabase locally with `cd supabase && make db-local`
3. **Database**: Apply migrations with `make migrate-local`
4. **Frontend**: Install dependencies with `cd ../web && npm install`
5. **Development Server**: Start with `npm run dev`

### Code Style and Standards

- **TypeScript**: All new code should be written in TypeScript
- **ESLint**: Run `npm run lint` before committing
- **Formatting**: Code is automatically formatted with Prettier
- **Conventions**: Follow existing patterns in the codebase
  - Use functional components with hooks
  - Prefer composition over inheritance
  - Keep components small and focused
  - Use meaningful variable and function names

### Testing

- **Manual Testing**: Test your changes in the browser before submitting
- **Integration Testing**: Ensure your changes work with the existing features
- **Cross-browser Testing**: Test in Chrome, Firefox, and Safari if possible

## 📝 Pull Request Process

1. **Create a Pull Request** from your fork to the main repository
2. **Fill out the PR template** with:
   - Clear description of changes
   - Screenshots/videos for UI changes
   - Testing checklist
   - Related issues (if any)
3. **Ensure all checks pass**:
   - Linting passes (`npm run lint`)
   - Build succeeds (`npm run build`)
   - No TypeScript errors
4. **Request review** from maintainers
5. **Address feedback** promptly and professionally

### PR Title Format
Use conventional commits format:
- `feat: add new whiteboard element type`
- `fix: resolve cursor sync issue in collaboration`
- `docs: update setup instructions`
- `refactor: improve performance of canvas rendering`

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Clear title** describing the issue
2. **Steps to reproduce** the problem
3. **Expected vs actual behavior**
4. **Browser and OS information**
5. **Screenshots or videos** if applicable
6. **Console errors** (if any)

Use our bug report template when creating issues.

## 💡 Suggesting Features

For feature requests:

1. **Check existing issues** to avoid duplicates
2. **Describe the problem** you're trying to solve
3. **Propose a solution** with details
4. **Consider the scope** - does it fit the project goals?
5. **Add mockups or examples** if helpful

## 🎯 Areas for Contribution

### High Priority
- **Performance optimization** for large whiteboards
- **Mobile responsiveness** improvements
- **Accessibility** enhancements
- **Documentation** and tutorials

### Medium Priority
- **New element types** (diagrams, charts, etc.)
- **Export functionality** (PDF, PNG, SVG)
- **Keyboard shortcuts** expansion
- **Templates and presets**

### Advanced Features
- **Plugin system** for third-party integrations
- **Advanced collaboration** features
- **API development** for external tools
- **Real-time performance** improvements

## 🏗️ Project Architecture

### Frontend Structure
```
web/src/
├── app/                 # Next.js app router pages
├── components/          # React components
│   ├── whiteboard/     # Whiteboard-specific components
│   └── ...
├── hooks/              # Custom React hooks
├── store/              # Zustand state management
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

### Key Technologies
- **Next.js 15** with App Router
- **React 19** with modern hooks
- **Konva.js** for canvas rendering
- **Supabase** for backend services
- **Zustand** for state management
- **Tailwind CSS** for styling

### Database Schema
- Projects contain multiple boards
- Boards contain elements and tasks
- Real-time collaboration through Supabase
- Row-level security (RLS) for access control

## 🤝 Community Guidelines

### Code of Conduct
- **Be respectful** and inclusive
- **Help others** learn and grow
- **Give constructive feedback**
- **Focus on the code**, not the person
- **Celebrate diverse perspectives**

### Communication
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For general questions and ideas
- **Pull Requests**: For code review and discussion

## 🔍 Getting Help

- **Documentation**: Start with the README and this guide
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Code Review**: Don't hesitate to ask for feedback early

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Konva.js Documentation](https://konvajs.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## ⭐ Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Project documentation credits

Thank you for contributing to SparkBoard! Your efforts help make collaborative whiteboarding better for everyone. 🎨✨