import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Estoque = () => {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [alertas, setAlertas] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [movRes, alertRes] = await Promise.all([
        axios.get(`${API}/estoque/movimentacoes`),
        axios.get(`${API}/estoque/alertas`)
      ]);
      setMovimentacoes(movRes.data);
      setAlertas(alertRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    }
  };

  return (
    <div className="page-container" data-testid="estoque-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Controle de Estoque</h1>
        <p className="text-gray-600">Movimentações e alertas de estoque</p>
      </div>

      {alertas && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle size={20} />
                Estoque Mínimo ({alertas.alertas_minimo.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alertas.alertas_minimo.slice(0, 5).map(p => (
                  <div key={p.id} className="p-3 bg-red-50 rounded-lg">
                    <p className="font-medium">{p.nome}</p>
                    <p className="text-sm text-gray-600">Estoque atual: {p.estoque_atual} | Mínimo: {p.estoque_minimo}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <TrendingUp size={20} />
                Estoque Máximo ({alertas.alertas_maximo.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alertas.alertas_maximo.slice(0, 5).map(p => (
                  <div key={p.id} className="p-3 bg-yellow-50 rounded-lg">
                    <p className="font-medium">{p.nome}</p>
                    <p className="text-sm text-gray-600">Estoque atual: {p.estoque_atual} | Máximo: {p.estoque_maximo}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Movimentações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {movimentacoes.slice(0, 20).map(mov => (
              <div key={mov.id} className="flex items-center gap-4 p-3 border rounded-lg">
                {mov.tipo === 'entrada' ? (
                  <TrendingUp className="text-green-500" size={20} />
                ) : (
                  <TrendingDown className="text-red-500" size={20} />
                )}
                <div className="flex-1">
                  <p className="font-medium">{mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}</p>
                  <p className="text-sm text-gray-600">Quantidade: {mov.quantidade} | Ref: {mov.referencia_tipo}</p>
                </div>
                <p className="text-sm text-gray-500">{new Date(mov.timestamp).toLocaleString('pt-BR')}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Estoque;