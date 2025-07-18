# Authy Frontend

Frontend de la aplicación de autenticación Authy, construido con React, Vite, TypeScript, Tailwind CSS y DaisyUI.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ 
- npm o yarn
- Backend de Authy ejecutándose en `http://localhost:8080`

### Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en: **http://localhost:3001/**

## 🔧 Configuración

### Variables de Entorno

```env
# API Configuration
VITE_API_URL=http://localhost:8080/api/v1

# App Configuration
VITE_APP_NAME=Authy
VITE_APP_VERSION=1.0.0
VITE_APP_PORT=3001

# Environment
VITE_NODE_ENV=development
```

## 🎨 Stack Tecnológico

- **React 18** + **TypeScript**
- **Vite** - Build tool y servidor de desarrollo  
- **Tailwind CSS** + **DaisyUI** (tema emerald)
- **React Router DOM v6** - Navegación
- **Axios** - Cliente HTTP
- **React Hook Form** + **Zod** - Formularios y validación
- **Lucide React** - Iconos

## 🔐 Autenticación

### Credenciales Demo

```
Email: admin@authy.dev
Password: password
```

## 🌐 Puertos y Servicios

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8080
- **Grafana**: http://localhost:3000
- **Prometheus**: http://localhost:9090

## 📱 Funcionalidades

### Implementadas
- ✅ **Autenticación**: Login/logout con JWT
- ✅ **Dashboard**: Métricas y actividad reciente
- ✅ **Layouts**: Auth layout y main layout
- ✅ **Tema**: Toggle emerald/dark mode
- ✅ **Notificaciones**: Sistema toast
- ✅ **Routing**: Rutas protegidas
- ✅ **Responsivo**: Design mobile-first

### Próximas Fases
- 🔄 **Gestión de Usuarios**: CRUD completo
- 🔄 **Gestión de Aplicaciones**: API keys
- 🔄 **Permisos**: Matriz de permisos
- 🔄 **Logs de Auditoría**: Filtros y exportación