# Scribo Design System Rules

This document defines the styling conventions and patterns for the Scribo application. Always follow these rules when creating or modifying UI components.

## Design Tokens

All styles should use CSS custom properties from `src/styles/design-tokens.css`. Never hardcode colors or values that exist as tokens.

### Colors

**Brand/Accent:**
- Primary accent: `var(--color-accent)` (#1a78c2)
- Accent hover: `var(--color-accent-hover)` (#1565a8)
- Accent light bg: `var(--color-accent-light)`
- Accent medium bg: `var(--color-accent-medium)`

**Text:**
- Primary text: `var(--color-text-primary)` (#1a1a1a)
- Secondary text: `var(--color-text-secondary)` (#666)
- Tertiary text: `var(--color-text-tertiary)` (#888)
- Muted text: `var(--color-text-muted)` (#999)

**Backgrounds:**
- Primary bg: `var(--color-bg-primary)` (#ffffff)
- Secondary bg: `var(--color-bg-secondary)` (#fafafa)
- Tertiary bg: `var(--color-bg-tertiary)` (#f9fafb)
- Hover bg: `var(--color-bg-hover)` (#f3f4f6)

**Borders:**
- Default border: `var(--color-border-light)` (#e5e7eb)
- Medium border: `var(--color-border-medium)` (#d1d5db)
- Showcase border: #c7c7c7

**Semantic:**
- Success: `var(--color-success)` (#10b981)
- Danger/Error: #dc2626

## Button Styles

### Icon Button (Small, 20px)
```css
.iconButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: #ffffff;
  border: 1px solid #b3b3b3;
  border-radius: var(--radius-btn-sm); /* 8px */
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.iconButton:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-border-medium);
}
```

### Icon Button (Standard, 32px)
```css
.iconButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: #ffffff;
  border: 1px solid #b3b3b3;
  border-radius: var(--radius-btn); /* 6px */
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.iconButton:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-border-medium);
}
```

### Secondary Button
```css
.secondaryButton {
  padding: 10px 20px;
  background: #ffffff;
  border: 1px solid #b3b3b3;
  border-radius: var(--radius-btn); /* 6px */
  font-size: 14px;
  font-weight: 500;
  color: #555555;
  cursor: pointer;
  transition: all 0.15s ease;
}

.secondaryButton:hover {
  background: var(--color-bg-tertiary);
}
```

### Primary Button
```css
.primaryButton {
  padding: 10px 20px;
  background: var(--btn-primary-bg);
  border: 1px solid var(--btn-primary-bg);
  border-radius: var(--radius-btn); /* 6px */
  font-size: 14px;
  font-weight: 500;
  color: var(--btn-primary-text);
  cursor: pointer;
  transition: all 0.15s ease;
}

.primaryButton:hover:not(:disabled) {
  background: var(--btn-primary-bg-hover);
  border-color: var(--btn-primary-bg-hover);
}

.primaryButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

### Danger Button
```css
.dangerButton {
  padding: 10px 16px;
  background: transparent;
  border: 1px solid #dc2626;
  border-radius: var(--radius-btn); /* 6px */
  font-size: 14px;
  font-weight: 500;
  color: #dc2626;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dangerButton:hover {
  background: #dc2626;
  color: white;
}
```

## Dropdown Menu

```css
.dropdown {
  background: #ffffff;
  border: 1px solid #c7c7c7;
  border-radius: 6px;
  box-shadow: 0 0 15px rgba(199, 199, 199, 0.30);
  padding: 6px;
  min-width: 150px;
  animation: menuSlideIn 0.15s ease;
}

@keyframes menuSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdownItem {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #333;
  font-size: 13px;
  font-weight: 450;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;
}

.dropdownItem:hover {
  background-color: #f5f5f5;
}
```

## Border Radius

Size-based scale (use based on element size):
- `var(--radius-xs)`: 4px — tiny elements < 24px
- `var(--radius-sm)`: 6px — small buttons ~32px
- `var(--radius-md)`: 8px — medium elements ~40px
- `var(--radius-lg)`: 12px — large cards, modals, showcase

Semantic aliases:
- `var(--radius-btn)`: 6px — standard buttons
- `var(--radius-btn-sm)`: 8px — small icon buttons (more radius for smaller elements)
- `var(--radius-card)`: 8px — cards
- `var(--radius-showcase)`: 12px — showcase images
- `var(--radius-input)`: 6px — form inputs

## Showcase Style (Images, Large Panels)

```css
.showcaseImage {
  border: 1px solid #c7c7c7;
  border-radius: 12px;
  box-shadow: 0 0 15px rgba(199, 199, 199, 0.30);
}
```

## Gray Card / Container

Use for subtle content containers like goal progress, stats, info panels:

```css
.grayCard {
  background: #fafafa;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 12px;
}
```

## Modals

### Modal Overlay
```css
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 24px;
  animation: fadeIn 0.2s ease-out;
}
```

### Modal Container
```css
.modal {
  width: 480px;
  max-width: 100%;
  max-height: 90vh;
  background: var(--color-bg-primary);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  animation: scaleIn 0.2s ease-out;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}
```

### Modal Header
```css
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border-light);
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--color-text-primary);
}
```

### Modal Footer
```css
.footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-light);
  background: var(--color-bg-secondary);
  gap: 12px;
}
```

## Form Inputs

```css
.input {
  padding: 10px 12px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: 6px;
  font-size: 14px;
  color: var(--color-text-primary);
  transition: all 0.15s ease;
}

.input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.input::placeholder {
  color: var(--color-text-muted);
}
```

## Animations

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

Standard timing: `0.15s ease` for micro-interactions, `0.2s ease-out` for modals.

## Typography

- Font family: `var(--font-hanken-grotesk)` with system fallbacks
- Base font weight: 500
- Headings: 600 weight
- Labels: 14px, 500 weight
- Small text: 13px

## Spacing

- Modal padding: 24px
- Section gaps: 24px
- Element gaps: 12px
- Button gaps: 12px
- Tight gaps: 8px

## Z-Index Scale

- Modal overlays: 1100
- Dropdowns: 1000
- Tooltips: 1200

## File Structure

- Use CSS Modules (`.module.css`) for component styles
- Import design tokens via `@import '../styles/design-tokens.css'` in globals.css
- Reference tokens using `var(--token-name)`
