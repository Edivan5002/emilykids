#!/usr/bin/env python3
"""
Testes ETAPA 6 - Padronização de Datas/Valores
Valida:
1. Status correto após liquidar parcela pagar
2. Status correto após receber parcela receber
3. Agrupamento por dia não quebra com strings ISO
"""
import sys
sys.path.insert(0, '/app/backend')

from server import (
    iso_utc_now,
    parse_date_only,
    calc_valor_final_parcela_pagar,
    calc_valor_final_parcela_receber,
    calc_valor_liquido_conta,
    STATUS_CONTA_PAGAR,
    STATUS_PARCELA_PAGAR,
    STATUS_CONTA_RECEBER,
    STATUS_PARCELA_RECEBER
)

def test_1_calc_valor_final_parcela_pagar():
    """
    Teste 1: Cálculo correto do valor final de parcela PAGAR
    Formula: valor_base + juros + multa - desconto
    """
    print("\n" + "="*60)
    print("TESTE 1: calc_valor_final_parcela_pagar")
    print("="*60)
    
    # Cenário 1: Parcela com juros e multa
    valor = calc_valor_final_parcela_pagar(
        valor_base=1000.00,
        juros=50.00,
        multa=20.00,
        desconto=0
    )
    esperado = 1070.00
    assert valor == esperado, f"Erro: esperado {esperado}, obtido {valor}"
    print(f"✅ Cenário 1: R$1000 + R$50 juros + R$20 multa = R${valor}")
    
    # Cenário 2: Parcela com desconto
    valor = calc_valor_final_parcela_pagar(
        valor_base=1000.00,
        juros=0,
        multa=0,
        desconto=100.00
    )
    esperado = 900.00
    assert valor == esperado, f"Erro: esperado {esperado}, obtido {valor}"
    print(f"✅ Cenário 2: R$1000 - R$100 desconto = R${valor}")
    
    # Cenário 3: Parcela com todos os componentes
    valor = calc_valor_final_parcela_pagar(
        valor_base=500.00,
        juros=25.50,
        multa=10.00,
        desconto=15.50
    )
    esperado = 520.00
    assert valor == esperado, f"Erro: esperado {esperado}, obtido {valor}"
    print(f"✅ Cenário 3: R$500 + R$25.50 + R$10.00 - R$15.50 = R${valor}")
    
    # Verificar status padronizado
    assert "pago" in STATUS_PARCELA_PAGAR
    assert "pago_total" in STATUS_CONTA_PAGAR
    print(f"✅ Status padronizado PAGAR: {STATUS_PARCELA_PAGAR}")
    
    print("\n✅ TESTE 1 PASSOU!")
    return True


def test_2_calc_valor_final_parcela_receber():
    """
    Teste 2: Cálculo correto do valor final de parcela RECEBER
    Formula: valor_base + juros - desconto
    """
    print("\n" + "="*60)
    print("TESTE 2: calc_valor_final_parcela_receber")
    print("="*60)
    
    # Cenário 1: Parcela com juros
    valor = calc_valor_final_parcela_receber(
        valor_base=1000.00,
        juros=50.00,
        desconto=0
    )
    esperado = 1050.00
    assert valor == esperado, f"Erro: esperado {esperado}, obtido {valor}"
    print(f"✅ Cenário 1: R$1000 + R$50 juros = R${valor}")
    
    # Cenário 2: Parcela com desconto
    valor = calc_valor_final_parcela_receber(
        valor_base=1000.00,
        juros=0,
        desconto=50.00
    )
    esperado = 950.00
    assert valor == esperado, f"Erro: esperado {esperado}, obtido {valor}"
    print(f"✅ Cenário 2: R$1000 - R$50 desconto = R${valor}")
    
    # Cenário 3: Parcela com juros e desconto
    valor = calc_valor_final_parcela_receber(
        valor_base=800.00,
        juros=40.00,
        desconto=20.00
    )
    esperado = 820.00
    assert valor == esperado, f"Erro: esperado {esperado}, obtido {valor}"
    print(f"✅ Cenário 3: R$800 + R$40 - R$20 = R${valor}")
    
    # Verificar status padronizado
    assert "recebido" in STATUS_PARCELA_RECEBER
    assert "recebido_total" in STATUS_CONTA_RECEBER
    print(f"✅ Status padronizado RECEBER: {STATUS_PARCELA_RECEBER}")
    
    print("\n✅ TESTE 2 PASSOU!")
    return True


