# Color Palette and Typography Research
## Equestrian Facility Management (EFM) - Professional Heritage

This document outlines a premium design system for the **Stable** project, blending the rich heritage of equestrian sports with modern, high-performance management software aesthetics.

---

## 1. Brand Essence: "Professional Heritage"
The design language should evoke a sense of **stability, precision, and tradition**. It is a tool for professionals who manage valuable assets (horses, facilities, staff) and requires an interface that is both authoritative and functional.

- **Keywords**: Timeless, Rugged, Sophisticated, Athletic, Heritage.
- **Visual Style**: High-contrast, clean lines, rich textures (suggested via imagery), and "glassmorphism" for data depth.

---

## 2. Dynamic Color Palette (2024-2025 Trends)

### A. The Core (Black & White)
| Use Case | Variable | Color | Hex | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Shell Background** | `--shell` | Obsidian | `#111110` | Depth for navigation and sidebars. |
| **Canvas Background** | `--bg` | Bone White | `#F3F2F0` | Reduces eye strain; feels premium. |
| **Primary Text** | `--text` | Charcoal | `#1C1A17` | High readability, softer than pure black. |
| **Accents** | `--white` | Pure White | `#FFFFFF` | For card surfaces and highlights. |

### B. Equestrian Accents (Signature Colors)
| Color Name | Hex | Usage | Trend Insight |
| :--- | :--- | :--- | :--- |
| **Saddle Brown** | `#8B4513` | Buttons, Active Icons | Evokes leather, tack, and organic horse hardware. |
| **Hunter Green** | `#224229` | Logos, Premium Headers | Classic equestrian "estate" color; symbolizes growth/health. |
| **Heritage Emerald**| `#166534` | Links, Success indicators | Modern jewel tone seen in 2024 high-end apparel. |
| **Oat/Hay Neutral** | `#D1CEC9` | Borders, Sub-navigation | Warm neutral that bridges B&W with organic tones. |

### C. Status & Logic
| Status | Hex | Styling Note |
| :--- | :--- | :--- |
| **Success** | `#166534` | Desaturated green to fit the professional tone. |
| **Warning** | `#78350F` | Amber/Leather tone for alert consistency. |
| **Error** | `#7F1D1D` | Deep crimson; highly visible but not "neon." |

---

## 3. Typography: The Power Pair

### Primary Sans-Serif: **Inter**
- **Role**: Interface, Buttons, Data Tables, Labels.
- **Why**: Exceptional legibility on screens. The `-0.02em` letter-spacing in the current CSS is a perfect "premium" touch.
- **Weights**: 400 (Body), 500 (Medium/Nav), 700 (Bold/Headers).

### Heritage Serif: **Playfair Display** (or **Cormorant Garamond**)
- **Role**: Branding, Quotes, Page Titles, High-level Stats.
- **Why**: Adds "historical weight" and luxury to the interface.
- **Style**: Often used in *Italic* for quotes or secondary headers to provide contrast against the functional UI.

### Hierarchy Rules
1. **Headers (H1-H3)**: Serif for titles, Bold Sans for functional headers.
2. **Body Text**: Sans-Serif, 14px base for compactness, 1.5 line height.
3. **Data/Stats**: Bold Sans-Serif with `tabular-nums` for alignment.

---

## 4. Implementation Guide (CSS Variables)

Integrate these into `global.css` for a unified design system:

```css
:root {
  /* Brand Accents */
  --accent-equestrian: #8B4513; /* Saddle */
  --accent-heritage:    #224229; /* Hunter */
  
  /* Text Refinement */
  --font-serif: 'Playfair Display', 'Cormorant Garamond', serif;
  --font-sans:  'Inter', sans-serif;
  
  /* Elevations */
  --glass-bg: rgba(255, 255, 255, 0.72);
  --glass-border: rgba(255, 255, 255, 0.65);
}

/* Example Usage for Page Titles */
.page-title {
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 700;
  color: var(--text);
  font-size: 2.25rem;
}
```

---

## 5. Future Reference: 2025 Trend Checklist
- [ ] **Customized Micro-Icons**: Use thin-stroke icons that match the "Inter" font weight.
- [ ] **Tactile Textures**: Use subtle noise or grain patterns on dark `--shell` surfaces.
- [ ] **Motion**: Use "Spring" eases (`cubic-bezier(.4,0,.2,1)`) to mimic the fluidity of equestrian movement.
