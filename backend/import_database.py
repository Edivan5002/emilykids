#!/usr/bin/env python3
"""
Script de Importação Completa do Banco de Dados MongoDB
Importa TODA a estrutura, índices e dados para o banco inventoai_db local

Uso: python import_database.py [arquivo_backup.json]

Se não especificar arquivo, procura o mais recente na pasta atual.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import json
from datetime import datetime
import os
import sys
import glob

# Configuração do MongoDB LOCAL
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "inventoai_db"

class DatabaseImporter:
    def __init__(self, backup_file):
        self.backup_file = backup_file
        self.client = AsyncIOMotorClient(MONGO_URL)
        self.db = self.client[DB_NAME]
        self.import_data = None
        self.stats = {
            "collections_created": 0,
            "collections_updated": 0,
            "documents_inserted": 0,
            "indexes_created": 0,
            "errors": []
        }
    
    def load_backup_file(self):
        """Carrega arquivo de backup"""
        print(f"📂 Carregando arquivo: {self.backup_file}")
        
        if not os.path.exists(self.backup_file):
            print(f"❌ Arquivo não encontrado: {self.backup_file}")
            sys.exit(1)
        
        file_size = os.path.getsize(self.backup_file)
        file_size_mb = file_size / (1024 * 1024)
        print(f"📏 Tamanho do arquivo: {file_size_mb:.2f} MB")
        
        with open(self.backup_file, 'r', encoding='utf-8') as f:
            self.import_data = json.load(f)
        
        print("✅ Arquivo carregado com sucesso")
        print(f"\n📊 Informações do Backup:")
        print(f"   • Database: {self.import_data['metadata']['database_name']}")
        print(f"   • Data da exportação: {self.import_data['metadata']['export_date']}")
        print(f"   • Collections: {self.import_data['metadata']['total_collections']}")
        print(f"   • Documentos totais: {self.import_data['metadata']['total_documents']:,}")
    
    async def check_existing_data(self):
        """Verifica se já existem dados no banco"""
        collection_names = await self.db.list_collection_names()
        
        if not collection_names:
            print("\n✅ Banco de dados vazio - importação limpa")
            return False
        
        print(f"\n⚠️  ATENÇÃO: O banco '{DB_NAME}' já contém {len(collection_names)} collection(s):")
        
        total_docs = 0
        for coll_name in collection_names:
            count = await self.db[coll_name].count_documents({})
            total_docs += count
            print(f"   • {coll_name}: {count:,} documentos")
        
        print(f"\n   Total de documentos existentes: {total_docs:,}")
        return True
    
    async def drop_collection(self, collection_name):
        """Remove uma collection"""
        try:
            await self.db[collection_name].drop()
            print(f"   └─ Collection '{collection_name}' removida")
        except Exception as e:
            print(f"   └─ ⚠️  Erro ao remover '{collection_name}': {e}")
    
    async def import_collection(self, collection_data, replace_existing):
        """Importa uma collection"""
        collection_name = collection_data["name"]
        print(f"\n📦 Importando collection: {collection_name}")
        
        collection = self.db[collection_name]
        
        # Se for substituir, dropar collection existente
        if replace_existing:
            existing_count = await collection.count_documents({})
            if existing_count > 0:
                await self.drop_collection(collection_name)
                self.stats["collections_updated"] += 1
            else:
                self.stats["collections_created"] += 1
        else:
            self.stats["collections_created"] += 1
        
        # Inserir documentos
        documents = collection_data["documents"]
        if documents:
            try:
                result = await collection.insert_many(documents, ordered=False)
                inserted_count = len(result.inserted_ids)
                self.stats["documents_inserted"] += inserted_count
                print(f"   └─ {inserted_count:,} documentos inseridos")
            except Exception as e:
                # Se alguns documentos falharem, contar os bem-sucedidos
                if hasattr(e, 'details') and 'nInserted' in e.details:
                    inserted = e.details['nInserted']
                    self.stats["documents_inserted"] += inserted
                    print(f"   └─ ⚠️  {inserted} documentos inseridos (alguns falharam)")
                    self.stats["errors"].append(f"{collection_name}: {str(e)[:100]}")
                else:
                    print(f"   └─ ❌ Erro ao inserir documentos: {str(e)[:100]}")
                    self.stats["errors"].append(f"{collection_name}: {str(e)[:100]}")
        else:
            print(f"   └─ Nenhum documento para inserir")
        
        # Criar índices
        indexes = collection_data.get("indexes", [])
        if indexes:
            for index in indexes:
                # Pular o índice _id (já existe por padrão)
                if index.get("name") == "_id_":
                    continue
                
                try:
                    # Extrair chaves do índice
                    keys = index.get("key", {})
                    if not keys:
                        continue
                    
                    # Criar índice
                    index_name = index.get("name", "")
                    unique = index.get("unique", False)
                    
                    await collection.create_index(
                        list(keys.items()),
                        name=index_name,
                        unique=unique
                    )
                    self.stats["indexes_created"] += 1
                    print(f"   └─ Índice criado: {index_name}")
                except Exception as e:
                    print(f"   └─ ⚠️  Erro ao criar índice: {str(e)[:100]}")
        
        # Criar validator (se houver)
        validator = collection_data.get("validator")
        if validator:
            try:
                await self.db.command({
                    "collMod": collection_name,
                    "validator": validator
                })
                print(f"   └─ Schema validator aplicado")
            except Exception as e:
                print(f"   └─ ⚠️  Erro ao aplicar validator: {str(e)[:100]}")
    
    async def import_all(self, replace_existing=False):
        """Importa todo o banco de dados"""
        try:
            print("=" * 80)
            print("🚀 IMPORTAÇÃO COMPLETA DO BANCO DE DADOS")
            print("=" * 80)
            print(f"\n🗄️  Banco de dados de destino: {DB_NAME}")
            print(f"🔗 URL: {MONGO_URL}")
            
            self.load_backup_file()
            
            # Verificar dados existentes
            has_existing_data = await self.check_existing_data()
            
            if has_existing_data and not replace_existing:
                print("\n⚠️  Os dados existentes serão MANTIDOS e novos dados serão ADICIONADOS")
                print("    (pode causar duplicatas se executar múltiplas vezes)")
            elif has_existing_data and replace_existing:
                print("\n⚠️  Os dados existentes serão SUBSTITUÍDOS!")
            
            # Importar collections
            print("\n" + "=" * 80)
            print("📥 INICIANDO IMPORTAÇÃO")
            print("=" * 80)
            
            for collection_name, collection_data in self.import_data["collections"].items():
                await self.import_collection(collection_data, replace_existing)
            
            # Resumo final
            print("\n" + "=" * 80)
            print("✅ IMPORTAÇÃO CONCLUÍDA!")
            print("=" * 80)
            print("\n📊 Estatísticas da Importação:")
            print(f"   • Collections criadas: {self.stats['collections_created']}")
            print(f"   • Collections atualizadas: {self.stats['collections_updated']}")
            print(f"   • Documentos inseridos: {self.stats['documents_inserted']:,}")
            print(f"   • Índices criados: {self.stats['indexes_created']}")
            
            if self.stats["errors"]:
                print(f"\n⚠️  Erros encontrados: {len(self.stats['errors'])}")
                print("   (Alguns documentos podem ter falhado devido a duplicatas)")
                for i, error in enumerate(self.stats["errors"][:5], 1):
                    print(f"   {i}. {error}")
                if len(self.stats["errors"]) > 5:
                    print(f"   ... e mais {len(self.stats['errors']) - 5} erros")
            
            # Verificar resultado final
            print("\n📋 Collections importadas:")
            for collection_name in self.import_data["collections"].keys():
                count = await self.db[collection_name].count_documents({})
                print(f"   • {collection_name}: {count:,} documentos")
            
            print("\n" + "=" * 80)
            print("🎉 BANCO DE DADOS RESTAURADO COM SUCESSO!")
            print("=" * 80)
            print("\n🚀 Próximos passos:")
            print("1. Inicie o backend: uvicorn server:app --reload --port 8001")
            print("2. Inicie o frontend: npm run dev")
            print("3. Acesse o sistema e faça login")
            print("=" * 80)
            
        except Exception as e:
            print(f"\n❌ ERRO durante importação: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
        finally:
            self.client.close()

def find_latest_backup():
    """Encontra o arquivo de backup mais recente"""
    backup_files = glob.glob("inventoai_db_backup_*.json")
    if not backup_files:
        return None
    # Ordenar por data de modificação (mais recente primeiro)
    backup_files.sort(key=os.path.getmtime, reverse=True)
    return backup_files[0]

async def main():
    """Função principal"""
    print("=" * 80)
    print("🗄️  IMPORTADOR DE BANCO DE DADOS - EMILY KIDS ERP")
    print("=" * 80)
    
    # Determinar arquivo de backup
    if len(sys.argv) > 1:
        backup_file = sys.argv[1]
    else:
        backup_file = find_latest_backup()
        if backup_file:
            print(f"\n📂 Arquivo de backup encontrado: {backup_file}")
        else:
            print("\n❌ Nenhum arquivo de backup encontrado!")
            print("\nUso: python import_database.py [arquivo_backup.json]")
            print("\nOu coloque um arquivo inventoai_db_backup_*.json nesta pasta")
            sys.exit(1)
    
    importer = DatabaseImporter(backup_file)
    
    # Carregar e mostrar info
    importer.load_backup_file()
    
    # Verificar se há dados existentes
    has_data = await importer.check_existing_data()
    
    # Perguntar ao usuário
    print("\n" + "=" * 80)
    print("⚙️  OPÇÕES DE IMPORTAÇÃO")
    print("=" * 80)
    
    if has_data:
        print("\n1. SUBSTITUIR todos os dados existentes (LIMPA tudo antes)")
        print("2. MANTER dados existentes e ADICIONAR novos (pode causar duplicatas)")
        print("3. CANCELAR importação")
        
        while True:
            choice = input("\nEscolha uma opção (1, 2 ou 3): ").strip()
            if choice in ["1", "2", "3"]:
                break
            print("⚠️  Opção inválida. Digite 1, 2 ou 3.")
        
        if choice == "3":
            print("\n❌ Importação cancelada pelo usuário")
            sys.exit(0)
        
        replace_existing = (choice == "1")
        
        if replace_existing:
            confirm = input("\n⚠️  CONFIRMA que deseja DELETAR todos os dados existentes? (digite 'SIM'): ")
            if confirm != "SIM":
                print("\n❌ Importação cancelada")
                sys.exit(0)
    else:
        print("\n✅ Banco vazio - importação será feita normalmente")
        replace_existing = False
    
    # Executar importação
    await importer.import_all(replace_existing=replace_existing)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Importação cancelada pelo usuário")
        sys.exit(0)
