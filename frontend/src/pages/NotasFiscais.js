import React from 'react';

const NotasFiscais = () => {
  return (
    <div className="page-container" data-testid="notas-fiscais-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Notas Fiscais</h1>
        <p className="text-gray-600">Entrada de produtos por nota fiscal</p>
      </div>
      <div className="text-center py-20 text-gray-500">
        <p>Módulo de Notas Fiscais - Em desenvolvimento</p>
        <p className="text-sm mt-2">Cadastre notas fiscais e confirme para atualizar o estoque</p>
      </div>
    </div>
  );
};

export default NotasFiscais;