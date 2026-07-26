import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRouter from './routes/AppRouter';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const hissobTheme = {
  token: {
    colorPrimary: '#F97316',
    colorBgContainer: '#FFFFFF',
    colorTextBase: '#0B2347',
    colorBorder: '#E4E8F0',
    borderRadius: 10,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    colorSuccess: '#22C55E',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
    colorInfo: '#1E5AA8',
    boxShadow: '0 2px 8px rgba(11,35,71,0.06)',
  },
  algorithm: theme.defaultAlgorithm,
};

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <ConfigProvider theme={hissobTheme}>
      <AntApp>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </QueryClientProvider>
);

export default App;