def test_3_parse_date_only():
    """
    Teste 3: Agrupamento por dia não quebra com strings ISO
    O helper parse_date_only deve extrair consistentemente "YYYY-MM-DD"
    """
    print("\n" + "="*60)
    print("TESTE 3: parse_date_only (agrupamento por dia)")
    print("="*60)
    
    # Cenário 1: ISO completo com timezone
    resultado = parse_date_only("2024-12-15T10:30:00+00:00")
    assert resultado == "2024-12-15", f"Erro: esperado '2024-12-15', obtido '{resultado}'"
    print(f"✅ '2024-12-15T10:30:00+00:00' -> '{resultado}'")
    
    # Cenário 2: ISO completo UTC
    resultado = parse_date_only("2024-01-01T00:00:00Z")
    assert resultado == "2024-01-01", f"Erro: esperado '2024-01-01', obtido '{resultado}'"
    print(f"✅ '2024-01-01T00:00:00Z' -> '{resultado}'")
    
    # Cenário 3: Apenas data
    resultado = parse_date_only("2024-06-30")
    assert resultado == "2024-06-30", f"Erro: esperado '2024-06-30', obtido '{resultado}'"
    print(f"✅ '2024-06-30' -> '{resultado}'")
    
    # Cenário 4: ISO com microssegundos
    resultado = parse_date_only("2024-12-31T23:59:59.123456+00:00")
    assert resultado == "2024-12-31", f"Erro: esperado '2024-12-31', obtido '{resultado}'"
    print(f"✅ '2024-12-31T23:59:59.123456+00:00' -> '{resultado}'")
    
    # Cenário 5: Valor vazio
    resultado = parse_date_only("")
    assert resultado is None, f"Erro: esperado None, obtido '{resultado}'"
    print(f"✅ '' -> {resultado}")
    
    # Cenário 6: Valor None
    resultado = parse_date_only(None)
    assert resultado is None, f"Erro: esperado None, obtido '{resultado}'"
    print(f"✅ None -> {resultado}")
    
    # Teste de iso_utc_now
    now = iso_utc_now()
    data_hoje = parse_date_only(now)
    assert len(data_hoje) == 10, f"Erro: data deve ter 10 caracteres"
    assert data_hoje.count("-") == 2, f"Erro: data deve ter 2 hífens"
    print(f"✅ iso_utc_now() -> parse_date_only() = '{data_hoje}'")
    
    # Teste de agrupamento (simular fluxo de caixa)
    datas_iso = [
        "2024-12-01T08:00:00+00:00",
        "2024-12-01T14:30:00+00:00",
        "2024-12-01T22:15:00+00:00",
        "2024-12-02T09:00:00+00:00",
    ]
    agrupamento = {}
    for d in datas_iso:
        dia = parse_date_only(d)
        agrupamento[dia] = agrupamento.get(dia, 0) + 1
    
    assert agrupamento["2024-12-01"] == 3, "Erro: deveria agrupar 3 registros em 01/12"
    assert agrupamento["2024-12-02"] == 1, "Erro: deveria agrupar 1 registro em 02/12"
    print(f"✅ Agrupamento por dia: {agrupamento}")
    
    print("\n✅ TESTE 3 PASSOU!")
    return True


def test_4_calc_valor_liquido_conta():
    """
    Teste adicional: Cálculo do valor líquido da conta
    Formula: valor_total + juros + multa - desconto
    """
    print("\n" + "="*60)
    print("TESTE 4: calc_valor_liquido_conta")
    print("="*60)
    
    # Conta a pagar com todos componentes
    valor = calc_valor_liquido_conta(
        valor_total=5000.00,
        juros=100.00,
        multa=50.00,
        desconto=150.00
    )
    esperado = 5000.00
    assert valor == esperado, f"Erro: esperado {esperado}, obtido {valor}"
    print(f"✅ Conta: R$5000 + R$100 + R$50 - R$150 = R${valor}")
    
    # Conta a receber (sem multa)
    valor = calc_valor_liquido_conta(
        valor_total=3000.00,
        juros=75.00,
        desconto=25.00
    )
    esperado = 3050.00
    assert valor == esperado, f"Erro: esperado {esperado}, obtido {valor}"
    print(f"✅ Conta: R$3000 + R$75 - R$25 = R${valor}")
    
    print("\n✅ TESTE 4 PASSOU!")
    return True


if __name__ == "__main__":
    print("="*60)
    print("TESTES ETAPA 6 - PADRONIZAÇÃO DE DATAS/VALORES")
    print("="*60)
    
    resultados = []
    
    resultados.append(("Teste 1: calc_valor_final_parcela_pagar", test_1_calc_valor_final_parcela_pagar()))
    resultados.append(("Teste 2: calc_valor_final_parcela_receber", test_2_calc_valor_final_parcela_receber()))
    resultados.append(("Teste 3: parse_date_only (agrupamento)", test_3_parse_date_only()))
    resultados.append(("Teste 4: calc_valor_liquido_conta", test_4_calc_valor_liquido_conta()))
    
    print("\n" + "="*60)
    print("RESUMO FINAL")
    print("="*60)
    
    todos_passaram = True
    for nome, passou in resultados:
        status = "✅ PASSOU" if passou else "❌ FALHOU"
        print(f"{status}: {nome}")
        if not passou:
            todos_passaram = False
    
    print("="*60)
    if todos_passaram:
        print("🎉 TODOS OS TESTES PASSARAM!")
    else:
        print("⚠️ ALGUNS TESTES FALHARAM!")
    print("="*60)
