# JJuan — Ficha de Implementación

Sistema de gestión de proyectos de implementación de unidades móviles.

## Variables de entorno requeridas en Netlify

| Variable | Descripción | Obtener en |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini Imagen 3 (Nano Banana) — genera imágenes reales | [aistudio.google.com](https://aistudio.google.com) |
| `ANTHROPIC_API_KEY` | Claude AI — descripción cinematográfica (fallback) | [console.anthropic.com](https://console.anthropic.com) |

## Estructura

```
/
├── index.html              # App completa (single-page)
├── netlify.toml            # Configuración Netlify
└── netlify/
    └── functions/
        └── generate-vision.mjs   # API proxy (Gemini + Claude)
```
