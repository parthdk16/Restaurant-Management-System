import { useTheme } from '../components/theme-provider';
import Swal from 'sweetalert2';
import { useEffect } from 'react';

export const SweetAlertComponent: React.FC = () => {
  const { theme } = useTheme();

  useEffect(() => {
    const sweetAlertOptions: Record<string, unknown> = {
      background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff', 
      color: theme === "dark" ? '#fff' : '#000', 
      confirmButtonText: 'OK', 
      confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9', 
      cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545', 
    };

    Swal.fire(sweetAlertOptions);
  }, [theme]);

  return null;
};