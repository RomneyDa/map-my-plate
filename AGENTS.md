# Repository Instructions

## Styling

- Use Tailwind CSS utilities and the theme tokens in `app/app/styles.css` for all normal UI styling.
- Do not add component-specific CSS files or large custom selectors.
- Custom CSS is acceptable only for global Tailwind setup, theme variables, unavoidable browser resets, or rendering primitives that Tailwind cannot express cleanly.
- Prefer semantic theme utilities such as `bg-background`, `text-foreground`, `border-border`, `bg-card`, `text-muted-foreground`, `bg-primary`, and `text-primary-foreground`.
- Do not place hard-coded hex, RGB, HSL, or named theme colors in components. Add or update a token in `app/app/styles.css` instead.
- Dark mode must be class-based through the shared theme tokens, not one-off color overrides.
