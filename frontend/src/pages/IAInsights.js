import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, TrendingUp, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const IAInsights = () => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);

  return (
    <div className="page-container" data-testid="ia-insights-page">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-500 rounded-xl">
            <Brain className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">IA Insights</h1>
            <p className="text-gray-600">Inteligência artificial para seu negócio</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} />
              Previsão de Demanda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Análise de vendas com IA para prever demanda futura de produtos</p>
            <Button className="w-full" disabled>
              Em desenvolvimento
            </Button>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart size={20} />
              Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Sugestões inteligentes de produtos para clientes baseadas no histórico</p>
            <Button className="w-full" disabled>
              Em desenvolvimento
            </Button>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain size={20} />
              Análise Preditiva
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Insights automáticos sobre padrões de vendas e estoque</p>
            <Button className="w-full" disabled>
              Em desenvolvimento
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Brain size={48} className="mx-auto mb-4 text-purple-500" />
            <h3 className="text-2xl font-bold mb-2">Inteligência Artificial Integrada</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Este módulo utiliza GPT-4 para fornecer insights inteligentes sobre seu negócio,
              incluindo previsão de demanda, recomendações de produtos e análises preditivas.
              As funcionalidades estarão disponíveis em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IAInsights;