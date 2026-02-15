import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUiStore } from '../stores/uiStore';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { experimentId } = useParams();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  useEffect(() => {
    const handler = (e) => {
      // Don't trigger when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      // Toggle sidebar: Cmd/Ctrl + B
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Navigate home: Cmd/Ctrl + H (only if not experiment context)
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        navigate('/');
        return;
      }

      // Quick nav within experiment (number keys)
      if (experimentId && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const routes = {
          '1': '',
          '2': '/programs',
          '3': '/genealogy',
          '4': '/islands',
          '5': '/conversations',
          '6': '/metrics',
          '7': '/embedding',
          '8': '/meta',
        };
        if (routes[e.key] !== undefined) {
          navigate(`/experiment/${experimentId}${routes[e.key]}`);
          return;
        }
      }

      // Press ? to show help
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        // Just a placeholder — could show a modal
        return;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [experimentId, navigate, toggleSidebar]);
}
