#!/usr/bin/env python3
"""
============================================================
SCRIPT DE EXPORTAÇÃO COMPLETA DO BANCO DE DADOS MONGODB
Projeto: ERP Emily Kids / InventoAI
============================================================
Este script exporta:
- Todas as collections (tabelas)
- Todos os documentos (dados)
- Todos os índices
- Estrutura completa do banco

Gera um arquivo JSON único para importação local.
============================================================
"""

import json
import os
import sys
from datetime import datetime
from bson import ObjectId, json_util

# Tentar importar motor para async ou pymongo para sync
try:
    from motor.motor_asyncio import AsyncIOMotorClient
    import asyncio
    USE_ASYNC = True
except ImportError:
    from pymongo import MongoClient
    USE_ASYNC = False

# Configurações
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = 'inventoai_db'
OUTPUT_FILE = 'inventoai_db_backup.json'

class MongoDBExporter:
    def __init__(self):
        self.data = {
            'metadata': {
                'database': DB_NAME,
                'exported_at': datetime.now().isoformat(),
                'version': '1.0',
                'description': 'Backup completo do banco de dados MongoDB - ERP Emily Kids'
            },
            'indexes': {},
            'collections': {}
        }
    
    def serialize_doc(self, doc):
        """Serializa documento MongoDB para JSON"""
        return json.loads(json_util.dumps(doc))
    
    async def export_async(self):
        """Exportação assíncrona usando Motor"""
        print(f"\n{'='*60}")
        print("   EXPORTAÇÃO DO BANCO DE DADOS MONGODB")
        print(f"{'='*60}")
        print(f"\n📦 Banco de dados: {DB_NAME}")
        print(f"🔗 Conexão: {MONGO_URL}")
        print(f"📅 Data: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
        print(f"\n{'='*60}\n")
        
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Listar collections
        collections = await db.list_collection_names()
        print(f"📋 {len(collections)} collections encontradas\n")
        
        total_docs = 0
        
        for col_name in sorted(collections):
            collection = db[col_name]
            
            # Exportar índices
            indexes = await collection.index_information()
            self.data['indexes'][col_name] = {}
            for idx_name, idx_info in indexes.items():
                if idx_name != '_id_':  # Ignorar índice padrão
                    self.data['indexes'][col_name][idx_name] = {
                        'key': idx_info.get('key'),
                        'unique': idx_info.get('unique', False),
                        'sparse': idx_info.get('sparse', False),
                        'expireAfterSeconds': idx_info.get('expireAfterSeconds')
                    }
            
            # Exportar documentos
            docs = await collection.find({}).to_list(length=None)
            self.data['collections'][col_name] = [self.serialize_doc(doc) for doc in docs]
            
            doc_count = len(docs)
            total_docs += doc_count
            idx_count = len(self.data['indexes'][col_name])
            
            status = "✅" if doc_count > 0 else "📭"
            print(f"  {status} {col_name}: {doc_count} documentos, {idx_count} índices")
        
        client.close()
        
        # Salvar arquivo
        print(f"\n{'='*60}")
        print(f"📊 Total: {total_docs} documentos em {len(collections)} collections")
        
        output_path = os.path.join(os.path.dirname(__file__), OUTPUT_FILE)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)
        
        file_size = os.path.getsize(output_path) / 1024
        print(f"💾 Arquivo gerado: {OUTPUT_FILE} ({file_size:.1f} KB)")
        print(f"\n✅ EXPORTAÇÃO CONCLUÍDA COM SUCESSO!")
        print(f"{'='*60}\n")
        
        return output_path
    
    def export_sync(self):
        """Exportação síncrona usando PyMongo"""
        print(f"\n{'='*60}")
        print("   EXPORTAÇÃO DO BANCO DE DADOS MONGODB")
        print(f"{'='*60}")
        print(f"\n📦 Banco de dados: {DB_NAME}")
        print(f"🔗 Conexão: {MONGO_URL}")
        print(f"📅 Data: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
        print(f"\n{'='*60}\n")
        
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        collections = db.list_collection_names()
        print(f"📋 {len(collections)} collections encontradas\n")
        
        total_docs = 0
        
        for col_name in sorted(collections):
            collection = db[col_name]
            
            # Exportar índices
            indexes = collection.index_information()
            self.data['indexes'][col_name] = {}
            for idx_name, idx_info in indexes.items():
                if idx_name != '_id_':
                    self.data['indexes'][col_name][idx_name] = {
                        'key': idx_info.get('key'),
                        'unique': idx_info.get('unique', False),
                        'sparse': idx_info.get('sparse', False),
                        'expireAfterSeconds': idx_info.get('expireAfterSeconds')
                    }
            
            # Exportar documentos
            docs = list(collection.find({}))
            self.data['collections'][col_name] = [self.serialize_doc(doc) for doc in docs]
            
            doc_count = len(docs)
            total_docs += doc_count
            idx_count = len(self.data['indexes'][col_name])
            
            status = "✅" if doc_count > 0 else "📭"
            print(f"  {status} {col_name}: {doc_count} documentos, {idx_count} índices")
        
        client.close()
        
        print(f"\n{'='*60}")
        print(f"📊 Total: {total_docs} documentos em {len(collections)} collections")
        
        output_path = os.path.join(os.path.dirname(__file__), OUTPUT_FILE)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)
        
        file_size = os.path.getsize(output_path) / 1024
        print(f"💾 Arquivo gerado: {OUTPUT_FILE} ({file_size:.1f} KB)")
        print(f"\n✅ EXPORTAÇÃO CONCLUÍDA COM SUCESSO!")
        print(f"{'='*60}\n")
        
        return output_path

def main():
    exporter = MongoDBExporter()
    
    if USE_ASYNC:
        asyncio.run(exporter.export_async())
    else:
        exporter.export_sync()

if __name__ == '__main__':
    main()
