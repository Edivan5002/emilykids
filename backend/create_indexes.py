"""
Script para criar índices no MongoDB
Melhora significativamente a performance das queries
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def create_all_indexes():
    """Cria todos os índices necessários no MongoDB"""
    
    # Conectar ao MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client.emily_kids
    
    print("🔧 Criando índices no MongoDB...")
    print("-" * 50)
    
    try:
        # PRODUTOS
        print("📦 Criando índices em 'produtos'...")
        await db.produtos.create_index("sku", unique=True)
        await db.produtos.create_index([("marca_id", 1), ("ativo", 1)])
        await db.produtos.create_index("categoria_id")
        await db.produtos.create_index("subcategoria_id")
        await db.produtos.create_index("fornecedor_preferencial_id")
        await db.produtos.create_index("ativo")
        print("   ✅ 6 índices criados em 'produtos'")
        
        # VENDAS
        print("💰 Criando índices em 'vendas'...")
        await db.vendas.create_index("numero_venda", unique=True)
        await db.vendas.create_index([("cliente_id", 1), ("created_at", -1)])
        await db.vendas.create_index("status_venda")
        await db.vendas.create_index("status_entrega")
        await db.vendas.create_index("orcamento_id")
        await db.vendas.create_index([("created_at", -1)])
        await db.vendas.create_index("cancelada")
        print("   ✅ 7 índices criados em 'vendas'")
        
        # ORÇAMENTOS
        print("📋 Criando índices em 'orcamentos'...")
        await db.orcamentos.create_index([("cliente_id", 1), ("status", 1)])
        await db.orcamentos.create_index("data_validade")
        await db.orcamentos.create_index([("created_at", -1)])
        await db.orcamentos.create_index("status")
        print("   ✅ 4 índices criados em 'orcamentos'")
        
        # MOVIMENTAÇÕES DE ESTOQUE
        print("📊 Criando índices em 'movimentacoes_estoque'...")
        await db.movimentacoes_estoque.create_index([("produto_id", 1), ("created_at", -1)])
        await db.movimentacoes_estoque.create_index([("tipo", 1), ("created_at", -1)])
        await db.movimentacoes_estoque.create_index("user_id")
        await db.movimentacoes_estoque.create_index([("created_at", -1)])
        print("   ✅ 4 índices criados em 'movimentacoes_estoque'")
        
        # CLIENTES
        print("👥 Criando índices em 'clientes'...")
        await db.clientes.create_index("cpf_cnpj", unique=True)
        await db.clientes.create_index("ativo")
        await db.clientes.create_index("nome")
        print("   ✅ 3 índices criados em 'clientes'")
        
        # FORNECEDORES
        print("🏢 Criando índices em 'fornecedores'...")
        await db.fornecedores.create_index("cnpj", unique=True)
        await db.fornecedores.create_index("ativo")
        await db.fornecedores.create_index("razao_social")
        print("   ✅ 3 índices criados em 'fornecedores'")
        
        # NOTAS FISCAIS
        print("📄 Criando índices em 'notas_fiscais'...")
        await db.notas_fiscais.create_index("numero_nota", unique=True)
        await db.notas_fiscais.create_index([("fornecedor_id", 1), ("status", 1)])
        await db.notas_fiscais.create_index([("created_at", -1)])
        await db.notas_fiscais.create_index("status")
        await db.notas_fiscais.create_index("cancelada")
        print("   ✅ 5 índices criados em 'notas_fiscais'")
        
        # MARCAS
        print("🏷️  Criando índices em 'marcas'...")
        await db.marcas.create_index("nome")
        await db.marcas.create_index("ativo")
        print("   ✅ 2 índices criados em 'marcas'")
        
        # CATEGORIAS
        print("📁 Criando índices em 'categorias'...")
        await db.categorias.create_index("marca_id")
        await db.categorias.create_index("ativo")
        await db.categorias.create_index("nome")
        print("   ✅ 3 índices criados em 'categorias'")
        
        # SUBCATEGORIAS
        print("📂 Criando índices em 'subcategorias'...")
        await db.subcategorias.create_index("categoria_id")
        await db.subcategorias.create_index("ativo")
        await db.subcategorias.create_index("nome")
        print("   ✅ 3 índices criados em 'subcategorias'")
        
        # USUÁRIOS
        print("👤 Criando índices em 'usuarios'...")
        await db.usuarios.create_index("email", unique=True)
        await db.usuarios.create_index("papel")
        await db.usuarios.create_index("ativo")
        print("   ✅ 3 índices criados em 'usuarios'")
        
        # LOGS (já existem alguns, mas vamos adicionar mais)
        print("📝 Criando índices em 'logs'...")
        await db.logs.create_index([("timestamp", -1)])
        await db.logs.create_index("user_id")
        await db.logs.create_index("modulo")
        await db.logs.create_index("acao")
        await db.logs.create_index("severidade")
        print("   ✅ 5 índices criados em 'logs'")
        
        print("-" * 50)
        print("✅ TODOS OS ÍNDICES CRIADOS COM SUCESSO!")
        print(f"📊 Total: 48 índices criados")
        print("-" * 50)
        
        # Listar todos os índices criados para verificação
        print("\n📋 Verificando índices criados:")
        collections = [
            'produtos', 'vendas', 'orcamentos', 'movimentacoes_estoque',
            'clientes', 'fornecedores', 'notas_fiscais', 'marcas',
            'categorias', 'subcategorias', 'usuarios', 'logs'
        ]
        
        for collection_name in collections:
            collection = db[collection_name]
            indexes = await collection.index_information()
            print(f"   {collection_name}: {len(indexes)} índices")
        
    except Exception as e:
        print(f"❌ Erro ao criar índices: {str(e)}")
    finally:
        client.close()
        print("\n🔒 Conexão com MongoDB fechada")

if __name__ == "__main__":
    asyncio.run(create_all_indexes())
