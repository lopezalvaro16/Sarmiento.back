#!/bin/bash

# Script para configurar variables de entorno de documentos
# Ejecutar en producción después del setup principal

echo "🔧 Configurando variables de entorno para documentos..."
echo "====================================================="

# Verificar si existe .env
if [ ! -f .env ]; then
    echo "❌ Archivo .env no encontrado"
    echo "💡 Crea el archivo .env con las variables necesarias"
    exit 1
fi

# Variables necesarias
GITHUB_TOKEN="ghp_TU_TOKEN_AQUI"
GITHUB_REPO_OWNER="lopezalvaro16"
GITHUB_REPO_NAME="club-sarmiento-docs"

echo "📝 Agregando variables de entorno al archivo .env..."

# Verificar si las variables ya existen
if grep -q "GITHUB_TOKEN" .env; then
    echo "⚠️  GITHUB_TOKEN ya existe en .env"
else
    echo "GITHUB_TOKEN=$GITHUB_TOKEN" >> .env
    echo "✅ GITHUB_TOKEN agregado"
fi

if grep -q "GITHUB_REPO_OWNER" .env; then
    echo "⚠️  GITHUB_REPO_OWNER ya existe en .env"
else
    echo "GITHUB_REPO_OWNER=$GITHUB_REPO_OWNER" >> .env
    echo "✅ GITHUB_REPO_OWNER agregado"
fi

if grep -q "GITHUB_REPO_NAME" .env; then
    echo "⚠️  GITHUB_REPO_NAME ya existe en .env"
else
    echo "GITHUB_REPO_NAME=$GITHUB_REPO_NAME" >> .env
    echo "✅ GITHUB_REPO_NAME agregado"
fi

echo ""
echo "🎉 Variables de entorno configuradas!"
echo ""
echo "📋 Variables agregadas:"
echo "   GITHUB_TOKEN=$GITHUB_TOKEN"
echo "   GITHUB_REPO_OWNER=$GITHUB_REPO_OWNER"
echo "   GITHUB_REPO_NAME=$GITHUB_REPO_NAME"
echo ""
echo "🚀 Próximo paso:"
echo "   pm2 restart back-sarmiento --update-env"
