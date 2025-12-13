#!/usr/bin/env python3
"""
Script de Exportação Completa do Banco de Dados MongoDB
Exporta TODA a estrutura, índices e dados do banco inventoai_db

Uso: python export_database.py

Gera arquivo: inventoai_db_backup_YYYYMMDD_HHMMSS.json
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import json
from datetime import datetime
import os
import sys

# Configuração do MongoDB
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "inventoai_db")

class DatabaseExporter:
    def __init__(self):
        self.client = AsyncIOMotorClient(MONGO_URL)
        self.db = self.client[DB_NAME]
        self.export_data = {
            "metadata": {
                "database_name": DB_NAME,
                "export_date": datetime.now().isoformat(),
                "mongo_version": None,
                "total_collections": 0,
                "total_documents": 0
            },
            "collections": {}
        }
    
    async def get_server_info(self):
        """Obtém informações do servidor MongoDB"""
        try:
            server_info = await self.client.server_info()
            self.export_data["metadata"]["mongo_version"] = server_info.get("version", "unknown")
            print(f"📊 MongoDB Version: {self.export_data['metadata']['mongo_version']}")
        except Exception as e:
            print(f"⚠️  Não foi possível obter versão do MongoDB: {e}")
    
    async def export_collection(self, collection_name):
        """Exporta uma collection completa incluindo índices"""
        print(f"\n📦 Exportando collection: {collection_name}")
        
        collection = self.db[collection_name]
        
        # Obter todos os documentos
        documents = await collection.find({}, {"_id": 0}).to_list(None)
        doc_count = len(documents)
        print(f"   └─ {doc_count} documentos encontrados")
        
        # Obter índices
        indexes = []
        async for index in collection.list_indexes():
            # Remover _id interno do MongoDB
            if "_id" in index:
                del index["_id"]
            indexes.append(index)
        print(f"   └─ {len(indexes)} índices encontrados")
        
        # Obter validação de schema (se houver)
        try:
            collection_info = await self.db.command("listCollections", filter={"name": collection_name})
            validator = None
            if collection_info and "cursor" in collection_info:
                for coll in collection_info["cursor"]["firstBatch"]:
                    if "options" in coll and "validator" in coll["options"]:
                        validator = coll["options"]["validator"]
            
            if validator:
                print(f"   └─ Schema validator encontrado")
        except:
            validator = None
        
        return {
            "name": collection_name,
            "document_count": doc_count,
            "documents": documents,
            "indexes": indexes,
            "validator": validator,
            "exported_at": datetime.now().isoformat()
        }
    
    async def export_all(self):
        """Exporta todo o banco de dados"""
        try:
            print("=" * 80)
            print("🚀 EXPORTAÇÃO COMPLETA DO BANCO DE DADOS")
            print("=" * 80)
            print(f"\n🗄️  Banco de dados: {DB_NAME}")
            print(f"🔗 URL: {MONGO_URL}")
            
            await self.get_server_info()
            
            # Listar todas as collections
            collection_names = await self.db.list_collection_names()
            self.export_data["metadata"]["total_collections"] = len(collection_names)
            
            print(f"\n📋 Collections encontradas: {len(collection_names)}")
            for name in collection_names:
                print(f"   • {name}")
            
            # Exportar cada collection
            print("\n" + "=" * 80)
            print("📤 INICIANDO EXPORTAÇÃO")
            print("=" * 80)
            
            total_documents = 0
            for collection_name in collection_names:
                collection_data = await self.export_collection(collection_name)
                self.export_data["collections"][collection_name] = collection_data
                total_documents += collection_data["document_count"]
            
            self.export_data["metadata"]["total_documents"] = total_documents
            
            # Gerar nome do arquivo
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"inventoai_db_backup_{timestamp}.json"
            
            # Salvar arquivo
            print("\n" + "=" * 80)
            print("💾 SALVANDO ARQUIVO")
            print("=" * 80)
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.export_data, f, ensure_ascii=False, indent=2, default=str)
            
            # Obter tamanho do arquivo
            file_size = os.path.getsize(filename)
            file_size_mb = file_size / (1024 * 1024)
            
            print(f"\n✅ Arquivo salvo: {filename}")
            print(f"📏 Tamanho: {file_size_mb:.2f} MB ({file_size:,} bytes)")
            
            # Resumo final
            print("\n" + "=" * 80)
            print("✅ EXPORTAÇÃO CONCLUÍDA COM SUCESSO!")
            print("=" * 80)
            print("\n📊 Resumo da Exportação:")
            print(f"   • Database: {DB_NAME}")
            print(f"   • Collections: {self.export_data['metadata']['total_collections']}")
            print(f"   • Documentos totais: {self.export_data['metadata']['total_documents']:,}")
            print(f"   • Arquivo: {filename}")
            print(f"   • Tamanho: {file_size_mb:.2f} MB")
            
            print("\n📋 Documentos por collection:")
            for coll_name, coll_data in self.export_data["collections"].items():
                print(f"   • {coll_name}: {coll_data['document_count']:,} documentos, {len(coll_data['indexes'])} índices")
            
            print("\n" + "=" * 80)
            print("🚀 PRÓXIMOS PASSOS:")
            print("=" * 80)
            print(f"1. Baixe o arquivo: {filename}")
            print("2. Copie para sua máquina local na pasta backend/")
            print("3. Execute: python import_database.py")
            print("=" * 80)
            
            return filename
            
        except Exception as e:
            print(f"\n❌ ERRO durante exportação: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
        finally:
            self.client.close()

async def main():
    """Função principal"""
    exporter = DatabaseExporter()
    await exporter.export_all()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Exportação cancelada pelo usuário")
        sys.exit(0)
