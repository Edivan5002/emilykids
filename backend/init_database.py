#!/usr/bin/env python3
"""
Script de Inicialização do Banco de Dados - Emily Kids ERP
Popula o banco MongoDB local com dados iniciais completos

Uso: python init_database.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from uuid import uuid4
from datetime import datetime, timezone
import sys

# Configuração de senha
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuração do MongoDB
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "inventoai_db"

class DatabaseInitializer:
    def __init__(self):
        self.client = AsyncIOMotorClient(MONGO_URL)
        self.db = self.client[DB_NAME]
        
    async def drop_all_collections(self):
        """Limpa todas as collections existentes (CUIDADO!)"""
        collections = await self.db.list_collection_names()
        for collection in collections:
            await self.db[collection].drop()
        print("✅ Todas as collections foram limpas")
    
    async def create_permissions(self):
        """Cria todas as 120 permissões do sistema (19 módulos)"""
        print("\n📋 Criando permissões...")
        
        # Definição de módulos e suas ações
        modulos_acoes = {
            "dashboard": ["ler"],
            "produtos": ["ler", "criar", "editar", "deletar", "exportar", "importar"],
            "categorias": ["ler", "criar", "editar", "deletar"],
            "marcas": ["ler", "criar", "editar", "deletar"],
            "subcategorias": ["ler", "criar", "editar", "deletar"],
            "clientes": ["ler", "criar", "editar", "deletar", "exportar"],
            "fornecedores": ["ler", "criar", "editar", "deletar"],
            "vendas": ["ler", "criar", "editar", "deletar", "cancelar", "exportar"],
            "orcamentos": ["ler", "criar", "editar", "deletar", "converter", "exportar"],
            "estoque": ["ler", "ajustar", "exportar", "inventariar"],
            "notas_fiscais": ["ler", "criar", "editar", "cancelar", "exportar"],
            "relatorios": ["ler", "exportar"],
            "usuarios": ["ler", "criar", "editar", "deletar", "gerenciar_permissoes"],
            "papeis": ["ler", "criar", "editar", "deletar"],
            "configuracoes": ["ler", "editar"],
            "contas_receber": ["ler", "criar", "editar", "deletar", "exportar", "aprovar", "receber", "estornar", "negociar"],
            "contas_pagar": ["ler", "criar", "editar", "deletar", "exportar", "aprovar", "pagar", "estornar", "aprovar_pagamento"],
            "fluxo_caixa": ["ler", "criar", "editar", "deletar", "exportar", "aprovar"],
            "configuracoes_financeiras": ["ler", "criar", "editar", "deletar", "exportar", "aprovar"],
        }
        
        permissions = []
        for modulo, acoes in modulos_acoes.items():
            for acao in acoes:
                permission = {
                    "id": str(uuid4()),
                    "modulo": modulo,
                    "acao": acao,
                    "descricao": f"Permissão para {acao} em {modulo}"
                }
                permissions.append(permission)
        
        await self.db.permissions.insert_many(permissions)
        print(f"✅ {len(permissions)} permissões criadas em {len(modulos_acoes)} módulos")
        return permissions
    
    async def create_roles(self, permissions):
        """Cria papéis (roles) do sistema"""
        print("\n👥 Criando papéis...")
        
        # Todos os IDs de permissões
        all_permission_ids = [p["id"] for p in permissions]
        
        # Permissões básicas (leitura)
        read_permission_ids = [p["id"] for p in permissions if p["acao"] == "ler"]
        
        # Permissões de vendedor
        vendedor_permissions = [
            p["id"] for p in permissions 
            if p["modulo"] in ["dashboard", "produtos", "clientes", "vendas", "orcamentos", "estoque"] 
            and p["acao"] in ["ler", "criar", "editar"]
        ]
        
        # Permissões de gerente (tudo exceto usuários e configurações)
        gerente_permissions = [
            p["id"] for p in permissions 
            if p["modulo"] not in ["usuarios", "papeis", "configuracoes"]
        ]
        
        roles = [
            {
                "id": str(uuid4()),
                "nome": "Administrador",
                "descricao": "Acesso total ao sistema",
                "permissoes": all_permission_ids
            },
            {
                "id": str(uuid4()),
                "nome": "Gerente",
                "descricao": "Gerenciamento operacional completo",
                "permissoes": gerente_permissions
            },
            {
                "id": str(uuid4()),
                "nome": "Vendedor",
                "descricao": "Acesso a vendas e cadastros básicos",
                "permissoes": vendedor_permissions
            },
            {
                "id": str(uuid4()),
                "nome": "Visualizador",
                "descricao": "Apenas visualização de dados",
                "permissoes": read_permission_ids
            }
        ]
        
        await self.db.roles.insert_many(roles)
        print(f"✅ {len(roles)} papéis criados")
        return roles
    
    async def create_users(self, roles):
        """Cria usuários iniciais"""
        print("\n👤 Criando usuários...")
        
        admin_role = next(r for r in roles if r["nome"] == "Administrador")
        vendedor_role = next(r for r in roles if r["nome"] == "Vendedor")
        
        users = [
            {
                "id": str(uuid4()),
                "nome": "Administrador do Sistema",
                "email": "admin@emilyerp.com",
                "senha_hash": pwd_context.hash("admin123"),
                "papel": "admin",
                "role_id": admin_role["id"],
                "ativo": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "login_attempts": 0,
                "locked_until": None,
                "senha_ultimo_change": datetime.now(timezone.utc).isoformat(),
                "senha_historia": [],
                "require_2fa": False,
                "grupos": [],
                "permissoes": []
            },
            {
                "id": str(uuid4()),
                "nome": "Vendedor Teste",
                "email": "vendedor@emilyerp.com",
                "senha_hash": pwd_context.hash("vendedor123"),
                "papel": "vendedor",
                "role_id": vendedor_role["id"],
                "ativo": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "login_attempts": 0,
                "locked_until": None,
                "senha_ultimo_change": datetime.now(timezone.utc).isoformat(),
                "senha_historia": [],
                "require_2fa": False,
                "grupos": [],
                "permissoes": []
            }
        ]
        
        await self.db.users.insert_many(users)
        print(f"✅ {len(users)} usuários criados")
        print("\n📝 Credenciais de acesso:")
        print("   Admin: admin@emilyerp.com / admin123")
        print("   Vendedor: vendedor@emilyerp.com / vendedor123")
        return users
    
    async def create_marcas(self):
        """Cria marcas iniciais"""
        print("\n🏷️ Criando marcas...")
        
        marcas = [
            {"id": str(uuid4()), "nome": "Sem Marca", "descricao": "Produtos sem marca definida"},
            {"id": str(uuid4()), "nome": "Nike", "descricao": "Artigos esportivos"},
            {"id": str(uuid4()), "nome": "Adidas", "descricao": "Vestuário e calçados"},
            {"id": str(uuid4()), "nome": "Samsung", "descricao": "Eletrônicos e tecnologia"},
            {"id": str(uuid4()), "nome": "Apple", "descricao": "Tecnologia premium"},
        ]
        
        await self.db.marcas.insert_many(marcas)
        print(f"✅ {len(marcas)} marcas criadas")
        return marcas
    
    async def create_categorias(self):
        """Cria categorias iniciais"""
        print("\n📂 Criando categorias...")
        
        categorias = [
            {"id": str(uuid4()), "nome": "Vestuário", "descricao": "Roupas e acessórios"},
            {"id": str(uuid4()), "nome": "Calçados", "descricao": "Sapatos, tênis e sandálias"},
            {"id": str(uuid4()), "nome": "Eletrônicos", "descricao": "Aparelhos eletrônicos"},
            {"id": str(uuid4()), "nome": "Brinquedos", "descricao": "Brinquedos infantis"},
            {"id": str(uuid4()), "nome": "Alimentos", "descricao": "Produtos alimentícios"},
        ]
        
        await self.db.categorias.insert_many(categorias)
        print(f"✅ {len(categorias)} categorias criadas")
        return categorias
    
    async def create_subcategorias(self, categorias):
        """Cria subcategorias iniciais"""
        print("\n📁 Criando subcategorias...")
        
        vestuario = next(c for c in categorias if c["nome"] == "Vestuário")
        calcados = next(c for c in categorias if c["nome"] == "Calçados")
        eletronicos = next(c for c in categorias if c["nome"] == "Eletrônicos")
        
        subcategorias = [
            {"id": str(uuid4()), "nome": "Camisetas", "categoria_id": vestuario["id"]},
            {"id": str(uuid4()), "nome": "Calças", "categoria_id": vestuario["id"]},
            {"id": str(uuid4()), "nome": "Tênis Esportivos", "categoria_id": calcados["id"]},
            {"id": str(uuid4()), "nome": "Sandálias", "categoria_id": calcados["id"]},
            {"id": str(uuid4()), "nome": "Smartphones", "categoria_id": eletronicos["id"]},
            {"id": str(uuid4()), "nome": "Notebooks", "categoria_id": eletronicos["id"]},
        ]
        
        await self.db.subcategorias.insert_many(subcategorias)
        print(f"✅ {len(subcategorias)} subcategorias criadas")
        return subcategorias
    
    async def create_produtos(self, marcas, categorias, subcategorias):
        """Cria produtos de exemplo"""
        print("\n📦 Criando produtos...")
        
        nike = next(m for m in marcas if m["nome"] == "Nike")
        samsung = next(m for m in marcas if m["nome"] == "Samsung")
        vestuario = next(c for c in categorias if c["nome"] == "Vestuário")
        eletronicos = next(c for c in categorias if c["nome"] == "Eletrônicos")
        camisetas = next(s for s in subcategorias if s["nome"] == "Camisetas")
        smartphones = next(s for s in subcategorias if s["nome"] == "Smartphones")
        
        produtos = [
            {
                "id": str(uuid4()),
                "nome": "Camiseta Nike Dry-Fit",
                "descricao": "Camiseta esportiva com tecnologia Dry-Fit",
                "sku": "NIKE-CAM-001",
                "codigo_barras": "7891234567890",
                "marca_id": nike["id"],
                "categoria_id": vestuario["id"],
                "subcategoria_id": camisetas["id"],
                "preco_custo": 35.00,
                "preco_venda": 89.90,
                "estoque_atual": 50,
                "estoque_minimo": 10,
                "estoque_maximo": 100,
                "ativo": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid4()),
                "nome": "Smartphone Samsung Galaxy A54",
                "descricao": "Smartphone 5G com câmera de 50MP",
                "sku": "SAMS-SM-A54",
                "codigo_barras": "7891234567891",
                "marca_id": samsung["id"],
                "categoria_id": eletronicos["id"],
                "subcategoria_id": smartphones["id"],
                "preco_custo": 1200.00,
                "preco_venda": 1799.00,
                "estoque_atual": 15,
                "estoque_minimo": 5,
                "estoque_maximo": 30,
                "ativo": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid4()),
                "nome": "Camiseta Nike Basic",
                "descricao": "Camiseta básica 100% algodão",
                "sku": "NIKE-CAM-002",
                "codigo_barras": "7891234567892",
                "marca_id": nike["id"],
                "categoria_id": vestuario["id"],
                "subcategoria_id": camisetas["id"],
                "preco_custo": 25.00,
                "preco_venda": 59.90,
                "estoque_atual": 80,
                "estoque_minimo": 20,
                "estoque_maximo": 150,
                "ativo": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
        ]
        
        await self.db.produtos.insert_many(produtos)
        print(f"✅ {len(produtos)} produtos criados")
        return produtos
    
    async def create_clientes(self):
        """Cria clientes de exemplo"""
        print("\n👥 Criando clientes...")
        
        clientes = [
            {
                "id": str(uuid4()),
                "nome": "João Silva Santos",
                "cpf_cnpj": "123.456.789-00",
                "telefone": "(11) 98765-4321",
                "email": "joao.silva@email.com",
                "endereco": "Rua das Flores, 123 - São Paulo/SP",
                "observacoes": "Cliente VIP",
                "ativo": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid4()),
                "nome": "Maria Oliveira Ltda",
                "cpf_cnpj": "12.345.678/0001-90",
                "telefone": "(11) 3456-7890",
                "email": "contato@mariaoliveira.com.br",
                "endereco": "Av. Paulista, 1000 - São Paulo/SP",
                "observacoes": "Empresa de médio porte",
                "ativo": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid4()),
                "nome": "Pedro Costa",
                "cpf_cnpj": "987.654.321-00",
                "telefone": "(21) 99876-5432",
                "email": "pedro.costa@email.com",
                "endereco": "Rua do Comércio, 456 - Rio de Janeiro/RJ",
                "observacoes": "",
                "ativo": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
        ]
        
        await self.db.clientes.insert_many(clientes)
        print(f"✅ {len(clientes)} clientes criados")
        return clientes
    
    async def create_fornecedores(self):
        """Cria fornecedores de exemplo"""
        print("\n🏢 Criando fornecedores...")
        
        fornecedores = [
            {
                "id": str(uuid4()),
                "nome": "Nike Brasil Ltda",
                "cnpj": "12.345.678/0001-90",
                "telefone": "(11) 3000-0000",
                "email": "vendas@nike.com.br",
                "endereco": "Av. Industrial, 1000 - São Paulo/SP",
                "ativo": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid4()),
                "nome": "Samsung Eletrônica da Amazônia Ltda",
                "cnpj": "98.765.432/0001-10",
                "telefone": "(92) 3500-0000",
                "email": "comercial@samsung.com.br",
                "endereco": "Av. das Nações, 500 - Manaus/AM",
                "ativo": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
        ]
        
        await self.db.fornecedores.insert_many(fornecedores)
        print(f"✅ {len(fornecedores)} fornecedores criados")
        return fornecedores
    
    async def create_configuracoes_financeiras(self):
        """Cria configurações financeiras"""
        print("\n⚙️ Criando configurações financeiras...")
        
        config = {
            "id": str(uuid4()),
            "formas_pagamento": [
                {"id": str(uuid4()), "nome": "Dinheiro", "ativo": True, "taxa": 0},
                {"id": str(uuid4()), "nome": "PIX", "ativo": True, "taxa": 0},
                {"id": str(uuid4()), "nome": "Cartão de Débito", "ativo": True, "taxa": 2.5},
                {"id": str(uuid4()), "nome": "Cartão de Crédito", "ativo": True, "taxa": 3.5},
                {"id": str(uuid4()), "nome": "Boleto", "ativo": True, "taxa": 2.0},
            ],
            "condicoes_pagamento": [
                {"id": str(uuid4()), "nome": "À Vista", "parcelas": 1},
                {"id": str(uuid4()), "nome": "2x sem juros", "parcelas": 2},
                {"id": str(uuid4()), "nome": "3x sem juros", "parcelas": 3},
                {"id": str(uuid4()), "nome": "4x sem juros", "parcelas": 4},
                {"id": str(uuid4()), "nome": "5x sem juros", "parcelas": 5},
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.configuracoes_financeiras.insert_one(config)
        print("✅ Configurações financeiras criadas")
    
    async def create_indexes(self):
        """Cria índices para melhor performance"""
        print("\n🔍 Criando índices...")
        
        # Índices únicos
        await self.db.users.create_index("email", unique=True)
        await self.db.produtos.create_index("sku", unique=True)
        await self.db.clientes.create_index("cpf_cnpj", unique=True)
        await self.db.fornecedores.create_index("cnpj", unique=True)
        
        # Índices de busca
        await self.db.produtos.create_index("nome")
        await self.db.clientes.create_index("nome")
        await self.db.vendas.create_index("numero")
        await self.db.orcamentos.create_index("numero")
        
        print("✅ Índices criados")
    
    async def initialize_all(self, drop_existing=False):
        """Inicializa todo o banco de dados"""
        try:
            print("=" * 80)
            print("🚀 INICIALIZAÇÃO DO BANCO DE DADOS - EMILY KIDS ERP")
            print("=" * 80)
            
            if drop_existing:
                confirm = input("\n⚠️  ATENÇÃO: Isso vai DELETAR todos os dados existentes! Confirma? (digite 'SIM'): ")
                if confirm != "SIM":
                    print("❌ Operação cancelada")
                    return
                await self.drop_all_collections()
            
            # Criar dados na ordem correta (respeitando dependências)
            permissions = await self.create_permissions()
            roles = await self.create_roles(permissions)
            users = await self.create_users(roles)
            marcas = await self.create_marcas()
            categorias = await self.create_categorias()
            subcategorias = await self.create_subcategorias(categorias)
            produtos = await self.create_produtos(marcas, categorias, subcategorias)
            clientes = await self.create_clientes()
            fornecedores = await self.create_fornecedores()
            await self.create_configuracoes_financeiras()
            await self.create_indexes()
            
            print("\n" + "=" * 80)
            print("✅ BANCO DE DADOS INICIALIZADO COM SUCESSO!")
            print("=" * 80)
            print("\n📊 Resumo:")
            print(f"   • {len(permissions)} permissões")
            print(f"   • {len(roles)} papéis")
            print(f"   • {len(users)} usuários")
            print(f"   • {len(marcas)} marcas")
            print(f"   • {len(categorias)} categorias")
            print(f"   • {len(subcategorias)} subcategorias")
            print(f"   • {len(produtos)} produtos")
            print(f"   • {len(clientes)} clientes")
            print(f"   • {len(fornecedores)} fornecedores")
            
            print("\n🔐 Credenciais de acesso:")
            print("   Admin:    admin@emilyerp.com    / admin123")
            print("   Vendedor: vendedor@emilyerp.com / vendedor123")
            
            print("\n🌐 Próximos passos:")
            print("   1. Inicie o backend: uvicorn server:app --reload --port 8001")
            print("   2. Inicie o frontend: npm run dev")
            print("   3. Acesse: http://localhost:3000 (ou 5173)")
            print("=" * 80)
            
        except Exception as e:
            print(f"\n❌ ERRO durante inicialização: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
        finally:
            self.client.close()

async def main():
    """Função principal"""
    initializer = DatabaseInitializer()
    
    # Perguntar se deve limpar dados existentes
    print("\n🗄️  Inicialização do Banco de Dados")
    print("\nOpções:")
    print("1. Criar dados (manter existentes)")
    print("2. Limpar tudo e criar do zero")
    
    choice = input("\nEscolha uma opção (1 ou 2): ").strip()
    
    drop_existing = (choice == "2")
    
    await initializer.initialize_all(drop_existing=drop_existing)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Operação cancelada pelo usuário")
        sys.exit(0)
