import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary';
import AppRouter from './routes/AppRouter';
import { useThemeStore } from './store/themeStore';
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

const App: React.FC = () => {
  const { effectiveTheme, initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const isDark = effectiveTheme === 'dark';

  const antThemeConfig = {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#F97316',
      colorBgContainer: isDark ? '#152035' : '#FFFFFF',
      colorBgLayout: isDark ? '#0D1520' : '#F8F9FC',
      colorTextBase: isDark ? '#E8EEF8' : '#0B2347',
      colorTextSecondary: isDark ? '#8097BB' : '#6B7A9A',
      colorBorder: isDark ? '#1E3050' : '#E4E8F0',
      colorBorderSecondary: isDark ? '#1E3050' : '#F0F4F8',
      borderRadius: 10,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: 14,
      colorSuccess: '#22C55E',
      colorWarning: '#F59E0B',
      colorError: '#EF4444',
      colorInfo: '#1E5AA8',
      boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.35)' : '0 2px 8px rgba(11,35,71,0.06)',
    },
    components: {
      Card: {
        colorBgContainer: isDark ? '#152035' : '#FFFFFF',
        colorBorderSecondary: isDark ? '#1E3050' : '#E4E8F0',
      },
      Table: {
        colorBgContainer: isDark ? '#152035' : '#FFFFFF',
        headerBg: isDark ? '#1A2842' : '#F8FAFC',
        headerColor: isDark ? '#E8EEF8' : '#0B2347',
        rowHoverBg: isDark ? '#1E3050' : '#F8FAFC',
      },
      Modal: {
        contentBg: isDark ? '#152035' : '#FFFFFF',
        headerBg: isDark ? '#152035' : '#FFFFFF',
      },
      Drawer: {
        colorBgContainer: isDark ? '#152035' : '#FFFFFF',
      },
      Select: {
        colorBgContainer: isDark ? '#1A2842' : '#FFFFFF',
      },
      Input: {
        colorBgContainer: isDark ? '#1A2842' : '#FFFFFF',
      },
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antThemeConfig}>
        <AntApp>
          <BrowserRouter>
            <ErrorBoundary>
              <AppRouter />
            </ErrorBoundary>
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
