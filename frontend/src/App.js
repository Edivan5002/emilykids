import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';
import '@/index.css';

// Pages
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Fornecedores from './pages/Fornecedores';
import Marcas from './pages/Marcas';
import Categorias from './pages/Categorias';
import Subcategorias from './pages/Subcategorias';
import Produtos from './pages/Produtos';
import Estoque from './pages/Estoque';
import NotasFiscais from './pages/NotasFiscais';
import Orcamentos from './pages/Orcamentos';
import Vendas from './pages/Vendas';
import Relatorios from './pages/Relatorios';
import IAInsights from './pages/IAInsights';
import Logs from './pages/Logs';
import Usuarios from './pages/Usuarios';

// Layout
import Layout from './components/Layout';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

function AppContent() {
  return (
    <div className="App">
      <Toaster richColors position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/fornecedores" element={<Fornecedores />} />
                    <Route path="/marcas" element={<Marcas />} />
                    <Route path="/categorias" element={<Categorias />} />
                    <Route path="/subcategorias" element={<Subcategorias />} />
                    <Route path="/produtos" element={<Produtos />} />
                    <Route path="/estoque" element={<Estoque />} />
                    <Route path="/notas-fiscais" element={<NotasFiscais />} />
                    <Route path="/orcamentos" element={<Orcamentos />} />
                    <Route path="/vendas" element={<Vendas />} />
                    <Route path="/relatorios" element={<Relatorios />} />
                    <Route path="/ia-insights" element={<IAInsights />} />
                    <Route path="/logs" element={<Logs />} />
                    <Route path="/usuarios" element={<Usuarios />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;