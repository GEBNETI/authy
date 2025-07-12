# Servicio de Autenticacion de Usuarios

La idea principal del servicio es que sirva de hub central de autenticacion
para varias aplicaciones, ademas de incluir el manejo de roles de usuarios y
permisos por aplicacion para manejar tanto la autenticacion del usuario como
la autorizacion para realizar las tareas en cada aplicacion.

## Arquitectura de la aplicacion

### Backend

El Backend sera un API en GO, usando Fiber como framework de desarrollo y
Postgres como base de datos.

La autenticacion se realizar en base a tokens JWT, debe haber un manejo de
refresh para los tokens asi como de invalidacion para los mismos. Los tokens
deben tener una relacion con el usuario y con la aplicacion correspondiente,
de esta manera aseguramos que al hacer logout en alguna aplicacion los tokens
de las otras aplicaciones se mantengan funcionando sin problemas.

#### Cache con Valkey

Se implementara Valkey (fork de Redis) como sistema de cache para:
- Tokens JWT activos e invalidados
- Permisos de usuarios por aplicacion
- Sesiones activas
- Rate limiting para endpoints criticos

#### Sistema de Audit Logs

Todas las operaciones de autenticacion y autorizacion seran registradas:
- Intentos de login (exitosos y fallidos)
- Creacion y revocacion de tokens
- Cambios de permisos y roles
- Acceso a recursos protegidos
- Operaciones administrativas

#### Documentacion API

La API incluira documentacion automatica usando Swagger/OpenAPI para:
- Especificacion completa de endpoints
- Modelos de datos
- Ejemplos de requests/responses
- Autenticacion requerida por endpoint

#### Testing

Estructura completa de pruebas:
- Unit tests para logica de negocio
- Integration tests para endpoints de API
- Tests de seguridad para validacion de tokens
- Tests de rendimiento para operaciones criticas

#### Monitoreo y Observabilidad

El sistema incluira endpoints especializados para monitoreo:

**Endpoint /metrics**
- Metricas en formato Prometheus
- Contadores de requests por endpoint
- Latencia de respuestas
- Errores por tipo y endpoint
- Metricas de autenticacion (logins exitosos/fallidos)
- Estado de conexiones a base de datos y cache
- Metricas de recursos del sistema

**Endpoint /health**
- Health check del API
- Nombre del servicio: "Authy Authentication Service"
- Version actual del API
- Estado de dependencias (PostgreSQL, Valkey)
- Tiempo de respuesta de componentes criticos

### Frontend

El frontend sera una aplicacion React (Vite), que se conectara a la API y estara
registrada en la base de datos como AuthyBackoffice, debe incluir un flag para indicar
que es del sistema, y esto debe impedir que se elimine, se le cambie el nombre,
o se modifiquen sus permisos de cualquier manera, solo debe permitir el manejo de
los usuarios y la asignacion de roles a los usuarios.
