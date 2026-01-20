# UI Components & CSS Guidelines

## Core Principles

1. **Create reusable components first** — Before building any UI, check if a component already exists in `src/components/`. If not, create a new modular component that can be reused.

2. **Use CSS Modules** — Every component gets its own `.module.css` file. No inline styles, no global CSS for component-specific styling.

3. **Use design tokens** — All colors, radii, and spacing come from `src/styles/design-tokens.css`. Never hardcode colors like `#ffffff` or `#1a78c2`. Always use `var(--color-*)` and `var(--radius-*)` tokens.

## Component Structure

Each component lives in its own folder:
```
src/components/ComponentName/
├── ComponentName.tsx
├── ComponentName.module.css
└── index.ts (optional)
```

## Existing Components to Use

Before creating new UI, use these existing primitives:

- **Button** (`@/components/Button/Button`) — variants: `primary`, `secondary`, `ghost`
- **IconButton** (`@/components/IconButton/IconButton`) — sizes: `small`, `medium`; variants: `default`, `ghost`
- **Dropdown** (`@/components/Dropdown/Dropdown`) — for menus and popovers
- **BottomSheet** (`@/components/BottomSheet/BottomSheet`) — for mobile action sheets

## Design Token Reference

See `#[[file:src/styles/design-tokens.css]]` for all available tokens. Key ones:

- Colors: `--color-accent`, `--color-text-primary`, `--color-bg-primary`, `--color-border-medium`
- Radii: `--radius-sm` (6px), `--radius-md` (8px), `--radius-lg` (12px), `--radius-btn`

## CSS Conventions

- Transitions: `0.15s ease`
- Hover states: `:hover:not(:disabled)`
- Disabled: `opacity: 0.6; cursor: not-allowed;`
- Focus: Include `focus-visible` outline for accessibility
- Mobile breakpoint: `768px`
- Icons: Lucide React with `strokeWidth={1.5}`

## Don't Do

- Hardcode colors
- Create one-off button styles (use Button component)
- Skip hover/disabled/focus states
- Use inline styles for layout
- Forget `onClick={(e) => e.stopPropagation()}` on modal content divs
