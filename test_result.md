#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Implementar validação de estoque completa em Orçamentos e Vendas. O sistema deve verificar se a quantidade digitada tem em estoque antes de adicionar o item, considerando o estoque reservado por orçamentos abertos. Se não tiver estoque suficiente, o sistema deve avisar e não deixar adicionar o item."

backend:
  - task: "Endpoint de verificação de estoque (POST /api/estoque/check-disponibilidade)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Criado endpoint que recebe produto_id e quantidade, calcula estoque disponível (atual - reservado) e retorna se está disponível para uso"
  
  - task: "Validação de estoque na criação de orçamentos (POST /api/orcamentos)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Adicionada validação que verifica estoque disponível antes de criar orçamento. Se insuficiente, retorna erro 400 com mensagem detalhada"
  
  - task: "Validação de estoque na criação de vendas (POST /api/vendas)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Adicionada validação que verifica estoque disponível antes de criar venda. Se insuficiente, retorna erro 400 com mensagem detalhada"

frontend:
  - task: "Validação de estoque ao adicionar item em Orçamento"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/Orcamentos.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Atualizada função handleAddItem para chamar endpoint de verificação de estoque antes de adicionar item. Mostra mensagem de erro detalhada se estoque insuficiente"

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Endpoint de verificação de estoque (POST /api/estoque/check-disponibilidade)"
    - "Validação de estoque na criação de orçamentos (POST /api/orcamentos)"
    - "Validação de estoque na criação de vendas (POST /api/vendas)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Implementei a validação completa de estoque para Orçamentos e Vendas. Criei um endpoint /api/estoque/check-disponibilidade que calcula o estoque disponível (estoque_atual - estoque_reservado) e retorna se a quantidade solicitada está disponível. Atualizei os endpoints de criação de orçamentos e vendas para validar o estoque antes de criar, retornando erro 400 se insuficiente. No frontend, atualizei o módulo de Orçamentos para chamar o endpoint de verificação antes de adicionar itens. Preciso que você teste: 1) O endpoint de verificação de estoque com diferentes cenários (estoque suficiente, insuficiente, com reservas); 2) Criação de orçamento com estoque suficiente e insuficiente; 3) Criação de venda com estoque suficiente e insuficiente. Use os dados de teste existentes no sistema."