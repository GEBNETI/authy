# Plan de Desarrollo del Backend - Authy Authentication Service

## Estado Actual

✅ **Estructura del proyecto creada**
✅ **Configuración de dependencias y Docker**
✅ **Endpoints básicos configurados (placeholders)**
✅ **Sistema de métricas Prometheus**
✅ **Logging estructurado con Zap**
✅ **Middleware básico implementado**

## Fase 1: Modelos de Datos y Base de Datos

### 1.1 Definir Esquema de Base de Datos
- **Tabla `users`**: ID, email, password_hash, first_name, last_name, is_active, created_at, updated_at
- **Tabla `applications`**: ID, name, description, is_system, api_key, created_at, updated_at
- **Tabla `roles`**: ID, name, description, application_id, permissions (JSON), created_at, updated_at
- **Tabla `user_roles`**: user_id, role_id, application_id, granted_at, granted_by
- **Tabla `tokens`**: ID, user_id, application_id, token_hash, type (access/refresh), expires_at, created_at
- **Tabla `audit_logs`**: ID, user_id, application_id, action, resource, details (JSON), ip_address, created_at

### 1.2 Crear Migraciones
- Usar `golang-migrate` para crear migraciones SQL
- Definir índices para optimizar consultas de autenticación
- Establecer constraints y relaciones entre tablas

### 1.3 Implementar Modelos GORM
- Crear structs en `internal/models/`
- Definir relaciones entre entidades
- Implementar validaciones de datos
- Agregar métodos helper para queries comunes

## Fase 2: Sistema de Autenticación JWT

### 2.1 Servicio JWT
- Crear `pkg/auth/jwt.go` con generación y validación de tokens
- Implementar tokens de acceso (1 hora) y refresh (7 días)
- Incluir claims: user_id, application_id, permissions, issued_at, expires_at
- Manejo de firma con secret configurable

### 2.2 Middleware de Autenticación
- Mejorar `AuthRequired()` middleware con validación JWT real
- Verificar tokens en cache (invalidados/activos)
- Extraer información del usuario del token
- Rate limiting por IP y por usuario

### 2.3 Gestión de Sesiones
- Cache de tokens activos en Valkey con TTL
- Blacklist de tokens invalidados
- Cleanup automático de tokens expirados

## Fase 3: Implementar Endpoints de Autenticación

### 3.1 Login (`POST /api/v1/auth/login`)
- Validar credenciales (email/password)
- Verificar que la aplicación existe y está activa
- Generar tokens JWT (access + refresh)
- Cachear tokens en Valkey
- Registrar audit log del login

### 3.2 Logout (`POST /api/v1/auth/logout`)
- Invalidar token específico por aplicación
- Mantener tokens de otras aplicaciones activos
- Mover token a blacklist en cache
- Registrar audit log del logout

### 3.3 Refresh Token (`POST /api/v1/auth/refresh`)
- Validar refresh token
- Generar nuevo access token
- Invalidar refresh token anterior
- Actualizar cache con nuevos tokens

### 3.4 Validate Token (`POST /api/v1/auth/validate`)
- Verificar validez del token
- Retornar información del usuario y permisos
- Para uso de otras aplicaciones

## Fase 4: Gestión de Usuarios

### 4.1 CRUD de Usuarios
- Crear usuario con hash de password (bcrypt)
- Listar usuarios con paginación y filtros
- Actualizar información del usuario
- Soft delete de usuarios (marcar como inactivo)

### 4.2 Gestión de Roles
- Asignar roles a usuarios por aplicación
- Remover roles específicos
- Validar permisos antes de asignación
- Audit logs para cambios de roles

## Fase 5: Gestión de Aplicaciones

### 5.1 CRUD de Aplicaciones
- Registrar nuevas aplicaciones
- Generar API keys para aplicaciones
- Actualizar información de aplicaciones
- Proteger aplicación "AuthyBackoffice" (is_system=true)

### 5.2 Manejo de Permisos
- Definir estructura de permisos JSON
- Validar permisos en middleware
- Cache de permisos por usuario-aplicación

## Fase 6: Sistema de Audit Logs

### 6.1 Implementar Logging
- Crear servicio `internal/services/audit.go`
- Interceptar todas las operaciones críticas
- Almacenar logs en base de datos con detalles completos
- Incluir IP, user agent, timestamps

### 6.2 Endpoints de Consulta
- Listar audit logs con filtros avanzados
- Búsqueda por usuario, aplicación, acción
- Exportar logs para análisis

## Fase 7: Rate Limiting y Seguridad

### 7.1 Rate Limiting
- Implementar límites por IP y por usuario
- Usar Valkey para contadores con TTL
- Diferentes límites para diferentes endpoints
- Headers informativos en respuestas

### 7.2 Validaciones de Seguridad
- Validación de fuerza de contraseñas
- Prevención de ataques de fuerza bruta
- Sanitización de inputs
- CORS configurado apropiadamente

## Fase 8: Mejorar Observabilidad

### 8.1 Métricas Avanzadas
- Métricas de autenticación por aplicación
- Latencia de operaciones de base de datos
- Cache hit/miss ratios
- Errores categorizados

### 8.2 Health Checks Mejorados
- Verificar conectividad a PostgreSQL
- Test de operaciones básicas en Valkey
- Tiempo de respuesta de dependencias
- Estado de migraciones de base de datos

## Fase 9: Testing Completo

### 9.1 Unit Tests
- Tests para servicios JWT
- Tests para modelos y validaciones
- Tests para utilidades y helpers
- Mocks para base de datos y cache

### 9.2 Integration Tests
- Tests end-to-end para flujos de autenticación
- Tests de endpoints con base de datos real
- Tests de concurrencia y race conditions
- Tests de rendimiento bajo carga

### 9.3 Security Tests
- Tests de validación de tokens
- Tests de rate limiting
- Tests de injection attacks
- Tests de autorización

## Fase 10: Documentación y Deployment

### 10.1 Documentación Swagger
- Completar anotaciones en todos los endpoints
- Ejemplos de requests/responses
- Documentación de códigos de error
- Esquemas de autenticación

### 10.2 Optimización
- Índices de base de datos optimizados
- Connection pooling configurado
- Cache strategies refinadas
- Profiling y optimización de consultas

## Orden de Implementación Sugerido

1. **Modelos y Migraciones** (Fase 1)
2. **Sistema JWT básico** (Fase 2)
3. **Login/Logout/Refresh** (Fase 3.1, 3.2, 3.3)
4. **Gestión de Usuarios básica** (Fase 4.1)
5. **Gestión de Aplicaciones** (Fase 5.1)
6. **Validate Token** (Fase 3.4)
7. **Roles y Permisos** (Fase 4.2, 5.2)
8. **Audit Logs** (Fase 6)
9. **Rate Limiting** (Fase 7.1)
10. **Testing y Optimización** (Fases 9 y 10)

Cada fase debe incluir testing apropiado antes de continuar con la siguiente.