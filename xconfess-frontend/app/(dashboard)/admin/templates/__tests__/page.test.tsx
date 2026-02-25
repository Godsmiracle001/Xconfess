import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TemplatesPage from '../page';
import { adminApi } from '@/app/lib/api/admin';

// Mock adminApi
jest.mock('@/app/lib/api/admin', () => ({
    adminApi: {
        getTemplates: jest.fn(),
        updateTemplateState: jest.fn(),
        toggleTemplateKillSwitch: jest.fn(),
    },
}));

const mockTemplates = {
    welcome: {
        activeVersion: 'v1',
        versions: {
            v1: {
                version: 'v1',
                subject: 'Welcome!',
                lifecycleState: 'active',
            },
            v2: {
                version: 'v2',
                subject: 'New Welcome!',
                lifecycleState: 'canary',
            },
        },
        rollout: {
            canaryVersion: 'v2',
            canaryWeight: 10,
            killSwitchEnabled: false,
        },
    },
};

describe('TemplatesPage', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });
        (adminApi.getTemplates as jest.Mock).mockResolvedValue(mockTemplates);
    });

    const renderPage = () =>
        render(
            <QueryClientProvider client={queryClient}>
                <TemplatesPage />
            </QueryClientProvider>
        );

    it('renders template list and versions', async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText(/WELCOME/i)).toBeInTheDocument();
            expect(screen.getByText('v1')).toBeInTheDocument();
            expect(screen.getByText('v2')).toBeInTheDocument();
        });

        expect(screen.getByText('Welcome!')).toBeInTheDocument();
    });

    it('toggles kill-switch', async () => {
        (adminApi.toggleTemplateKillSwitch as jest.Mock).mockResolvedValue({ success: true });
        renderPage();

        await waitFor(() => screen.getByTestId('kill-switch-welcome'));

        const killSwitch = screen.getByTestId('kill-switch-welcome');
        fireEvent.click(killSwitch);

        expect(adminApi.toggleTemplateKillSwitch).toHaveBeenCalledWith('welcome', true);
    });

    it('changes template version state', async () => {
        (adminApi.updateTemplateState as jest.Mock).mockResolvedValue({ success: true });
        renderPage();

        await waitFor(() => screen.getByTestId('state-select-welcome-v2'));

        const select = screen.getByTestId('state-select-welcome-v2');
        fireEvent.change(select, { target: { value: 'active' } });

        expect(adminApi.updateTemplateState).toHaveBeenCalledWith('welcome', 'v2', 'active');
    });
});
