import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Relatorios = () => {
  return (
    <div className="page-container" data-testid="relatorios-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Relatórios</h1>
        <p className="text-gray-600">Relatórios e análises de negócio</p>
      </div>
      <div className="text-center py-20 text-gray-500">
        <p>Módulo de Relatórios Avançados - Em desenvolvimento</p>
        <p className="text-sm mt-2">Geração de relatórios personalizados e exportação</p>
      </div>
    </div>
  );
};

export default Relatorios;