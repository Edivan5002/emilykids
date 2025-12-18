#!/usr/bin/env python3
"""
Script de Criação de Índices MongoDB - Emily Kids ERP
Cria índices para garantir unicidade e melhorar performance.

Uso: python scripts/create_indexes.py

Features:
- Idempotente (pode rodar múltiplas vezes)
- Detecta duplicatas antes de criar índices únicos
- Relatório detalhado de sucessos e falhas
- Lê configuração do .env
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime

# Configuração do MongoDB
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "inventoai_db")

class IndexCreator:
    def __init__(self):
        self.client = AsyncIOMotorClient(MONGO_URL)
        self.db = self.client[DB_NAME]
        self.report = {
            "created": [],
            "existing": [],
            "failed": [],
            "duplicates_found": []
        }
    
    async def check_duplicates(self, collection_name, field_name):
        """Verifica se há valores duplicados em um campo"""
        collection = self.db[collection_name]
        
        pipeline = [
            {"$group": {
                "_id": f"${field_name}",
                "count": {"$sum": 1},
                "ids": {"$push": "$id"}
            }},
            {"$match": {"count": {"$gt": 1}}}
        ]
        
        duplicates = await collection.aggregate(pipeline).to_list(None)
        return duplicates
    
    async def create_index_safe(self, collection_name, index_spec, **options):
        """Cria índice de forma segura, verificando duplicatas se for único"""
        collection = self.db[collection_name]
        
        # Extrair nome do campo para verificação
        if isinstance(index_spec, list):
            field_name = index_spec[0][0] if index_spec else None
        elif isinstance(index_spec, str):
            field_name = index_spec
        else:
            field_name = list(index_spec.keys())[0] if index_spec else None
        
        index_name = options.get("name", f"{collection_name}_{field_name}_idx")
        is_unique = options.get("unique", False)
        
        # Se for único, verificar duplicatas primeiro
        if is_unique and field_name:
            duplicates = await self.check_duplicates(collection_name, field_name)
            
            if duplicates:
                self.report["duplicates_found"].append({
                    "collection": collection_name,
                    "field": field_name,
                    "duplicates": [
                        {
                            "value": dup["_id"],
                            "count": dup["count"],
                            "ids": dup["ids"][:5]  # Primeiros 5 IDs
                        }
                        for dup in duplicates[:10]  # Primeiras 10 duplicatas
                    ]
                })
                
                self.report["failed"].append({
                    "collection": collection_name,
                    "index": index_name,
                    "reason": f"Duplicatas encontradas em '{field_name}' ({len(duplicates)} valores duplicados)"
                })
                
                return False
        
        # Tentar criar índice
        try:
            # Verificar se índice já existe
            existing_indexes = await collection.index_information()
            
            if index_name in existing_indexes:
                self.report["existing"].append({
                    "collection": collection_name,
                    "index": index_name
                })
                return True
            
            # Criar índice
            await collection.create_index(index_spec, **options)
            
            self.report["created"].append({
                "collection": collection_name,
                "index": index_name,
                "spec": str(index_spec),
                "unique": is_unique
            })
            
            return True
            
        except Exception as e:
            self.report["failed"].append({
                "collection": collection_name,
                "index": index_name,
                "reason": str(e)
            })
            return False
    
    async def create_all_indexes(self):
        """Cria todos os índices necessários"""
        print("=" * 80)
        print("🔨 CRIAÇÃO DE ÍNDICES - EMILY KIDS ERP")
        print("=" * 80)
        print(f"\n📊 Banco de dados: {DB_NAME}")
        print(f"🔗 URL: {MONGO_URL}\n")
        
        # ====================================================================
        # USERS - Usuários e Autenticação
        # ====================================================================
        print("👥 Criando índices para: users")
        
        await self.create_index_safe("users", "email", unique=True, name="users_email_unique")
        await self.create_index_safe("users", "id", unique=True, name="users_id_unique")
        await self.create_index_safe("users", "role_id", name="users_role_id_idx")
        
        # ====================================================================
        # PRODUTOS - Catálogo
        # ====================================================================
        print("\n📦 Criando índices para: produtos")
        
        await self.create_index_safe("produtos", "sku", unique=True, name="produtos_sku_unique")
        await self.create_index_safe("produtos", "codigo_barras", unique=True, sparse=True, name="produtos_codigo_barras_unique")
        await self.create_index_safe("produtos", "marca_id", name="produtos_marca_id_idx")
        await self.create_index_safe("produtos", "categoria_id", name="produtos_categoria_id_idx")
        await self.create_index_safe("produtos", "subcategoria_id", name="produtos_subcategoria_id_idx")
        await self.create_index_safe("produtos", "ativo", name="produtos_ativo_idx")
        
        # ====================================================================
        # CONTAS A PAGAR - Financeiro
        # ====================================================================
        print("\n💳 Criando índices para: contas_pagar")
        
        await self.create_index_safe("contas_pagar", "numero", unique=True, name="contas_pagar_numero_unique")
        await self.create_index_safe("contas_pagar", "fornecedor_id", name="contas_pagar_fornecedor_id_idx")
        await self.create_index_safe("contas_pagar", "status", name="contas_pagar_status_idx")
        await self.create_index_safe("contas_pagar", "cancelada", name="contas_pagar_cancelada_idx")
        await self.create_index_safe("contas_pagar", "created_at", name="contas_pagar_created_at_idx")
        await self.create_index_safe("contas_pagar", "categoria", name="contas_pagar_categoria_idx")
        
        # Índice composto para queries do dashboard
        await self.create_index_safe("contas_pagar", [
            ("cancelada", 1),
            ("status", 1)
        ], name="contas_pagar_cancelada_status_idx")
        
        # ====================================================================
        # CONTAS A RECEBER - Financeiro
        # ====================================================================
        print("\n💰 Criando índices para: contas_receber")
        
        await self.create_index_safe("contas_receber", "numero", unique=True, name="contas_receber_numero_unique")
        await self.create_index_safe("contas_receber", "cliente_id", name="contas_receber_cliente_id_idx")
        await self.create_index_safe("contas_receber", "status", name="contas_receber_status_idx")
        await self.create_index_safe("contas_receber", "cancelada", name="contas_receber_cancelada_idx")
        await self.create_index_safe("contas_receber", "created_at", name="contas_receber_created_at_idx")
        await self.create_index_safe("contas_receber", "venda_id", name="contas_receber_venda_id_idx")
        
        # Índice composto para queries do dashboard
        await self.create_index_safe("contas_receber", [
            ("cancelada", 1),
            ("status", 1)
        ], name="contas_receber_cancelada_status_idx")
        
        # ====================================================================
        # VENDAS
        # ====================================================================
        print("\n🛒 Criando índices para: vendas")
        
        await self.create_index_safe("vendas", "numero_venda", unique=True, name="vendas_numero_venda_unique")
        await self.create_index_safe("vendas", "cliente_id", name="vendas_cliente_id_idx")
        await self.create_index_safe("vendas", "cancelada", name="vendas_cancelada_idx")
        await self.create_index_safe("vendas", "created_at", name="vendas_created_at_idx")
        
        # ====================================================================
        # ORÇAMENTOS
        # ====================================================================
        print("\n📋 Criando índices para: orcamentos")
        
        await self.create_index_safe("orcamentos", "numero", unique=True, sparse=True, name="orcamentos_numero_unique")
        await self.create_index_safe("orcamentos", "cliente_id", name="orcamentos_cliente_id_idx")
        await self.create_index_safe("orcamentos", "status", name="orcamentos_status_idx")
        await self.create_index_safe("orcamentos", "venda_id", name="orcamentos_venda_id_idx")
        
        # ====================================================================
        # CLIENTES
        # ====================================================================
        print("\n👤 Criando índices para: clientes")
        
        await self.create_index_safe("clientes", "cpf_cnpj", unique=True, sparse=True, name="clientes_cpf_cnpj_unique")
        await self.create_index_safe("clientes", "email", name="clientes_email_idx")
        await self.create_index_safe("clientes", "ativo", name="clientes_ativo_idx")
        
        # ====================================================================
        # FORNECEDORES
        # ====================================================================
        print("\n🏢 Criando índices para: fornecedores")
        
        await self.create_index_safe("fornecedores", "cnpj", unique=True, sparse=True, name="fornecedores_cnpj_unique")
        await self.create_index_safe("fornecedores", "ativo", name="fornecedores_ativo_idx")
        
        # ====================================================================
        # RBAC - Roles e Permissions
        # ====================================================================
        print("\n🔐 Criando índices para: roles")
        
        await self.create_index_safe("roles", "nome", unique=True, name="roles_nome_unique")
        await self.create_index_safe("roles", "id", unique=True, name="roles_id_unique")
        
        print("\n🔑 Criando índices para: permissions")
        
        await self.create_index_safe("permissions", "id", unique=True, name="permissions_id_unique")
        
        # Índice composto único para (modulo, acao)
        await self.create_index_safe("permissions", [
            ("modulo", 1),
            ("acao", 1)
        ], unique=True, name="permissions_modulo_acao_unique")
        
        print("\n👥 Criando índices para: user_groups")
        
        await self.create_index_safe("user_groups", "nome", unique=True, name="user_groups_nome_unique")
        
        # ====================================================================
        # LOGS - Performance e Auditoria
        # ====================================================================
        print("\n📝 Criando índices para: logs")
        
        await self.create_index_safe("logs", "timestamp", name="logs_timestamp_idx")
        await self.create_index_safe("logs", "user_id", name="logs_user_id_idx")
        await self.create_index_safe("logs", "tela", name="logs_tela_idx")
        await self.create_index_safe("logs", "severidade", name="logs_severidade_idx")
        
        # Índice composto para queries comuns
        await self.create_index_safe("logs", [
            ("timestamp", -1),
            ("severidade", 1)
        ], name="logs_timestamp_severidade_idx")
        
        # ====================================================================
        # COUNTERS - Numeração Sequencial
        # ====================================================================
        print("\n🔢 Criando índices para: counters")
        
        await self.create_index_safe("counters", "name", unique=True, name="counters_name_unique")
        
        # ====================================================================
        # RELATÓRIO FINAL
        # ====================================================================
        print("\n" + "=" * 80)
        print("📊 RELATÓRIO FINAL")
        print("=" * 80)
        
        print(f"\n✅ Índices criados: {len(self.report['created'])}")
        for item in self.report['created']:
            unique_flag = " [UNIQUE]" if item['unique'] else ""
            print(f"   • {item['collection']}.{item['index']}{unique_flag}")
        
        print(f"\n⚠️  Índices já existiam: {len(self.report['existing'])}")
        for item in self.report['existing']:
            print(f"   • {item['collection']}.{item['index']}")
        
        if self.report['failed']:
            print(f"\n❌ Falhas: {len(self.report['failed'])}")
            for item in self.report['failed']:
                print(f"   • {item['collection']}.{item['index']}")
                print(f"     Motivo: {item['reason']}")
        
        if self.report['duplicates_found']:
            print(f"\n⚠️  DUPLICATAS ENCONTRADAS: {len(self.report['duplicates_found'])}")
            print("\n" + "=" * 80)
            print("🔍 RELATÓRIO DE DUPLICATAS")
            print("=" * 80)
            
            for dup_report in self.report['duplicates_found']:
                print(f"\n📦 Collection: {dup_report['collection']}")
                print(f"🔑 Campo: {dup_report['field']}")
                print(f"📊 Total de valores duplicados: {len(dup_report['duplicates'])}")
                
                for dup in dup_report['duplicates'][:5]:  # Mostrar primeiras 5
                    print(f"\n   Valor: '{dup['value']}'")
                    print(f"   Ocorrências: {dup['count']}")
                    print(f"   IDs exemplo: {', '.join(str(id)[:8] + '...' for id in dup['ids'][:3])}")
                
                print("\n   💡 Ação recomendada:")
                print(f"      1. Revisar documentos duplicados manualmente")
                print(f"      2. Decidir qual manter e qual remover/atualizar")
                print(f"      3. Executar correção no MongoDB")
                print(f"      4. Rodar este script novamente")
        
        # Estatísticas gerais
        total_collections = len(set(
            [item['collection'] for item in self.report['created']] +
            [item['collection'] for item in self.report['existing']] +
            [item['collection'] for item in self.report['failed']]
        ))
        
        print("\n" + "=" * 80)
        print(f"📈 ESTATÍSTICAS GERAIS")
        print("=" * 80)
        print(f"   • Collections processadas: {total_collections}")
        print(f"   • Total de índices criados: {len(self.report['created'])}")
        print(f"   • Total de índices já existentes: {len(self.report['existing'])}")
        print(f"   • Total de falhas: {len(self.report['failed'])}")
        
        success_rate = (len(self.report['created']) + len(self.report['existing'])) / (
            len(self.report['created']) + len(self.report['existing']) + len(self.report['failed'])
        ) * 100 if (len(self.report['created']) + len(self.report['existing']) + len(self.report['failed'])) > 0 else 0
        
        print(f"   • Taxa de sucesso: {success_rate:.1f}%")
        
        if len(self.report['failed']) == 0 and len(self.report['duplicates_found']) == 0:
            print("\n✅ TODOS OS ÍNDICES FORAM CRIADOS COM SUCESSO!")
        elif len(self.report['failed']) > 0:
            print("\n⚠️  Alguns índices não puderam ser criados. Verifique os erros acima.")
        
        print("=" * 80)
        
        self.client.close()

async def main():
    """Função principal"""
    creator = IndexCreator()
    await creator.create_all_indexes()

if __name__ == "__main__":
    asyncio.run(main())
