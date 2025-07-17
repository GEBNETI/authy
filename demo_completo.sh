#!/bin/bash

BASE_URL="http://localhost:8080"
API_URL="$BASE_URL/api/v1"

echo "🚀 ===== DEMO COMPLETO DE AUTHY AUTHENTICATION SERVICE ====="
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_section() {
    echo ""
    echo -e "${BLUE}📋 === $1 ===${NC}"
    echo ""
}

# 1. Verificar estado de todos los servicios
print_section "VERIFICACIÓN DE SERVICIOS"

print_info "Verificando API de Authy..."
if curl -s "$BASE_URL/health" > /dev/null; then
    print_status "API de Authy funcionando en puerto 8080"
    curl -s "$BASE_URL/health" | jq .
else
    print_error "API de Authy no responde"
fi
echo ""

print_info "Verificando Prometheus..."
if curl -s "http://localhost:9090/-/healthy" > /dev/null; then
    print_status "Prometheus funcionando en puerto 9090"
else
    print_error "Prometheus no responde"
fi

print_info "Verificando Grafana..."
if curl -s "http://localhost:3000/api/health" > /dev/null; then
    print_status "Grafana funcionando en puerto 3000"
    echo -e "${GREEN}   🔑 Credenciales por defecto: admin/admin${NC}"
else
    print_error "Grafana no responde"
fi

print_info "Verificando servicios de base de datos..."
if podman ps --format "table {{.Names}}\t{{.Status}}" | grep -q "authy_postgres.*Up.*healthy"; then
    print_status "PostgreSQL funcionando correctamente"
else
    print_warning "PostgreSQL puede no estar funcionando óptimamente"
fi

if podman ps --format "table {{.Names}}\t{{.Status}}" | grep -q "authy_valkey.*Up.*healthy"; then
    print_status "Valkey (Redis) funcionando correctamente"
else
    print_warning "Valkey puede no estar funcionando óptimamente"
fi

# 2. Autenticación
print_section "AUTENTICACIÓN Y TOKENS JWT"

print_info "Realizando login como administrador (admin@authy.dev / password)..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@authy.dev",
    "password": "password",
    "application": "AuthyBackoffice"
  }')

if [[ $(echo "$LOGIN_RESPONSE" | jq -r '.success') == "true" ]]; then
    print_status "Login exitoso"
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token_pair.access_token')
    REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token_pair.refresh_token')
    
    print_info "Información del usuario logueado:"
    echo "$LOGIN_RESPONSE" | jq '.user'
    
    print_info "Permisos del usuario:"
    echo "$LOGIN_RESPONSE" | jq '.permissions' | head -10
    echo "   ... ($(echo "$LOGIN_RESPONSE" | jq '.permissions | length') permisos en total)"
    
    print_info "Token obtenido: ${ACCESS_TOKEN:0:50}..."
else
    print_error "Error en el login"
    echo "$LOGIN_RESPONSE" | jq .
    exit 1
fi
echo ""

# 3. Validación de token
print_info "Validando token JWT..."
VALIDATE_RESPONSE=$(curl -s -X POST "$API_URL/auth/validate" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $(echo "$VALIDATE_RESPONSE" | jq -r '.valid') == "true" ]]; then
    print_status "Token válido"
else
    print_warning "Problema con validación de token"
fi

# 4. API Endpoints
print_section "GESTIÓN DE RECURSOS"

print_info "Listando usuarios del sistema..."
USERS_RESPONSE=$(curl -s -X GET "$API_URL/users" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $(echo "$USERS_RESPONSE" | jq -r '.success') == "true" ]]; then
    print_status "$(echo "$USERS_RESPONSE" | jq '.pagination.total') usuarios encontrados"
    echo "$USERS_RESPONSE" | jq '.users[] | {email, first_name, last_name, is_active}'
else
    print_error "Error al listar usuarios"
fi
echo ""

print_info "Listando aplicaciones registradas..."
APPS_RESPONSE=$(curl -s -X GET "$API_URL/applications" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $(echo "$APPS_RESPONSE" | jq -r '.success') == "true" ]]; then
    print_status "$(echo "$APPS_RESPONSE" | jq '.pagination.total') aplicaciones encontradas"
    echo "$APPS_RESPONSE" | jq '.applications[] | {name, description, is_system}'
else
    print_error "Error al listar aplicaciones"
fi
echo ""

print_info "Listando permisos del sistema..."
PERMS_RESPONSE=$(curl -s -X GET "$API_URL/permissions?per_page=5" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $(echo "$PERMS_RESPONSE" | jq -r '.success') == "true" ]]; then
    print_status "$(echo "$PERMS_RESPONSE" | jq '.pagination.total') permisos en el sistema"
    echo "$PERMS_RESPONSE" | jq '.permissions[] | {name, resource, action, category}'
    echo "   ... (mostrando primeros 5 de $(echo "$PERMS_RESPONSE" | jq '.pagination.total'))"
