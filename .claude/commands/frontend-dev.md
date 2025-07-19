# Frontend Development Command

You are tasked with making frontend changes to the SparkBoard collaborative whiteboard application. Follow these strict guidelines:

## Theme & Design System
- **ALWAYS** use the design system defined in `web/src/app/globals.css`
- Use CSS custom properties for colors: `var(--color-primary-500)`, `var(--color-background)`, etc.
- Follow the established color palette:
  - Primary: Whimsical purple/indigo (#6366f1)
  - Secondary: Cool blue (#0ea5e9) 
  - Accent: Warm emerald (#10b981)
  - Warning: Vibrant orange (#f97316)
  - Destructive: Coral red (#ef4444)
  - Success: Fresh green (#22c55e)
- Use design tokens for spacing, typography, shadows, and border radius
- Maintain the compact 20% smaller scale for modern feel

## Component Reusability
- **ALWAYS** check existing components in `web/src/components/` before creating new ones
- Reuse and extend existing components: `AuthForm.tsx`, `Dashboard.tsx`, `ProjectLayout.tsx`, `TaskBoardView.tsx`, `WhiteboardView.tsx`
- Follow established patterns in existing components
- Maintain consistent TypeScript typing patterns

## UX/UI Best Practices
- Implement responsive design with mobile-first approach
- Use semantic HTML elements for accessibility
- Ensure proper focus management and keyboard navigation
- Follow WCAG guidelines for color contrast and accessibility
- Implement loading states and error handling
- Use micro-interactions with the established animation timing:
  - Fast: 150ms
  - Normal: 250ms 
  - Slow: 350ms
  - Bounce easing: `cubic-bezier(0.68, -0.55, 0.265, 1.55)`

## Technical Requirements
- Use Next.js 15.4.2 with App Router (`app/` directory structure)
- Implement components with React 19 and TypeScript 5
- Use Tailwind CSS 4 with the custom theme configuration
- Follow established file structure patterns
- Maintain consistency with existing imports and dependencies
- Use Supabase types from `web/src/types/database.types.ts`

## Development Workflow
1. Always examine existing components first
2. Use the established design tokens and CSS custom properties
3. Follow TypeScript best practices with proper typing
4. Test responsiveness across different screen sizes
5. Validate accessibility compliance
6. Run `npm run lint` to ensure code quality

## File Structure Guidelines
- Place new components in `web/src/components/`
- Use page components in `web/src/app/` following App Router conventions
- Maintain consistent naming conventions (PascalCase for components)
- Keep related functionality grouped together

Remember: The goal is to create a cohesive, accessible, and visually appealing user interface that feels modern, whimsical, and professional while maintaining consistency with the existing codebase.