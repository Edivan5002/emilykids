#!/usr/bin/env python3
"""
Script para aplicar todas as correções RBAC de uma vez no server.py
"""
import re

# Ler o arquivo
with open('/app/backend/server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Lista de substituições a fazer
# Formato: (regex_find, replacement)
replacements = [
    # Subcategorias (5 endpoints)
    (r'(@api_router\.get\("/subcategorias".*?\n)async def get_subcategorias\(current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def get_subcategorias(current_user: dict = Depends(require_permission("subcategorias", "visualizar"))):'),
    
    (r'(@api_router\.post\("/subcategorias".*?\n)async def create_subcategoria\(subcategoria_data: SubcategoriaCreate, current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def create_subcategoria(subcategoria_data: SubcategoriaCreate, current_user: dict = Depends(require_permission("subcategorias", "criar"))):'),
    
    (r'(@api_router\.put\("/subcategorias/\{subcategoria_id\}".*?\n)async def update_subcategoria\(subcategoria_id: str, subcategoria_data: SubcategoriaCreate, current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def update_subcategoria(subcategoria_id: str, subcategoria_data: SubcategoriaCreate, current_user: dict = Depends(require_permission("subcategorias", "editar"))):'),
    
    (r'(@api_router\.delete\("/subcategorias/\{subcategoria_id\}"\)\n)async def delete_subcategoria\(subcategoria_id: str, current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def delete_subcategoria(subcategoria_id: str, current_user: dict = Depends(require_permission("subcategorias", "excluir"))):'),
    
    (r'(@api_router\.put\("/subcategorias/\{subcategoria_id\}/toggle-status"\)\n)async def toggle_subcategoria_status\(subcategoria_id: str, current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def toggle_subcategoria_status(subcategoria_id: str, current_user: dict = Depends(require_permission("subcategorias", "editar"))):'),
    
    # Clientes (5 endpoints)
    (r'(@api_router\.get\("/clientes".*?\n)async def get_clientes\(current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def get_clientes(current_user: dict = Depends(require_permission("clientes", "visualizar"))):'),
    
    (r'(@api_router\.post\("/clientes".*?\n)async def create_cliente\(cliente_data: ClienteCreate, current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def create_cliente(cliente_data: ClienteCreate, current_user: dict = Depends(require_permission("clientes", "criar"))):'),
    
    (r'(@api_router\.put\("/clientes/\{cliente_id\}".*?\n)async def update_cliente\(cliente_id: str, cliente_data: ClienteCreate, current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def update_cliente(cliente_id: str, cliente_data: ClienteCreate, current_user: dict = Depends(require_permission("clientes", "editar"))):'),
    
    (r'(@api_router\.delete\("/clientes/\{cliente_id\}"\)\n)async def delete_cliente\(cliente_id: str, current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def delete_cliente(cliente_id: str, current_user: dict = Depends(require_permission("clientes", "excluir"))):'),
    
    (r'(@api_router\.put\("/clientes/\{cliente_id\}/toggle-status"\)\n)async def toggle_cliente_status\(cliente_id: str, current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def toggle_cliente_status(cliente_id: str, current_user: dict = Depends(require_permission("clientes", "editar"))):'),
    
    # Fornecedores (5 endpoints)
    (r'(@api_router\.get\("/fornecedores".*?\n)async def get_fornecedores\(current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def get_fornecedores(current_user: dict = Depends(require_permission("fornecedores", "visualizar"))):'),
    
    (r'(@api_router\.post\("/fornecedores".*?\n)async def create_fornecedor\(fornecedor_data: FornecedorCreate, current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def create_fornecedor(fornecedor_data: FornecedorCreate, current_user: dict = Depends(require_permission("fornecedores", "criar"))):'),
    
    (r'(@api_router\.put\("/fornecedores/\{fornecedor_id\}".*?\n)async def update_fornecedor\(fornecedor_id: str, fornecedor_data: FornecedorCreate, current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def update_fornecedor(fornecedor_id: str, fornecedor_data: FornecedorCreate, current_user: dict = Depends(require_permission("fornecedores", "editar"))):'),
    
    (r'(@api_router\.delete\("/fornecedores/\{fornecedor_id\}"\)\n)async def delete_fornecedor\(fornecedor_id: str, current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def delete_fornecedor(fornecedor_id: str, current_user: dict = Depends(require_permission("fornecedores", "excluir"))):'),
    
    (r'(@api_router\.put\("/fornecedores/\{fornecedor_id\}/toggle-status"\)\n)async def toggle_fornecedor_status\(fornecedor_id: str, current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def toggle_fornecedor_status(fornecedor_id: str, current_user: dict = Depends(require_permission("fornecedores", "editar"))):'),
    
    # Estoque (3 endpoints)
    (r'(@api_router\.get\("/estoque/alertas"\)\n)async def get_estoque_alertas\(current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def get_estoque_alertas(current_user: dict = Depends(require_permission("estoque", "visualizar"))):'),
    
    (r'(@api_router\.get\("/estoque/movimentacoes"\)\n)async def get_estoque_movimentacoes\(([^)]+)current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def get_estoque_movimentacoes(\2current_user: dict = Depends(require_permission("estoque", "visualizar"))):'),
    
    (r'(@api_router\.post\("/estoque/ajuste-manual"\)\n)async def ajuste_manual_estoque\(([^)]+)current_user: dict = Depends\(get_current_user\)\):',
     r'\1async def ajuste_manual_estoque(\2current_user: dict = Depends(require_permission("estoque", "editar"))):'),
]

# Aplicar substituições
for pattern, replacement in replacements:
    content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

# Salvar arquivo
with open('/app/backend/server.py', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ Aplicadas {len(replacements)} correções RBAC no server.py")
print("\nMódulos corrigidos:")
print("  - Subcategorias (5 endpoints)")
print("  - Clientes (5 endpoints)")
print("  - Fornecedores (5 endpoints)")
print("  - Estoque (3 endpoints)")
