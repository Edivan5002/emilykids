#!/usr/bin/env python3
"""
============================================================
SCRIPT DE IMPORTAÇÃO COMPLETA DO BANCO DE DADOS MONGODB
Projeto: ERP Emily Kids / InventoAI
============================================================
Este script importa:
- Todas as collections (tabelas)
- Todos os documentos (dados)
- Todos os índices
- Estrutura completa do banco

Opções:
- Substituir todos os dados existentes
- Manter dados existentes e adicionar novos
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
INPUT_FILE = 'inventoai_db_backup.json'

def get_user_choice():
    """Pergunta ao usuário o que fazer com dados existentes"""
    print(f"\n{'='*60}")
    print("   IMPORTAÇÃO DO BANCO DE DADOS MONGODB")
    print(f"{'='*60}")
    print(f"\n📦 Banco de dados destino: {DB_NAME}")
    print(f"🔗 Conexão: {MONGO_URL}")
    print(f"\n{'='*60}")
    print("\n⚠️  ATENÇÃO: Este processo irá modificar o banco de dados!\n")
    print("Escolha uma opção:\n")
    print("  [1] 🔄 SUBSTITUIR TUDO")
    print("      Remove TODOS os dados existentes e importa o backup")
    print("      (Recomendado para primeira instalação ou reset completo)\n")
    print("  [2] ➕ MANTER E ADICIONAR")
    print("      Mantém dados existentes e adiciona apenas documentos novos")
    print("      (Útil para atualizar estrutura sem perder dados)\n")
    print("  [3] ❌ CANCELAR")
    print("      Sair sem fazer alterações\n")
    print("-" * 60)
    
    while True:
        choice = input("\n👉 Digite sua escolha (1, 2 ou 3): ").strip()
        if choice in ['1', '2', '3']:
            return choice
        print("❌ Opção inválida. Digite 1, 2 ou 3.")

def confirm_action(choice):
    """Pede confirmação final"""
    if choice == '1':
        msg = "⚠️  TODOS OS DADOS EXISTENTES SERÃO REMOVIDOS!"
    else:
        msg = "ℹ️  Dados existentes serão mantidos, novos serão adicionados."
    
    print(f"\n{msg}")
    confirm = input("\n🔐 Digite 'SIM' para confirmar: ").strip().upper()
    return confirm == 'SIM'

def deserialize_doc(doc):
    """Deserializa documento JSON para formato MongoDB"""
    return json.loads(json.dumps(doc), object_hook=json_util.object_hook)

class MongoDBImporter:
    def __init__(self, replace_all=False):
        self.replace_all = replace_all
        self.stats = {
            'collections_created': 0,
            'documents_inserted': 0,
            'documents_skipped': 0,
            'indexes_created': 0,
            'errors': []
        }
    
    async def import_async(self, data):
        """Importação assíncrona usando Motor"""
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        collections_data = data.get('collections', {})
        indexes_data = data.get('indexes', {})
        
        print(f"\n📋 {len(collections_data)} collections para importar\n")
        
        for col_name in sorted(collections_data.keys()):
            docs = collections_data[col_name]
            collection = db[col_name]
            
            try:
                if self.replace_all:
                    # Remover todos os documentos existentes
                    result = await collection.delete_many({})
                    print(f"  🗑️  {col_name}: {result.deleted_count} documentos removidos")
                
                # Inserir documentos
                if docs:
                    docs_to_insert = [deserialize_doc(doc) for doc in docs]
                    
                    if self.replace_all:
                        # Inserir todos
                        await collection.insert_many(docs_to_insert)
                        self.stats['documents_inserted'] += len(docs_to_insert)
                        print(f"  ✅ {col_name}: {len(docs_to_insert)} documentos importados")
                    else:
                        # Inserir apenas novos (verificar por _id ou id)
                        inserted = 0
                        skipped = 0
                        for doc in docs_to_insert:
                            doc_id = doc.get('_id') or doc.get('id')
                            if doc_id:
                                existing = await collection.find_one({'$or': [
                                    {'_id': doc_id},
                                    {'id': doc.get('id')}
                                ]})
                                if not existing:
                                    await collection.insert_one(doc)
                                    inserted += 1
                                else:
                                    skipped += 1
                            else:
                                await collection.insert_one(doc)
                                inserted += 1
                        
                        self.stats['documents_inserted'] += inserted
                        self.stats['documents_skipped'] += skipped
                        print(f"  ✅ {col_name}: {inserted} inseridos, {skipped} ignorados (já existem)")
                else:
                    print(f"  📭 {col_name}: collection vazia")
                
                # Criar índices
                if col_name in indexes_data:
                    for idx_name, idx_info in indexes_data[col_name].items():
                        try:
                            keys = idx_info['key']
                            # Converter lista de tuplas para lista de pares
                            if isinstance(keys, list):
                                keys = [(k[0], k[1]) for k in keys]
                            
                            kwargs = {'name': idx_name}
                            if idx_info.get('unique'):
                                kwargs['unique'] = True
                            if idx_info.get('sparse'):
                                kwargs['sparse'] = True
                            if idx_info.get('expireAfterSeconds'):
                                kwargs['expireAfterSeconds'] = idx_info['expireAfterSeconds']
                            
                            await collection.create_index(keys, **kwargs)
                            self.stats['indexes_created'] += 1
                        except Exception as e:
                            if 'already exists' not in str(e).lower():
                                self.stats['errors'].append(f"Índice {idx_name} em {col_name}: {str(e)}")
                
                self.stats['collections_created'] += 1
                
            except Exception as e:
                self.stats['errors'].append(f"Collection {col_name}: {str(e)}")
                print(f"  ❌ {col_name}: ERRO - {str(e)}")
        
        client.close()
    
    def import_sync(self, data):
        """Importação síncrona usando PyMongo"""
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        collections_data = data.get('collections', {})
        indexes_data = data.get('indexes', {})
        
        print(f"\n📋 {len(collections_data)} collections para importar\n")
        
        for col_name in sorted(collections_data.keys()):
            docs = collections_data[col_name]
            collection = db[col_name]
            
            try:
                if self.replace_all:
                    result = collection.delete_many({})
                    print(f"  🗑️  {col_name}: {result.deleted_count} documentos removidos")
                
                if docs:
                    docs_to_insert = [deserialize_doc(doc) for doc in docs]
                    
                    if self.replace_all:
                        collection.insert_many(docs_to_insert)
                        self.stats['documents_inserted'] += len(docs_to_insert)
                        print(f"  ✅ {col_name}: {len(docs_to_insert)} documentos importados")
                    else:
                        inserted = 0
                        skipped = 0
                        for doc in docs_to_insert:
                            doc_id = doc.get('_id') or doc.get('id')
                            if doc_id:
                                existing = collection.find_one({'$or': [
                                    {'_id': doc_id},
                                    {'id': doc.get('id')}
                                ]})
                                if not existing:
                                    collection.insert_one(doc)
                                    inserted += 1
                                else:
                                    skipped += 1
                            else:
                                collection.insert_one(doc)
                                inserted += 1
                        
                        self.stats['documents_inserted'] += inserted
                        self.stats['documents_skipped'] += skipped
                        print(f"  ✅ {col_name}: {inserted} inseridos, {skipped} ignorados")
                else:
                    print(f"  📭 {col_name}: collection vazia")
                
                # Criar índices
                if col_name in indexes_data:
                    for idx_name, idx_info in indexes_data[col_name].items():
                        try:
                            keys = idx_info['key']
                            if isinstance(keys, list):
                                keys = [(k[0], k[1]) for k in keys]
                            
                            kwargs = {'name': idx_name}
                            if idx_info.get('unique'):
                                kwargs['unique'] = True
                            if idx_info.get('sparse'):
                                kwargs['sparse'] = True
                            if idx_info.get('expireAfterSeconds'):
                                kwargs['expireAfterSeconds'] = idx_info['expireAfterSeconds']
                            
                            collection.create_index(keys, **kwargs)
                            self.stats['indexes_created'] += 1
                        except Exception as e:
                            if 'already exists' not in str(e).lower():
                                self.stats['errors'].append(f"Índice {idx_name}: {str(e)}")
                
                self.stats['collections_created'] += 1
                
            except Exception as e:
                self.stats['errors'].append(f"Collection {col_name}: {str(e)}")
                print(f"  ❌ {col_name}: ERRO - {str(e)}")
        
        client.close()
    
    def print_summary(self):
        """Imprime resumo da importação"""
        print(f"\n{'='*60}")
        print("   RESUMO DA IMPORTAÇÃO")
        print(f"{'='*60}\n")
        print(f"  📁 Collections processadas: {self.stats['collections_created']}")
        print(f"  📄 Documentos inseridos: {self.stats['documents_inserted']}")
        if self.stats['documents_skipped']:
            print(f"  ⏭️  Documentos ignorados: {self.stats['documents_skipped']}")
        print(f"  🔑 Índices criados: {self.stats['indexes_created']}")
        
        if self.stats['errors']:
            print(f"\n  ⚠️  Erros encontrados: {len(self.stats['errors'])}")
            for error in self.stats['errors'][:5]:
                print(f"     - {error}")
        else:
            print(f"\n  ✅ IMPORTAÇÃO CONCLUÍDA SEM ERROS!")
        
        print(f"\n{'='*60}\n")

def main():
    # Verificar se arquivo existe
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(script_dir, INPUT_FILE)
    
    if not os.path.exists(input_path):
        print(f"\n❌ ERRO: Arquivo '{INPUT_FILE}' não encontrado!")
        print(f"   Caminho esperado: {input_path}")
        print(f"\n   Execute primeiro o script de exportação:")
        print(f"   python export_database.py\n")
        sys.exit(1)
    
    # Carregar dados
    print(f"\n📂 Carregando arquivo: {INPUT_FILE}")
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Mostrar informações do backup
    metadata = data.get('metadata', {})
    print(f"\n📋 Informações do backup:")
    print(f"   - Banco: {metadata.get('database', 'N/A')}")
    print(f"   - Data exportação: {metadata.get('exported_at', 'N/A')}")
    print(f"   - Collections: {len(data.get('collections', {}))}")
    
    total_docs = sum(len(docs) for docs in data.get('collections', {}).values())
    print(f"   - Total documentos: {total_docs}")
    
    # Perguntar ao usuário
    choice = get_user_choice()
    
    if choice == '3':
        print("\n❌ Operação cancelada pelo usuário.\n")
        sys.exit(0)
    
    if not confirm_action(choice):
        print("\n❌ Operação não confirmada. Saindo.\n")
        sys.exit(0)
    
    # Executar importação
    replace_all = (choice == '1')
    importer = MongoDBImporter(replace_all=replace_all)
    
    print(f"\n🚀 Iniciando importação...")
    
    if USE_ASYNC:
        asyncio.run(importer.import_async(data))
    else:
        importer.import_sync(data)
    
    importer.print_summary()

if __name__ == '__main__':
    main()