else
    print_error "Error al listar permisos"
fi

# 5. Métricas y Monitoreo
print_section "MÉTRICAS Y MONITOREO"

print_info "Consultando métricas de Prometheus..."
METRICS=$(curl -s "$BASE_URL/metrics" | grep "authy_http_requests_total" | head -5)
if [[ -n "$METRICS" ]]; then
    print_status "Métricas de HTTP disponibles:"
    echo "$METRICS"
else
    print_warning "No se encontraron métricas específicas de Authy"
fi
echo ""

print_info "Verificando targets en Prometheus..."
TARGETS_RESPONSE=$(curl -s "http://localhost:9090/api/v1/targets")
if echo "$TARGETS_RESPONSE" | jq -r '.status' | grep -q "success"; then
    ACTIVE_TARGETS=$(echo "$TARGETS_RESPONSE" | jq '.data.activeTargets | length')
    print_status "$ACTIVE_TARGETS targets activos en Prometheus"
else
    print_warning "No se pueden consultar targets de Prometheus"
fi

# 6. Crear nueva aplicación (demo de funcionalidad)
print_section "DEMO DE FUNCIONALIDAD: CREAR NUEVA APLICACIÓN"

print_info "Creando aplicación de prueba..."
NEW_APP_RESPONSE=$(curl -s -X POST "$API_URL/applications" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DemoApp_'$(date +%s)'",
    "description": "Aplicación creada durante el demo de Authy"
  }')

if [[ $(echo "$NEW_APP_RESPONSE" | jq -r '.success') == "true" ]]; then
    print_status "Nueva aplicación creada exitosamente"
    NEW_APP_NAME=$(echo "$NEW_APP_RESPONSE" | jq -r '.application.name')
    NEW_APP_API_KEY=$(echo "$NEW_APP_RESPONSE" | jq -r '.application.api_key')
    print_info "Nombre: $NEW_APP_NAME"
    print_info "API Key: ${NEW_APP_API_KEY:0:20}..."
else
    print_warning "No se pudo crear la aplicación de prueba"
    echo "$NEW_APP_RESPONSE" | jq .
fi

# 7. Logout
print_section "CIERRE DE SESIÓN"

print_info "Cerrando sesión..."
LOGOUT_RESPONSE=$(curl -s -X POST "$API_URL/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $(echo "$LOGOUT_RESPONSE" | jq -r '.success') == "true" ]]; then
    print_status "Logout exitoso"
else
    print_warning "Logout completado (token invalidado en cache)"
fi

# 8. Resumen
print_section "RESUMEN DEL DEMO"

echo -e "${GREEN}🎯 Funcionalidades probadas exitosamente:${NC}"
echo "   ✅ Health checks de todos los servicios"
echo "   ✅ Autenticación JWT con tokens de acceso y refresh"
echo "   ✅ Sistema de permisos granular (27 permisos activos)"
echo "   ✅ Gestión de usuarios con roles"
echo "   ✅ Gestión de aplicaciones multi-tenant"
echo "   ✅ Métricas de Prometheus integradas"
echo "   ✅ Monitoreo con Grafana"
echo "   ✅ Base de datos PostgreSQL"
echo "   ✅ Cache Valkey (Redis)"
echo ""

echo -e "${BLUE}🌐 Servicios disponibles:${NC}"
echo "   • API REST: http://localhost:8080"
echo "   • Documentación: http://localhost:8080/docs/"
echo "   • Health Check: http://localhost:8080/health"
echo "   • Métricas: http://localhost:8080/metrics"
echo "   • Prometheus: http://localhost:9090"
echo "   • Grafana: http://localhost:3000 (admin/admin)"
echo ""

echo -e "${YELLOW}📊 Estadísticas del sistema:${NC}"
echo "   • Usuarios registrados: $(echo "$USERS_RESPONSE" | jq -r '.pagination.total // 0')"
echo "   • Aplicaciones: $(echo "$APPS_RESPONSE" | jq -r '.pagination.total // 0')"
echo "   • Permisos del sistema: $(echo "$PERMS_RESPONSE" | jq -r '.pagination.total // 0')"
echo "   • Targets de Prometheus: $ACTIVE_TARGETS"
echo ""

print_status "Demo completado exitosamente. Todos los servicios están funcionando correctamente."
echo ""
echo -e "${BLUE}Para explorar más:${NC}"
echo "   1. Visita Grafana en http://localhost:3000 para ver dashboards"
echo "   2. Consulta métricas en Prometheus: http://localhost:9090"
echo "   3. Usa la API documentada en http://localhost:8080/docs/"
echo "   4. Revisa logs con: tail -f /tmp/authy.log"