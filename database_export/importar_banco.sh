#!/bin/bash
echo ""
echo "============================================================"
echo "   IMPORTAÇÃO DO BANCO DE DADOS MONGODB - ERP Emily Kids"
echo "============================================================"
echo ""

# Verificar se Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "[ERRO] Python3 não encontrado!"
    echo "Instale com: sudo apt install python3 python3-pip"
    exit 1
fi

# Verificar/Instalar dependências
echo "[INFO] Verificando dependências..."
pip3 show pymongo &> /dev/null || pip3 install pymongo

# Executar importação
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "$SCRIPT_DIR/import_database.py"
