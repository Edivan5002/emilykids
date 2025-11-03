#!/usr/bin/env python3
"""
Script para aplicar correções RBAC automaticamente
"""
import re

# Definir todas as substituições de endpoints
# Formato: (linha_pattern, old_depends, new_depends)
ENDPOINT_FIXES = [
    # Produtos (continuando dos já feitos)
    (r'@api_router\.put\("/produtos/\{produto_id\}/toggle-status"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("produtos", "editar"))'),
    (r'@api_router\.get\("/produtos/\{produto_id\}/historico-precos"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("produtos", "visualizar"))'),
    (r'@api_router\.get\("/produtos/relatorios/mais-vendidos"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("relatorios", "visualizar"))'),
    (r'@api_router\.get\("/produtos/relatorios/valor-estoque"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("relatorios", "visualizar"))'),
    (r'@api_router\.get\("/produtos/busca-avancada"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("produtos", "visualizar"))'),
    
    # Marcas
    (r'@api_router\.get\("/marcas"', r'Depends\(get_current_user\)', 'Depends(require_permission("marcas", "visualizar"))'),
    (r'@api_router\.post\("/marcas"', r'Depends\(get_current_user\)', 'Depends(require_permission("marcas", "criar"))'),
    (r'@api_router\.put\("/marcas/\{marca_id\}"', r'Depends\(get_current_user\)', 'Depends(require_permission("marcas", "editar"))'),
    (r'@api_router\.delete\("/marcas/\{marca_id\}"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("marcas", "excluir"))'),
    (r'@api_router\.put\("/marcas/\{marca_id\}/toggle-status"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("marcas", "editar"))'),
    
    # Categorias
    (r'@api_router\.get\("/categorias"', r'Depends\(get_current_user\)', 'Depends(require_permission("categorias", "visualizar"))'),
    (r'@api_router\.post\("/categorias"', r'Depends\(get_current_user\)', 'Depends(require_permission("categorias", "criar"))'),
    (r'@api_router\.put\("/categorias/\{categoria_id\}"', r'Depends\(get_current_user\)', 'Depends(require_permission("categorias", "editar"))'),
    (r'@api_router\.delete\("/categorias/\{categoria_id\}"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("categorias", "excluir"))'),
    (r'@api_router\.put\("/categorias/\{categoria_id\}/toggle-status"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("categorias", "editar"))'),
    
    # Subcategorias
    (r'@api_router\.get\("/subcategorias"', r'Depends\(get_current_user\)', 'Depends(require_permission("subcategorias", "visualizar"))'),
    (r'@api_router\.post\("/subcategorias"', r'Depends\(get_current_user\)', 'Depends(require_permission("subcategorias", "criar"))'),
    (r'@api_router\.put\("/subcategorias/\{subcategoria_id\}"', r'Depends\(get_current_user\)', 'Depends(require_permission("subcategorias", "editar"))'),
    (r'@api_router\.delete\("/subcategorias/\{subcategoria_id\}"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("subcategorias", "excluir"))'),
    (r'@api_router\.put\("/subcategorias/\{subcategoria_id\}/toggle-status"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("subcategorias", "editar"))'),
    
    # Clientes
    (r'@api_router\.get\("/clientes"', r'Depends\(get_current_user\)', 'Depends(require_permission("clientes", "visualizar"))'),
    (r'@api_router\.post\("/clientes"', r'Depends\(get_current_user\)', 'Depends(require_permission("clientes", "criar"))'),
    (r'@api_router\.put\("/clientes/\{cliente_id\}"', r'Depends\(get_current_user\)', 'Depends(require_permission("clientes", "editar"))'),
    (r'@api_router\.delete\("/clientes/\{cliente_id\}"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("clientes", "excluir"))'),
    (r'@api_router\.put\("/clientes/\{cliente_id\}/toggle-status"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("clientes", "editar"))'),
    
    # Fornecedores
    (r'@api_router\.get\("/fornecedores"', r'Depends\(get_current_user\)', 'Depends(require_permission("fornecedores", "visualizar"))'),
    (r'@api_router\.post\("/fornecedores"', r'Depends\(get_current_user\)', 'Depends(require_permission("fornecedores", "criar"))'),
    (r'@api_router\.put\("/fornecedores/\{fornecedor_id\}"', r'Depends\(get_current_user\)', 'Depends(require_permission("fornecedores", "editar"))'),
    (r'@api_router\.delete\("/fornecedores/\{fornecedor_id\}"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("fornecedores", "excluir"))'),
    (r'@api_router\.put\("/fornecedores/\{fornecedor_id\}/toggle-status"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("fornecedores", "editar"))'),
    
    # Estoque
    (r'@api_router\.get\("/estoque/alertas"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("estoque", "visualizar"))'),
    (r'@api_router\.get\("/estoque/movimentacoes"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("estoque", "visualizar"))'),
    (r'@api_router\.post\("/estoque/ajuste-manual"\)', r'Depends\(get_current_user\)', 'Depends(require_permission("estoque", "editar"))'),
]

print(f"Script preparado com {len(ENDPOINT_FIXES)} correções RBAC")
print("\nPróximas etapas:")
print("1. Aplicar correções de módulos de cadastros (Produtos, Marcas, Categorias, etc)")
print("2. Aplicar correções de módulos transacionais (Notas Fiscais, Orçamentos, Vendas)")
print("3. Aplicar correções de módulos de controle (Logs, Usuários, Relatórios)")
print("4. Remover verificações manuais de admin e substituir por RBAC")
