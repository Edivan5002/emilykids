#!/usr/bin/env python3
"""
============================================================
SCRIPT DE ADAPTAÇÃO DO MÓDULO IA PARA AMBIENTE LOCAL
Projeto: ERP Emily Kids / InventoAI
============================================================
Este script adapta o código do módulo de IA para funcionar
localmente usando a API da OpenAI diretamente, removendo
a dependência do emergentintegrations.
============================================================
"""

import os
import re
import shutil
from datetime import datetime

def main():
    print("""
============================================================
   ADAPTAÇÃO DO MÓDULO IA PARA AMBIENTE LOCAL
============================================================

Este script irá:
1. Criar backup do server.py original
2. Substituir imports do emergentintegrations pelo OpenAI
3. Adicionar função auxiliar chat_completion
4. Atualizar todas as chamadas de IA

============================================================
""")

    # Verificar se está na pasta correta
    server_path = "backend/server.py"
    if not os.path.exists(server_path):
        server_path = "../backend/server.py"
        if not os.path.exists(server_path):
            server_path = input("Digite o caminho para o arquivo server.py: ").strip()
            if not os.path.exists(server_path):
                print("❌ Arquivo não encontrado!")
                return

    # Perguntar ao usuário
    print("⚠️  Este script irá modificar o arquivo server.py")
    confirm = input("\n👉 Deseja continuar? (s/n): ").strip().lower()
    
    if confirm != 's':
        print("\n❌ Operação cancelada.\n")
        return

    # Criar backup
    backup_path = server_path + f".backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(server_path, backup_path)
    print(f"\n✅ Backup criado: {backup_path}")

    # Ler arquivo
    with open(server_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # 1. Substituir import
    old_import = "from emergentintegrations.llm.chat import LlmChat, UserMessage"
    new_import = "from openai import AsyncOpenAI"
    
    if old_import in content:
        content = content.replace(old_import, new_import)
        print("✅ Import substituído")
    else:
        print("⚠️  Import do emergentintegrations não encontrado (pode já estar alterado)")

    # 2. Adicionar função auxiliar após os imports
    helper_function = '''
# ============================================================
# CLIENTE OPENAI - ADAPTADO PARA USO LOCAL
# ============================================================
_openai_client = None

def get_openai_client():
    """Retorna cliente OpenAI singleton"""
    global _openai_client
    if _openai_client is None:
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY não configurada. Adicione no arquivo .env")
        _openai_client = AsyncOpenAI(api_key=api_key)
    return _openai_client

async def chat_completion(system_message: str, user_prompt: str, model: str = "gpt-4") -> str:
    """
    Função auxiliar para chamadas ao GPT.
    
    Args:
        system_message: Mensagem de sistema (define o comportamento do assistente)
        user_prompt: Prompt do usuário
        model: Modelo a usar (gpt-4, gpt-3.5-turbo, etc.)
    
    Returns:
        Resposta do modelo como string
    """
    try:
        client = get_openai_client()
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=2000,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Erro na análise de IA: {str(e)}. Verifique sua chave OPENAI_API_KEY."
# ============================================================
'''

    # Encontrar onde inserir (após os imports, antes do primeiro uso de funções)
    # Procurar por "# Configurações" ou similar
    insert_markers = [
        "# Configurações",
        "# Configuração",
        "# Config",
        "load_dotenv()",
        "MONGO_URL"
    ]
    
    inserted = False
    for marker in insert_markers:
        if marker in content and "chat_completion" not in content:
            # Inserir após o marcador
            pos = content.find(marker)
            # Encontrar final da linha
            end_of_line = content.find("\n", pos)
            if end_of_line != -1:
                content = content[:end_of_line+1] + helper_function + content[end_of_line+1:]
                inserted = True
                print(f"✅ Função chat_completion adicionada (após '{marker}')")
                break
    
    if not inserted and "chat_completion" not in content:
        # Inserir após os imports
        import_end = content.find("\n\n", content.find("import"))
        if import_end != -1:
            content = content[:import_end] + helper_function + content[import_end:]
            print("✅ Função chat_completion adicionada")
        else:
            print("⚠️  Não foi possível inserir a função auxiliar automaticamente")
            print("   Por favor, adicione manualmente conforme o guia.")

    # 3. Substituir chamadas do LlmChat
    # Padrão para encontrar blocos de código que usam LlmChat
    
    # Padrão 1: api_key = os.environ.get('EMERGENT_LLM_KEY')
    pattern1 = r"api_key = os\.environ\.get\(['\"]EMERGENT_LLM_KEY['\"]\)"
    content = re.sub(pattern1, "# API key carregada automaticamente pela função chat_completion", content)
    
    # Padrão 2: Bloco completo do LlmChat até send_message
    # Este é mais complexo, vamos fazer substituições específicas
    
    # Substituir padrão de criação do chat
    llm_pattern = r'''chat = LlmChat\(
            api_key=api_key,
            session_id=f"[^"]+",
            system_message="([^"]+)"
        \)\.with_model\("openai", "([^"]+)"\)'''
    
    # Encontrar todas as ocorrências
    matches = list(re.finditer(llm_pattern, content))
    
    for match in reversed(matches):  # Reverso para não atrapalhar as posições
        system_msg = match.group(1)
        model = match.group(2)
        
        # Nova forma
        new_code = f'system_message = "{system_msg}"'
        content = content[:match.start()] + new_code + content[match.end():]
    
    if matches:
        print(f"✅ {len(matches)} blocos LlmChat substituídos")

    # Substituir message = UserMessage(text=prompt) e response = await chat.send_message(message)
    pattern_user_message = r"message = UserMessage\(text=prompt\)\s*\n\s*response = await chat\.send_message\(message\)"
    replacement_send = "response = await chat_completion(system_message, prompt, \"gpt-4\")"
    
    content, count = re.subn(pattern_user_message, replacement_send, content)
    if count > 0:
        print(f"✅ {count} chamadas send_message substituídas")

    # Também verificar variações
    pattern_variation = r"message = UserMessage\(text=prompt\)"
    if pattern_variation in content and "chat_completion" in content:
        # Já foi parcialmente convertido, limpar
        content = content.replace(pattern_variation, "# Prompt já definido acima")
    
    # Limpar linhas de resposta antigas
    content = content.replace("response = await chat.send_message(message)", "")
    
    # Verificar se algo mudou
    if content == original_content:
        print("\n⚠️  Nenhuma alteração foi necessária (código pode já estar adaptado)")
    else:
        # Salvar arquivo
        with open(server_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✅ Arquivo {server_path} atualizado!")

    # 4. Atualizar requirements.txt
    req_path = os.path.join(os.path.dirname(server_path), "requirements.txt")
    if os.path.exists(req_path):
        with open(req_path, 'r', encoding='utf-8') as f:
            requirements = f.read()
        
        if "openai" not in requirements:
            with open(req_path, 'a', encoding='utf-8') as f:
                f.write("\n# OpenAI para módulo de IA local\nopenai>=1.0.0\n")
            print(f"✅ requirements.txt atualizado com openai")
        
        # Comentar emergentintegrations se existir
        if "emergentintegrations" in requirements and "# emergentintegrations" not in requirements:
            requirements = requirements.replace(
                "emergentintegrations", 
                "# emergentintegrations  # Comentado para uso local"
            )
            with open(req_path, 'w', encoding='utf-8') as f:
                f.write(requirements)
            print("✅ emergentintegrations comentado no requirements.txt")

    # 5. Verificar/criar .env
    env_path = os.path.join(os.path.dirname(server_path), ".env")
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            env_content = f.read()
        
        if "OPENAI_API_KEY" not in env_content:
            with open(env_path, 'a', encoding='utf-8') as f:
                f.write("\n# Chave da API OpenAI (obtenha em https://platform.openai.com/api-keys)\nOPENAI_API_KEY=sk-sua-chave-aqui\n")
            print("✅ OPENAI_API_KEY adicionada ao .env (substitua pela sua chave real!)")
    else:
        print(f"⚠️  Arquivo .env não encontrado em {env_path}")
        print("   Crie o arquivo e adicione: OPENAI_API_KEY=sua-chave-aqui")

    print(f"""
============================================================
   ADAPTAÇÃO CONCLUÍDA!
============================================================

📋 Próximos passos:

1. Obtenha uma chave da API OpenAI:
   https://platform.openai.com/api-keys

2. Edite o arquivo backend/.env e substitua:
   OPENAI_API_KEY=sk-sua-chave-real-aqui

3. Instale a biblioteca OpenAI:
   cd backend
   pip install openai

4. Reinicie o servidor:
   python -m uvicorn server:app --reload --port 8001

5. Teste o módulo de IA no sistema

⚠️  IMPORTANTE: O backup do arquivo original está em:
   {backup_path}

   Se algo der errado, restaure com:
   cp {backup_path} {server_path}

============================================================
""")

if __name__ == "__main__":
    main()
