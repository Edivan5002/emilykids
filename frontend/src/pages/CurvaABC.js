import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { TrendingUp, RefreshCw, Package, DollarSign, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CORES = {
  A: '#22c55e',
  B: '#f59e0b', 
  C: '#ef4444',
  null: '#94a3b8'
};

const CurvaABC = () => {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState(false);

  useEffect(() => {
    fetchCurvaABC();
  }, []);

  const fetchCurvaABC = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/produtos/curva-abc`);
      setDados(response.data.curvas || {});
    } catch (error) {
      console.error('Erro ao carregar curva ABC:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const recalcular = async () => {
    setCalculando(true);
    try {
      const response = await axios.post(`${API}/produtos/calcular-curva-abc?periodo_meses=12`);
      toast.success(response.data.message);
      fetchCurvaABC();
    } catch (error) {
      toast.error('Erro ao recalcular');
    } finally {
      setCalculando(false);
    }
  };

  const pieData = dados ? Object.entries(dados).map(([curva, info]) => ({
    name: curva === 'null' ? 'Sem classificação' : `Curva ${curva}`,
    value: info.count || 0,
    faturamento: info.faturamento || 0,
    curva
  })).filter(d => d.value > 0) : [];

  const totalProdutos = pieData.reduce((sum, d) => sum + d.value, 0);
  const totalFaturamento = pieData.reduce((sum, d) => sum + d.faturamento, 0);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="text-blue-600" />
          Curva ABC de Produtos
        </h1>
        <Button onClick={recalcular} disabled={calculando}>
          <RefreshCw className={`w-4 h-4 mr-2 ${calculando ? 'animate-spin' : ''}`} />
          {calculando ? 'Calculando...' : 'Recalcular ABC'}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {['A', 'B', 'C'].map(curva => (
          <Card key={curva}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: CORES[curva] }}>
                  {curva}
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    {curva === 'A' ? '80% faturamento' : curva === 'B' ? '15% faturamento' : '5% faturamento'}
                  </p>
                  <p className="text-xl font-bold">{dados?.[curva]?.count || 0} produtos</p>
                  <p className="text-sm text-gray-500">
                    R$ {((dados?.[curva]?.faturamento || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="text-gray-500" size={40} />
              <div>
                <p className="text-sm text-gray-600">Total Produtos</p>
                <p className="text-xl font-bold">{totalProdutos}</p>
                <p className="text-sm text-gray-500">
                  R$ {totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Quantidade</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">Carregando...</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.curva} fill={CORES[entry.curva]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Faturamento por Curva</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pieData.filter(d => d.curva !== 'null')}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                <Legend />
                <Bar dataKey="faturamento" name="Faturamento" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Produtos por Curva */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {['A', 'B', 'C'].map(curva => (
          <Card key={curva}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm" style={{ backgroundColor: CORES[curva] }}>
                  {curva}
                </div>
                Curva {curva} ({dados?.[curva]?.count || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {dados?.[curva]?.produtos?.slice(0, 10).map((p, i) => (
                  <div key={i} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                    <span className="truncate flex-1">{p.nome}</span>
                    <span className="text-gray-600 ml-2 whitespace-nowrap">
                      R$ {(p.faturamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )) || <p className="text-gray-500 text-sm">Nenhum produto</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Legenda */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2">O que é a Curva ABC?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full mt-0.5" style={{ backgroundColor: CORES.A }} />
              <div>
                <strong>Curva A:</strong> Produtos que representam 80% do faturamento. São os mais importantes e devem ter estoque prioritário.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full mt-0.5" style={{ backgroundColor: CORES.B }} />
              <div>
                <strong>Curva B:</strong> Produtos que representam 15% do faturamento. Importância intermediária.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full mt-0.5" style={{ backgroundColor: CORES.C }} />
              <div>
                <strong>Curva C:</strong> Produtos que representam 5% do faturamento. Menor giro, avaliar necessidade de manter em estoque.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CurvaABC;
