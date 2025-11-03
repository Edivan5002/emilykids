"""
Script para aplicar correções RBAC em todos os endpoints do server.py
"""

# Mapeamento de endpoints para permissões RBAC
# Formato: (método, path_pattern, módulo, ação)
ENDPOINT_PERMISSIONS = [
    # Produtos
    ("GET", '/produtos"', "produtos", "visualizar"),
    ("POST", '/produtos"', "produtos", "criar"),
    ("PUT", '/produtos/{produto_id}"', "produtos", "editar"),
    ("DELETE", '/produtos/{produto_id}"', "produtos", "excluir"),
    ("PUT", '/produtos/{produto_id}/toggle-status"', "produtos", "editar"),
    ("GET", '/produtos/{produto_id}/historico-precos"', "produtos", "visualizar"),
    ("GET", '/produtos/relatorios/mais-vendidos"', "relatorios", "visualizar"),
    ("GET", '/produtos/relatorios/valor-estoque"', "relatorios", "visualizar"),
    ("GET", '/produtos/busca-avancada"', "produtos", "visualizar"),
    
    # Marcas
    ("GET", '/marcas"', "marcas", "visualizar"),
    ("POST", '/marcas"', "marcas", "criar"),
    ("PUT", '/marcas/{marca_id}"', "marcas", "editar"),
    ("DELETE", '/marcas/{marca_id}"', "marcas", "excluir"),
    ("PUT", '/marcas/{marca_id}/toggle-status"', "marcas", "editar"),
    
    # Categorias
    ("GET", '/categorias"', "categorias", "visualizar"),
    ("POST", '/categorias"', "categorias", "criar"),
    ("PUT", '/categorias/{categoria_id}"', "categorias", "editar"),
    ("DELETE", '/categorias/{categoria_id}"', "categorias", "excluir"),
    ("PUT", '/categorias/{categoria_id}/toggle-status"', "categorias", "editar"),
    
    # Subcategorias
    ("GET", '/subcategorias"', "subcategorias", "visualizar"),
    ("POST", '/subcategorias"', "subcategorias", "criar"),
    ("PUT", '/subcategorias/{subcategoria_id}"', "subcategorias", "editar"),
    ("DELETE", '/subcategorias/{subcategoria_id}"', "subcategorias", "excluir"),
    ("PUT", '/subcategorias/{subcategoria_id}/toggle-status"', "subcategorias", "editar"),
    
    # Clientes
    ("GET", '/clientes"', "clientes", "visualizar"),
    ("POST", '/clientes"', "clientes", "criar"),
    ("PUT", '/clientes/{cliente_id}"', "clientes", "editar"),
    ("DELETE", '/clientes/{cliente_id}"', "clientes", "excluir"),
    ("PUT", '/clientes/{cliente_id}/toggle-status"', "clientes", "editar"),
    
    # Fornecedores
    ("GET", '/fornecedores"', "fornecedores", "visualizar"),
    ("POST", '/fornecedores"', "fornecedores", "criar"),
    ("PUT", '/fornecedores/{fornecedor_id}"', "fornecedores", "editar"),
    ("DELETE", '/fornecedores/{fornecedor_id}"', "fornecedores", "excluir"),
    ("PUT", '/fornecedores/{fornecedor_id}/toggle-status"', "fornecedores", "editar"),
    
    # Estoque
    ("GET", '/estoque/alertas"', "estoque", "visualizar"),
    ("GET", '/estoque/movimentacoes"', "estoque", "visualizar"),
    ("POST", '/estoque/ajuste-manual"', "estoque", "editar"),
    
    # Notas Fiscais
    ("GET", '/notas-fiscais"', "notas_fiscais", "visualizar"),
    ("POST", '/notas-fiscais"', "notas_fiscais", "criar"),
    ("PUT", '/notas-fiscais/{nota_id}"', "notas_fiscais", "editar"),
    ("DELETE", '/notas-fiscais/{nota_id}"', "notas_fiscais", "excluir"),
    ("POST", '/notas-fiscais/{nota_id}/solicitar-aprovacao"', "notas_fiscais", "editar"),
    ("POST", '/notas-fiscais/{nota_id}/aprovar"', "notas_fiscais", "aprovar"),
    ("POST", '/notas-fiscais/{nota_id}/confirmar"', "notas_fiscais", "editar"),
    ("POST", '/notas-fiscais/{nota_id}/cancelar"', "notas_fiscais", "excluir"),
    ("GET", '/notas-fiscais/{nota_id}/historico"', "notas_fiscais", "visualizar"),
    ("GET", '/relatorios/notas-fiscais"', "relatorios", "visualizar"),
    
    # Orçamentos
    ("GET", '/orcamentos"', "orcamentos", "visualizar"),
    ("POST", '/orcamentos"', "orcamentos", "criar"),
    ("PUT", '/orcamentos/{orcamento_id}"', "orcamentos", "editar"),
    ("DELETE", '/orcamentos/{orcamento_id}"', "orcamentos", "excluir"),
    ("POST", '/orcamentos/{orcamento_id}/solicitar-aprovacao"', "orcamentos", "editar"),
    ("POST", '/orcamentos/{orcamento_id}/aprovar"', "orcamentos", "aprovar"),
    ("POST", '/orcamentos/{orcamento_id}/converter-venda"', "orcamentos", "editar"),
    ("POST", '/orcamentos/{orcamento_id}/duplicar"', "orcamentos", "criar"),
    ("POST", '/orcamentos/{orcamento_id}/marcar-perdido"', "orcamentos", "editar"),
    ("POST", '/orcamentos/verificar-expirados"', "orcamentos", "editar"),
    ("GET", '/orcamentos/{orcamento_id}/historico"', "orcamentos", "visualizar"),
    ("POST", '/orcamentos/{orcamento_id}/devolver"', "orcamentos", "editar"),
    
    # Vendas
    ("GET", '/vendas/proximo-numero"', "vendas", "visualizar"),
    ("GET", '/vendas"', "vendas", "visualizar"),
    ("POST", '/vendas"', "vendas", "criar"),
    ("PUT", '/vendas/{venda_id}"', "vendas", "editar"),
    ("POST", '/vendas/{venda_id}/registrar-pagamento"', "vendas", "editar"),
    ("POST", '/vendas/{venda_id}/cancelar"', "vendas", "excluir"),
    ("POST", '/vendas/{venda_id}/devolucao-parcial"', "vendas", "editar"),
    ("GET", '/vendas/{venda_id}/historico"', "vendas", "visualizar"),
    ("GET", '/relatorios/vendas"', "relatorios", "visualizar"),
    ("GET", '/relatorios/orcamentos"', "relatorios", "visualizar"),
    
    # Usuários
    ("GET", '/usuarios"', "usuarios", "visualizar"),
    ("POST", '/usuarios"', "usuarios", "criar"),
    ("GET", '/usuarios/{user_id}"', "usuarios", "visualizar"),
    ("PUT", '/usuarios/{user_id}"', "usuarios", "editar"),
    ("DELETE", '/usuarios/{user_id}"', "usuarios", "excluir"),
    ("POST", '/usuarios/{user_id}/toggle-status"', "usuarios", "editar"),
    
    # Logs - TODOS devem verificar permissão de logs
    ("GET", '/logs"', "logs", "visualizar"),
    ("GET", '/logs/estatisticas"', "logs", "visualizar"),
    ("GET", '/logs/dashboard"', "logs", "visualizar"),
    ("GET", '/logs/seguranca"', "logs", "visualizar"),
    ("GET", '/logs/exportar"', "logs", "exportar"),
    ("POST", '/logs/arquivar-antigos"', "logs", "editar"),
    ("GET", '/logs/atividade-suspeita"', "logs", "visualizar"),
    ("POST", '/logs/criar-indices"', "logs", "editar"),
    
    # Roles & Permissions - controle RBAC
    ("GET", '/roles"', "usuarios", "visualizar"),
    ("GET", '/roles/{role_id}"', "usuarios", "visualizar"),
    ("POST", '/roles"', "usuarios", "criar"),
    ("PUT", '/roles/{role_id}"', "usuarios", "editar"),
    ("DELETE", '/roles/{role_id}"', "usuarios", "excluir"),
    ("POST", '/roles/{role_id}/duplicate"', "usuarios", "criar"),
    ("GET", '/permissions"', "usuarios", "visualizar"),
    ("GET", '/permissions/by-module"', "usuarios", "visualizar"),
    ("GET", '/users/{user_id}/permissions"', "usuarios", "visualizar"),
    ("GET", '/user-groups"', "usuarios", "visualizar"),
    ("POST", '/user-groups"', "usuarios", "criar"),
    ("PUT", '/user-groups/{group_id}"', "usuarios", "editar"),
    ("DELETE", '/user-groups/{group_id}"', "usuarios", "excluir"),
    ("GET", '/permission-history"', "logs", "visualizar"),
    ("POST", '/temporary-permissions"', "usuarios", "editar"),
    ("GET", '/users/{user_id}/temporary-permissions"', "usuarios", "visualizar"),
    ("POST", '/rbac/initialize"', "usuarios", "criar"),
]

print("Mapeamento de permissões RBAC criado:")
print(f"Total de endpoints a corrigir: {len(ENDPOINT_PERMISSIONS)}")
print("\nEndpoints por módulo:")
modulos = {}
for _, _, modulo, _ in ENDPOINT_PERMISSIONS:
    modulos[modulo] = modulos.get(modulo, 0) + 1
for modulo, count in sorted(modulos.items()):
    print(f"  {modulo}: {count} endpoints")
