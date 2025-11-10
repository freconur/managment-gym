# Management Gym

Sistema de gestión para gimnasio construido con Next.js 14 y Pages Router.

## Estructura del Proyecto

Este proyecto utiliza el **Pages Router** de Next.js, donde las páginas se organizan por archivos dentro del directorio `pages/`.

```
pages/
├── _app.tsx              # Configuración global de la aplicación
├── _document.tsx          # Personalización del documento HTML
├── index.tsx              # Página principal (ruta: /)
├── about.tsx              # Página /about
├── members/
│   └── [id].tsx          # Ruta dinámica /members/[id]
└── api/                   # Rutas de API
    ├── hello.ts          # API route: /api/hello
    └── users/
        ├── index.ts      # API route: /api/users
        └── [id].ts       # API route: /api/users/[id]
```

## Ejemplos de Rutas

### Páginas
- `pages/index.tsx` → `/`
- `pages/about.tsx` → `/about`
- `pages/members/[id].tsx` → `/members/123` (ruta dinámica)

### API Routes
- `pages/api/hello.ts` → `/api/hello`
- `pages/api/users/index.ts` → `/api/users`
- `pages/api/users/[id].ts` → `/api/users/123` (ruta dinámica)

## Archivos Especiales

- **`_app.tsx`**: Se ejecuta para todas las páginas. Úsalo para:
  - Importar estilos globales
  - Mantener estado global
  - Agregar providers (Context, Redux, etc.)

- **`_document.tsx`**: Personaliza el documento HTML. Úsalo para:
  - Modificar `<html>` y `<body>`
  - Agregar fuentes o scripts externos

## Comandos Disponibles

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build

# Iniciar servidor de producción
npm start

# Ejecutar linter
npm run lint
```

## Tecnologías

- Next.js 14
- React 18
- TypeScript
- Pages Router (estructura basada en archivos)
