#!/usr/bin/env python3
"""
Script FINAL para aplicar TODAS as correções RBAC restantes
"""
import re

# Ler o arquivo
with open('/app/backend/server.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Contadores
total_changes = 0
admin_checks_removed = 0

# Processar linha por linha
new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # Detectar linhas de definição de endpoint com Depends(get_current_user)
    if 'current_user: dict = Depends(get_current_user)' in line:
        # Verificar se é um endpoint que precisa de RBAC
        # Procurar o decorador @api_router acima
        j = i - 1
        while j >= 0 and not lines[j].strip().startswith('@api_router'):
            j -= 1
        
        if j >= 0:
            endpoint_line = lines[j]
            
            # Mapear endpoints para permissões
            replacements_map = {
                # Notas Fiscais
                '/notas-fiscais"': ('notas_fiscais', None),  # None = determinar pela ação HTTP
                # Orçamentos
                '/orcamentos"': ('orcamentos', None),
                # Vendas
                '/vendas"': ('vendas', None),
                # Usuários
                '/usuarios"': ('usuarios', None),
                # Logs
                '/logs"': ('logs', None),
                # Roles & Permissions
                '/roles"': ('usuarios', None),
                '/permissions"': ('usuarios', None),
                '/user-groups"': ('usuarios', None),
                '/permission-history"': ('logs', 'visualizar'),
                '/temporary-permissions"': ('usuarios', None),
                '/rbac/initialize"': ('usuarios', 'criar'),
                # Relatórios
                '/relatorios/': ('relatorios', 'visualizar'),
            }
            
            # Verificar se o endpoint precisa de RBAC
            needs_rbac = False
            modulo = None
            acao = None
            
            for pattern, (mod, ac) in replacements_map.items():
                if pattern in endpoint_line:
                    needs_rbac = True
                    modulo = mod
                    acao = ac
                    break
            
            if needs_rbac and modulo:
                # Determinar ação se não foi especificada
                if acao is None:
                    if '.get(' in endpoint_line:
                        acao = 'visualizar'
                    elif '.post(' in endpoint_line:
                        if 'aprovar' in endpoint_line:
                            acao = 'aprovar'
                        elif 'cancelar' in endpoint_line or 'excluir' in endpoint_line or 'delete' in line.lower():
                            acao = 'excluir'
                        else:
                            acao = 'criar'
                    elif '.put(' in endpoint_line:
                        acao = 'editar'
                    elif '.delete(' in endpoint_line:
                        acao = 'excluir'
                
                # Aplicar substituição
                new_line = line.replace(
                    'Depends(get_current_user)',
                    f'Depends(require_permission("{modulo}", "{acao}"))'
                )
                new_lines.append(new_line)
                if new_line != line:
                    total_changes += 1
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
    
    # Remover verificações manuais de admin
    elif 'if current_user["papel"] != "admin":' in line:
        # Comentar a verificação manual e adicionar nota
        new_lines.append(f'    # RBAC: Verificação manual removida - agora usa Depends(require_permission)\n')
        new_lines.append(f'    # {line}')
        # Também comentar a linha seguinte (raise HTTPException)
        if i + 1 < len(lines) and 'raise HTTPException' in lines[i + 1]:
            i += 1
            new_lines.append(f'    # {lines[i]}')
        admin_checks_removed += 1
        
    else:
        new_lines.append(line)
    
    i += 1

# Salvar arquivo
with open('/app/backend/server.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"✅ Correções RBAC Aplicadas:")
print(f"   - {total_changes} endpoints atualizados com require_permission")
print(f"   - {admin_checks_removed} verificações manuais de admin removidas")
print(f"\nTotal de endpoints protegidos com RBAC granular!")
